(() => {
  "use strict";

  const TOKEN_KEY = "pm_google_access_token_v1";
  const TOKEN_EXP_KEY = "pm_google_access_exp_v1";
  const EVENTS_KEY = "pm_calendar_events_v1";
  const SYNCED_AT_KEY = "pm_calendar_synced_at_v1";
  const STRUCTURE_KEYWORDS = ["marquee", "tent", "gazebo", "pagoda"];

  let tokenClient = null;
  let accessToken = "";
  let tokenExpiresAt = 0;
  let events = [];
  let syncedAt = 0;
  let bound = false;
  let selectedEventId = "";
  let calendarFilter = "all"; // all | pmh | pev

  function config() {
    return window.PMH_GOOGLE_CONFIG || { clientId: "", calendarId: "primary", scopes: "" };
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isConfigured() {
    return Boolean(config().clientId && config().clientId.trim());
  }

  function isConnected() {
    return Boolean(accessToken && Date.now() < tokenExpiresAt - 15000);
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function eventBounds(event) {
    const startRaw = event.start?.dateTime || event.start?.date || "";
    const endRaw = event.end?.dateTime || event.end?.date || "";
    if (!startRaw) return null;

    const allDay = Boolean(event.start?.date && !event.start?.dateTime);
    let start;
    let end;

    if (allDay) {
      start = startOfDay(new Date(`${startRaw}T00:00:00`));
      end = endRaw
        ? startOfDay(new Date(`${endRaw}T00:00:00`))
        : addDays(start, 1);
    } else {
      start = new Date(startRaw);
      end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 60 * 60 * 1000);
    }

    return { start, end, allDay };
  }

  function plainText(value) {
    return String(value ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function truncateText(value, max = 120) {
    const text = plainText(value);
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1).trim()}…`;
  }

  function findEvent(id) {
    return events.find((event) => event.id === id) || null;
  }

  function conferenceLink(event) {
    const entryPoints = event.conferenceData?.entryPoints;
    if (Array.isArray(entryPoints)) {
      const video = entryPoints.find((p) => p.entryPointType === "video" && p.uri);
      if (video?.uri) return video.uri;
      const first = entryPoints.find((p) => p.uri);
      if (first?.uri) return first.uri;
    }
    if (event.hangoutLink) return event.hangoutLink;
    return "";
  }

  function attendeeNames(event) {
    if (!Array.isArray(event.attendees) || !event.attendees.length) return [];
    return event.attendees
      .filter((person) => !person.resource)
      .map((person) => person.displayName || person.email || "")
      .filter(Boolean);
  }

  function statusLabel(event) {
    const status = String(event.status || "").toLowerCase();
    if (status === "cancelled") return "Cancelled";
    if (status === "tentative") return "Tentative";
    if (event.transparency === "transparent") return "Free / unavailable";
    return "Confirmed";
  }

  function isStructureJob(event) {
    const haystack = `${event.summary || ""} ${plainText(event.description || "")}`.toLowerCase();
    return STRUCTURE_KEYWORDS.some((word) => haystack.includes(word));
  }

  function isNineMetreJob(event) {
    const haystack = `${event.summary || ""} ${plainText(event.description || "")} ${event.location || ""}`;
    // Match 9m / 9 m / 9-metre / 9 metre / 9.0m etc in booking text.
    return /\b9(?:\.0+)?\s*-?\s*m(?:etre|eter)?s?\b/i.test(haystack);
  }

  function forwardPlanningNoticeHtml(event) {
    if (!isNineMetreJob(event)) return "";
    return `<div class="forward-planning-notice" role="status">FORWARD PLANNING REQUIRED</div>`;
  }

  function eventToneClass(event) {
    return isStructureJob(event) ? "tone-structure" : "tone-other";
  }

  function formatSyncedAt(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDayHeading(date) {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const label = date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    if (sameDay(date, today)) return `Today · ${label}`;
    if (sameDay(date, tomorrow)) return `Tomorrow · ${label}`;
    return label;
  }

  function formatWhen(event) {
    const bounds = eventBounds(event);
    if (!bounds) return "No time";
    if (bounds.allDay) return "All day";
    const start = bounds.start.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const end = bounds.end.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${start}–${end}`;
  }

  function formatFullWhen(event) {
    const bounds = eventBounds(event);
    if (!bounds) return "No time";
    const day = bounds.start.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
    if (bounds.allDay) return `${day} · All day`;
    return `${day} · ${formatWhen(event)}`;
  }

  function sortedUpcomingEvents() {
    const now = Date.now();
    return events
      .map((event) => ({ event, bounds: eventBounds(event) }))
      .filter((row) => row.bounds && row.bounds.end.getTime() >= now - 6 * 60 * 60 * 1000)
      .sort((a, b) => a.bounds.start - b.bounds.start)
      .map((row) => row.event);
  }

  function normalizeEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: raw.id || "",
      summary: raw.summary || "",
      description: raw.description || "",
      location: raw.location || "",
      status: raw.status || "",
      transparency: raw.transparency || "",
      htmlLink: raw.htmlLink || "",
      hangoutLink: raw.hangoutLink || "",
      conferenceData: raw.conferenceData || null,
      organizer: raw.organizer
        ? {
            displayName: raw.organizer.displayName || "",
            email: raw.organizer.email || ""
          }
        : null,
      attendees: Array.isArray(raw.attendees)
        ? raw.attendees.map((person) => ({
            displayName: person.displayName || "",
            email: person.email || "",
            resource: Boolean(person.resource),
            responseStatus: person.responseStatus || ""
          }))
        : [],
      start: raw.start || {},
      end: raw.end || {}
    };
  }

  function loadStoredToken() {
    try {
      accessToken = sessionStorage.getItem(TOKEN_KEY) || "";
      tokenExpiresAt = Number(sessionStorage.getItem(TOKEN_EXP_KEY) || 0);
    } catch {
      accessToken = "";
      tokenExpiresAt = 0;
    }
  }

  function storeToken(token, expiresInSec) {
    accessToken = token || "";
    tokenExpiresAt = accessToken ? Date.now() + (Number(expiresInSec) || 3600) * 1000 : 0;
    try {
      if (accessToken) {
        sessionStorage.setItem(TOKEN_KEY, accessToken);
        sessionStorage.setItem(TOKEN_EXP_KEY, String(tokenExpiresAt));
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_EXP_KEY);
      }
    } catch {
      /* ignore */
    }
  }

  function loadCachedEvents() {
    try {
      const raw = localStorage.getItem(EVENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      events = (Array.isArray(parsed) ? parsed : [])
        .map(normalizeEvent)
        .filter((event) => event && event.id);
      syncedAt = Number(localStorage.getItem(SYNCED_AT_KEY) || 0);
    } catch {
      events = [];
      syncedAt = 0;
    }
  }

  function persistEvents() {
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
      localStorage.setItem(SYNCED_AT_KEY, String(syncedAt));
    } catch {
      /* ignore quota */
    }
  }

  function setStatus(message) {
    const node = el("calendarStatus");
    if (node) node.textContent = message;
  }

  function renderSetupPanel() {
    const setup = el("calendarSetup");
    const actions = el("calendarActions");
    if (!setup || !actions) return;

    if (!isConfigured()) {
      setup.classList.remove("hidden");
      actions.classList.add("hidden");
      setStatus("Google Client ID not set yet — follow the setup steps below.");
      return;
    }

    setup.classList.add("hidden");
    actions.classList.remove("hidden");

    if (isConnected()) {
      const syncNote = syncedAt ? ` Last sync ${formatSyncedAt(syncedAt)}.` : "";
      setStatus(`Connected to Google Calendar.${syncNote}`);
    } else if (events.length) {
      setStatus(`Showing saved schedule (last sync ${formatSyncedAt(syncedAt)}). Connect to refresh.`);
    } else {
      setStatus("Ready to connect your Google account.");
    }
  }

  function renderEventBlock(event) {
    const title = escapeHtml(event.summary || "(No title)");
    const when = escapeHtml(formatWhen(event));
    const location = event.location
      ? `<div class="entry-meta">${escapeHtml(event.location)}</div>`
      : "";
    const preview = event.description
      ? `<div class="entry-meta calendar-desc-preview">${escapeHtml(truncateText(event.description, 140))}</div>`
      : "";
    const selected = selectedEventId && event.id === selectedEventId ? " is-selected" : "";
    const tone = eventToneClass(event);
    const badge = isStructureJob(event) ? "PMH" : "PEV";

    return `
      <article class="calendar-event ${tone}${selected}${isNineMetreJob(event) ? " needs-forward-planning" : ""}" data-event-id="${escapeHtml(event.id)}">
        <div class="calendar-event-top">
          <strong>${title}</strong>
          <span class="calendar-tone-badge">${badge}</span>
        </div>
        <div class="entry-meta">${when}</div>
        ${location}
        ${preview}
        ${forwardPlanningNoticeHtml(event)}
      </article>
    `;
  }

  function renderDetailPanel() {
    const panel = el("calendarDetail");
    if (!panel) return;

    const event = selectedEventId ? findEvent(selectedEventId) : null;
    if (!event) {
      panel.classList.add("hidden");
      panel.innerHTML = "";
      return;
    }

    const description = plainText(event.description);
    const people = attendeeNames(event);
    const meet = conferenceLink(event);
    const organizer = event.organizer?.displayName || event.organizer?.email || "";
    const status = statusLabel(event);
    const cancelled = String(event.status || "").toLowerCase() === "cancelled";
    const tone = eventToneClass(event);

    panel.classList.remove("hidden");
    panel.innerHTML = `
      <div class="calendar-detail-header">
        <h3>Booking details</h3>
        <button type="button" id="calendarDetailClose" class="change-user-link">Close</button>
      </div>
      <article class="calendar-detail-body ${tone}${cancelled ? " is-cancelled" : ""}">
        <strong class="calendar-detail-title">${escapeHtml(event.summary || "(No title)")}</strong>
        <div class="entry-meta">${escapeHtml(formatFullWhen(event))}</div>
        <dl class="calendar-detail-list">
          <div>
            <dt>Status</dt>
            <dd>${escapeHtml(status)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>${isStructureJob(event) ? "PMH" : "PEV"}</dd>
          </div>
          ${
            event.location
              ? `<div><dt>Location</dt><dd>${escapeHtml(event.location)}</dd></div>`
              : ""
          }
          ${
            organizer
              ? `<div><dt>Organiser</dt><dd>${escapeHtml(organizer)}</dd></div>`
              : ""
          }
          ${
            people.length
              ? `<div><dt>Attendees</dt><dd>${escapeHtml(people.join(", "))}</dd></div>`
              : ""
          }
          ${
            description
              ? `<div class="calendar-detail-notes"><dt>Details</dt><dd>${escapeHtml(description).replaceAll("\n", "<br>")}</dd></div>`
              : `<div class="calendar-detail-notes"><dt>Details</dt><dd class="muted">No extra notes on this booking.</dd></div>`
          }
        </dl>
        <div class="calendar-detail-actions">
          ${
            meet
              ? `<a class="button subtle" href="${escapeHtml(meet)}" target="_blank" rel="noopener noreferrer">Open meeting link</a>`
              : ""
          }
          ${
            event.htmlLink
              ? `<a class="button subtle" href="${escapeHtml(event.htmlLink)}" target="_blank" rel="noopener noreferrer">Open in Google Calendar</a>`
              : ""
          }
        </div>
        ${forwardPlanningNoticeHtml(event)}
      </article>
    `;

    el("calendarDetailClose")?.addEventListener("click", () => {
      selectedEventId = "";
      renderBoard();
      renderDetailPanel();
    });
  }

  function eventMatchesFilter(event) {
    if (calendarFilter === "all") return true;
    const isPmh = isStructureJob(event);
    if (calendarFilter === "pmh") return isPmh;
    if (calendarFilter === "pev") return !isPmh;
    return true;
  }

  function updateFilterControls() {
    document.querySelectorAll("[data-calendar-filter]").forEach((chip) => {
      const active = chip.dataset.calendarFilter === calendarFilter;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const calendarView = el("calendarView");
    const boardCard = document.querySelector(".calendar-board-card");
    if (calendarView) {
      calendarView.classList.toggle("filter-pev", calendarFilter === "pev");
      calendarView.classList.toggle("filter-pmh", calendarFilter === "pmh");
    }
    if (boardCard) {
      boardCard.classList.toggle("filter-pev", calendarFilter === "pev");
      boardCard.classList.toggle("filter-pmh", calendarFilter === "pmh");
    }

    const hint = el("calendarFilterHint");
    if (!hint) return;
    if (calendarFilter === "pmh") hint.textContent = "Showing PMH bookings only. Tap All to clear.";
    else if (calendarFilter === "pev") hint.textContent = "Showing PEV bookings only. Tap All to clear.";
    else hint.textContent = "Showing all bookings. Tap PMH or PEV to filter.";
  }

  function setCalendarFilter(nextFilter) {
    const wanted = String(nextFilter || "all").toLowerCase();
    calendarFilter = ["all", "pmh", "pev"].includes(wanted) ? wanted : "all";
    // Clear detail if the open booking no longer matches the filter.
    if (selectedEventId) {
      const open = findEvent(selectedEventId);
      if (!open || !eventMatchesFilter(open)) selectedEventId = "";
    }
    updateFilterControls();
    renderBoard();
  }

  function renderRollingList() {
    const board = el("calendarBoard");
    if (!board) return;

    const list = sortedUpcomingEvents().filter(eventMatchesFilter);
    if (!list.length) {
      const emptyFilter =
        calendarFilter === "pmh"
          ? "No PMH bookings in the synced range."
          : calendarFilter === "pev"
            ? "No PEV bookings in the synced range."
            : "";
      board.innerHTML = `
        <p class="muted">
          ${
            emptyFilter ||
            (isConnected()
              ? "No upcoming bookings in the synced range yet. Try Refresh after adding jobs in Google Calendar."
              : "Connect Google once to pull the schedule into this list.")
          }
        </p>
      `;
      return;
    }

    let lastDayKey = "";
    const parts = [];

    list.forEach((event) => {
      const bounds = eventBounds(event);
      if (!bounds) return;
      const day = startOfDay(bounds.start);
      const dayKey = day.toISOString().slice(0, 10);
      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        parts.push(`<h3 class="calendar-day-label">${escapeHtml(formatDayHeading(day))}</h3>`);
      }
      parts.push(renderEventBlock(event));
    });

    board.innerHTML = `<div class="calendar-rolling">${parts.join("")}</div>`;
  }

  function renderBoard() {
    const board = el("calendarBoard");
    if (!board) return;

    if (!isConfigured() && !events.length) {
      board.innerHTML = '<p class="muted">Calendar connect is waiting on your Google Client ID.</p>';
      renderDetailPanel();
      return;
    }

    if (!events.length) {
      board.innerHTML = `
        <p class="muted">
          ${
            isConnected()
              ? "No events in the synced range yet. Try Refresh after adding jobs in Google Calendar."
              : "Connect Google once to pull the schedule into this app calendar."
          }
        </p>
      `;
      selectedEventId = "";
      renderDetailPanel();
      return;
    }

    renderRollingList();
    renderDetailPanel();
  }

  function updateConnectButton() {
    const connectBtn = el("calendarConnectButton");
    const disconnectBtn = el("calendarDisconnectButton");
    const refreshBtn = el("calendarRefreshButton");
    if (!connectBtn) return;

    const connected = isConnected();
    connectBtn.disabled = !isConfigured();
    connectBtn.textContent = "Connect Google Calendar";
    connectBtn.classList.toggle("hidden", connected);
    if (disconnectBtn) disconnectBtn.classList.toggle("hidden", !connected);
    if (refreshBtn) {
      refreshBtn.classList.toggle("hidden", !isConfigured());
      refreshBtn.disabled = !connected;
      refreshBtn.textContent = "Refresh Sync";
    }
  }

  function render() {
    renderSetupPanel();
    updateConnectButton();
    updateFilterControls();
    renderBoard();
  }

  async function fetchCalendarEvents() {
    if (!isConnected()) return;
    setStatus("Syncing calendar…");

    const calendarId = encodeURIComponent(config().calendarId || "primary");
    const timeMin = addDays(startOfDay(new Date()), -1).toISOString();
    const timeMax = addDays(startOfDay(new Date()), 90).toISOString();
    const params = new URLSearchParams({
      maxResults: "250",
      singleEvents: "true",
      orderBy: "startTime",
      timeMin,
      timeMax
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401) {
        storeToken("", 0);
        throw new Error("Google session expired — tap Connect Google Calendar to sign in again.");
      }
      throw new Error(`Calendar API error (${response.status}): ${text.slice(0, 180)}`);
    }

    const data = await response.json();
    events = (Array.isArray(data.items) ? data.items : [])
      .map(normalizeEvent)
      .filter((event) => event && event.id);
    syncedAt = Date.now();
    persistEvents();
    if (selectedEventId && !findEvent(selectedEventId)) selectedEventId = "";
    setStatus(`Synced ${events.length} booking${events.length === 1 ? "" : "s"} · ${formatSyncedAt(syncedAt)}`);
    renderBoard();
  }

  function ensureTokenClient() {
    if (!isConfigured()) {
      throw new Error("Missing Google Client ID in google-config.js");
    }
    if (!window.google?.accounts?.oauth2) {
      throw new Error("Google Identity script not loaded yet — wait a moment and try again.");
    }
    if (tokenClient) return tokenClient;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config().clientId.trim(),
      scope: config().scopes,
      callback: async (response) => {
        if (response.error) {
          setStatus(`Google auth error: ${response.error}`);
          render();
          return;
        }
        storeToken(response.access_token, response.expires_in);
        setStatus("Connected. Syncing calendar…");
        render();
        try {
          await fetchCalendarEvents();
        } catch (error) {
          setStatus(error.message || "Failed to sync calendar.");
        }
        render();
      }
    });
    return tokenClient;
  }

  function connect() {
    try {
      ensureTokenClient().requestAccessToken({ prompt: isConnected() ? "" : "consent" });
    } catch (error) {
      setStatus(error.message || "Could not start Google sign-in.");
      render();
    }
  }

  function disconnect() {
    const token = accessToken;
    storeToken("", 0);
    if (token && window.google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(token, () => {});
    }
    setStatus(
      events.length
        ? `Disconnected. Saved schedule still available (last sync ${formatSyncedAt(syncedAt)}).`
        : "Disconnected from Google Calendar."
    );
    render();
  }

  async function refresh() {
    try {
      if (!isConnected()) {
        setStatus("Connect Google first to refresh.");
        return;
      }
      await fetchCalendarEvents();
      render();
    } catch (error) {
      setStatus(error.message || "Refresh failed.");
      render();
    }
  }

  function onBoardClick(event) {
    const booking = event.target.closest("[data-event-id]");
    if (!booking) return;
    const id = booking.getAttribute("data-event-id");
    if (!id) return;
    selectedEventId = selectedEventId === id ? "" : id;
    renderBoard();
    el("calendarDetail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function bind() {
    if (bound) return;
    bound = true;
    loadStoredToken();
    loadCachedEvents();
    el("calendarConnectButton")?.addEventListener("click", connect);
    el("calendarDisconnectButton")?.addEventListener("click", disconnect);
    el("calendarRefreshButton")?.addEventListener("click", refresh);
    el("calendarBoard")?.addEventListener("click", onBoardClick);
    document.querySelectorAll("[data-calendar-filter]").forEach((chip) => {
      chip.addEventListener("click", () => setCalendarFilter(chip.dataset.calendarFilter));
    });
    render();
  }

  function show() {
    bind();
    render();
    if (isConfigured() && isConnected()) {
      refresh();
    }
  }

  function extractJobNumber(text) {
    const raw = String(text || "");
    const hashMatch = raw.match(/#(\d{3,5})\b/);
    if (hashMatch?.[1]) return hashMatch[1];
    const jobMatch = raw.match(/\bjob\s*#?\s*(\d{3,5})\b/i);
    if (jobMatch?.[1]) return jobMatch[1];
    const candidates = [...raw.matchAll(/\b(\d{3,5})\b/g)]
      .map((match) => match[1])
      .filter((code) => !/^(19|20)\d{2}$/.test(code));
    return candidates.find((code) => code.length === 3) || candidates[0] || "";
  }

  function findEventForJob(jobCode, date = "") {
    const code = String(jobCode || "");
    if (!code || code === "STORE") return null;
    const matches = events.filter((event) => {
      const blob = `${event.summary || ""} ${plainText(event.description || "")}`;
      return extractJobNumber(blob) === code;
    });
    if (!matches.length) return null;
    if (!date) return matches[0];
    const onDay = matches.find((event) => eventOccursOnDay(event, new Date(`${date}T12:00:00`)));
    return onDay || matches[0];
  }

  function mergeCrewHoursDescription(existingDescription, hoursBlock) {
    const marker = "--- Crew hours (completed) ---";
    const base = String(existingDescription || "");
    const idx = base.indexOf(marker);
    const cleaned = (idx >= 0 ? base.slice(0, idx) : base).trimEnd();
    return `${cleaned}\n\n${hoursBlock}`.trim();
  }

  async function writeCrewHoursToEvent(eventId, hoursBlock) {
    if (!isConnected()) {
      throw new Error("Connect Google Calendar to write hours onto the booking.");
    }
    if (!eventId) throw new Error("No matching calendar booking found for this job.");

    const existing = events.find((event) => event.id === eventId);
    const description = mergeCrewHoursDescription(existing?.description || "", hoursBlock);
    const calendarId = encodeURIComponent(config().calendarId || "primary");
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ description })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401) {
        storeToken("", 0);
        throw new Error("Google session expired — connect again, then retry Mark complete.");
      }
      throw new Error(`Could not update calendar (${response.status}): ${text.slice(0, 160)}`);
    }

    const updated = normalizeEvent(await response.json());
    if (updated) {
      const index = events.findIndex((event) => event.id === updated.id);
      if (index >= 0) events[index] = updated;
      else events.push(updated);
      persistEvents();
    }
    return updated;
  }

  window.PMHCalendar = {
    bind,
    show,
    render,
    isConfigured,
    isConnected,
    getEvents: () => events.slice(),
    findEventForJob,
    writeCrewHoursToEvent
  };
})();
