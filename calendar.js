(() => {
  "use strict";

  const TOKEN_KEY = "pm_google_access_token_v1";
  const TOKEN_EXP_KEY = "pm_google_access_exp_v1";
  const EVENTS_KEY = "pm_calendar_events_v1";
  const SYNCED_AT_KEY = "pm_calendar_synced_at_v1";

  let tokenClient = null;
  let accessToken = "";
  let tokenExpiresAt = 0;
  let events = [];
  let syncedAt = 0;
  let statusMessage = "";
  let bound = false;
  let mode = "week"; // week | day
  let focusDate = startOfDay(new Date());
  let selectedEventId = "";

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

  function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getDay(); // 0 Sun … 6 Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    return addDays(d, mondayOffset);
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
      // Google all-day end is exclusive
      end = endRaw
        ? startOfDay(new Date(`${endRaw}T00:00:00`))
        : addDays(start, 1);
    } else {
      start = new Date(startRaw);
      end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 60 * 60 * 1000);
    }

    return { start, end, allDay };
  }

  function eventOccursOnDay(event, day) {
    const bounds = eventBounds(event);
    if (!bounds) return false;
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    return bounds.start < dayEnd && bounds.end > dayStart;
  }

  function eventsForDay(day) {
    return events
      .filter((event) => eventOccursOnDay(event, day))
      .sort((a, b) => {
        const ba = eventBounds(a);
        const bb = eventBounds(b);
        if (!ba || !bb) return 0;
        if (ba.allDay !== bb.allDay) return ba.allDay ? -1 : 1;
        return ba.start - bb.start;
      });
  }

  function formatDayHeading(date) {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  }

  function formatWeekLabel(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    const startLabel = weekStart.toLocaleDateString("en-GB", {
      day: "numeric",
      month: sameMonth ? undefined : "short"
    });
    const endLabel = weekEnd.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    return `${startLabel} – ${endLabel}`;
  }

  function formatTimeRange(event) {
    const bounds = eventBounds(event);
    if (!bounds) return "";
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

  function formatSyncedAt(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
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

  function truncateText(value, max = 90) {
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
    statusMessage = message;
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

  function renderToolbar() {
    const label = el("calendarRangeLabel");
    const weekBtn = el("calendarModeWeek");
    const dayBtn = el("calendarModeDay");
    if (weekBtn) weekBtn.classList.toggle("active", mode === "week");
    if (dayBtn) dayBtn.classList.toggle("active", mode === "day");

    if (!label) return;
    if (mode === "week") {
      label.textContent = `Week ${formatWeekLabel(startOfWeek(focusDate))}`;
    } else {
      label.textContent = focusDate.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }
  }

  function renderEventBlock(event, { compact = false } = {}) {
    const title = escapeHtml(event.summary || "(No title)");
    const when = escapeHtml(formatTimeRange(event));
    const location = event.location
      ? `<div class="entry-meta">${escapeHtml(event.location)}</div>`
      : "";
    const preview =
      !compact && event.description
        ? `<div class="entry-meta calendar-desc-preview">${escapeHtml(truncateText(event.description, 140))}</div>`
        : "";
    const selected = selectedEventId && event.id === selectedEventId ? " is-selected" : "";
    return `
      <article class="calendar-event${compact ? " calendar-event-compact" : ""}${selected}" data-event-id="${escapeHtml(event.id)}">
        <div>
          <strong>${title}</strong>
          <div class="entry-meta">${when}</div>
          ${compact ? "" : location}
          ${preview}
        </div>
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

    panel.classList.remove("hidden");
    panel.innerHTML = `
      <div class="calendar-detail-header">
        <h3>Booking details</h3>
        <button type="button" id="calendarDetailClose" class="change-user-link">Close</button>
      </div>
      <article class="calendar-detail-body${cancelled ? " is-cancelled" : ""}">
        <strong class="calendar-detail-title">${escapeHtml(event.summary || "(No title)")}</strong>
        <div class="entry-meta">${escapeHtml(formatTimeRange(event))}</div>
        <dl class="calendar-detail-list">
          <div>
            <dt>Status</dt>
            <dd>${escapeHtml(status)}</dd>
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
      </article>
    `;

    el("calendarDetailClose")?.addEventListener("click", () => {
      selectedEventId = "";
      renderBoard();
      renderDetailPanel();
    });
  }

  function renderWeekView() {
    const board = el("calendarBoard");
    if (!board) return;

    const weekStart = startOfWeek(focusDate);
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    board.innerHTML = `
      <div class="calendar-week">
        ${days
          .map((day) => {
            const dayEvents = eventsForDay(day);
            const isToday = sameDay(day, today);
            const isFocus = sameDay(day, focusDate);
            return `
              <section class="calendar-day-col${isToday ? " is-today" : ""}${isFocus ? " is-focus" : ""}">
                <button type="button" class="calendar-day-header" data-jump-day="${day.toISOString()}">
                  <span>${escapeHtml(formatDayHeading(day))}</span>
                  <span class="calendar-day-count">${dayEvents.length}</span>
                </button>
                <div class="calendar-day-events">
                  ${
                    dayEvents.length
                      ? dayEvents.map((event) => renderEventBlock(event, { compact: true })).join("")
                      : '<p class="muted calendar-empty-day">No events</p>'
                  }
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderDayView() {
    const board = el("calendarBoard");
    if (!board) return;

    const dayEvents = eventsForDay(focusDate);
    const allDay = dayEvents.filter((e) => eventBounds(e)?.allDay);
    const timed = dayEvents.filter((e) => !eventBounds(e)?.allDay);

    board.innerHTML = `
      <div class="calendar-day-detail">
        ${
          allDay.length
            ? `<div class="calendar-all-day">
                <h4>All day</h4>
                ${allDay.map((event) => renderEventBlock(event)).join("")}
              </div>`
            : ""
        }
        ${
          !dayEvents.length
            ? '<p class="muted">Nothing scheduled for this day in the saved calendar.</p>'
            : `<div class="calendar-timeline">
          ${
            timed.length
              ? timed
                  .map((event) => {
                    const bounds = eventBounds(event);
                    const startHour = bounds.start.getHours() + bounds.start.getMinutes() / 60;
                    const endHour = Math.max(
                      startHour + 0.5,
                      bounds.end.getHours() + bounds.end.getMinutes() / 60
                    );
                    const top = ((startHour - 6) / 16) * 100;
                    const height = ((endHour - startHour) / 16) * 100;
                    const clampedTop = Math.max(0, Math.min(92, top));
                    const clampedHeight = Math.max(4, Math.min(100 - clampedTop, height));
                    const selected =
                      selectedEventId && event.id === selectedEventId ? " is-selected" : "";
                    return `
                      <article class="calendar-timed-event${selected}" style="top:${clampedTop}%;height:${clampedHeight}%;" data-event-id="${escapeHtml(event.id)}">
                        <strong>${escapeHtml(event.summary || "(No title)")}</strong>
                        <div class="entry-meta">${escapeHtml(formatTimeRange(event))}</div>
                        ${
                          event.location
                            ? `<div class="entry-meta">${escapeHtml(event.location)}</div>`
                            : ""
                        }
                      </article>
                    `;
                  })
                  .join("")
              : '<p class="muted calendar-timeline-empty">No timed events this day.</p>'
          }
          ${Array.from({ length: 17 }, (_, i) => {
            const hour = 6 + i;
            const label = `${String(hour).padStart(2, "0")}:00`;
            return `<div class="calendar-hour-row"><span>${label}</span></div>`;
          }).join("")}
        </div>
        <div class="calendar-day-list">
          <h4>Bookings today</h4>
          ${dayEvents.map((event) => renderEventBlock(event)).join("")}
        </div>`
        }
      </div>
    `;
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

    if (mode === "week") renderWeekView();
    else renderDayView();
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
    // Only show Connect when not signed in — Refresh Sync covers updates while connected.
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
    renderToolbar();
    renderBoard();
  }

  async function fetchCalendarEvents() {
    if (!isConnected()) return;
    setStatus("Syncing calendar…");

    const calendarId = encodeURIComponent(config().calendarId || "primary");
    const timeMin = addDays(startOfDay(new Date()), -14).toISOString();
    const timeMax = addDays(startOfDay(new Date()), 60).toISOString();
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

  function shiftRange(direction) {
    const step = mode === "week" ? 7 : 1;
    focusDate = addDays(focusDate, direction * step);
    renderToolbar();
    renderBoard();
  }

  function goToday() {
    focusDate = startOfDay(new Date());
    renderToolbar();
    renderBoard();
  }

  function setMode(next) {
    mode = next === "day" ? "day" : "week";
    renderToolbar();
    renderBoard();
  }

  function onBoardClick(event) {
    const booking = event.target.closest("[data-event-id]");
    if (booking) {
      const id = booking.getAttribute("data-event-id");
      if (!id) return;
      selectedEventId = selectedEventId === id ? "" : id;
      renderBoard();
      el("calendarDetail")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const jump = event.target.closest("[data-jump-day]");
    if (!jump) return;
    const iso = jump.getAttribute("data-jump-day");
    if (!iso) return;
    focusDate = startOfDay(new Date(iso));
    mode = "day";
    selectedEventId = "";
    render();
  }

  function bind() {
    if (bound) return;
    bound = true;
    loadStoredToken();
    loadCachedEvents();
    el("calendarConnectButton")?.addEventListener("click", connect);
    el("calendarDisconnectButton")?.addEventListener("click", disconnect);
    el("calendarRefreshButton")?.addEventListener("click", refresh);
    el("calendarPrev")?.addEventListener("click", () => shiftRange(-1));
    el("calendarNext")?.addEventListener("click", () => shiftRange(1));
    el("calendarToday")?.addEventListener("click", goToday);
    el("calendarModeWeek")?.addEventListener("click", () => setMode("week"));
    el("calendarModeDay")?.addEventListener("click", () => setMode("day"));
    el("calendarBoard")?.addEventListener("click", onBoardClick);
    render();
  }

  function show() {
    bind();
    render();
    if (isConfigured() && isConnected()) {
      refresh();
    }
  }

  window.PMHCalendar = {
    bind,
    show,
    render,
    isConfigured,
    isConnected
  };
})();
