(() => {
  "use strict";

  const TOKEN_KEY = "pm_google_access_token_v1";
  const TOKEN_EXP_KEY = "pm_google_access_exp_v1";

  let tokenClient = null;
  let accessToken = "";
  let tokenExpiresAt = 0;
  let events = [];
  let statusMessage = "";
  let bound = false;

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
    setStatus(isConnected() ? "Connected to Google Calendar." : "Ready to connect your Google account.");
  }

  function formatWhen(event) {
    const start = event.start?.dateTime || event.start?.date || "";
    const end = event.end?.dateTime || event.end?.date || "";
    if (!start) return "No time";
    if (event.start?.date && !event.start?.dateTime) {
      return new Date(`${start}T12:00:00`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short"
      }) + " (all day)";
    }
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const day = startDate.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
    const startTime = startDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const endTime = endDate
      ? endDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "";
    return endTime ? `${day} · ${startTime}–${endTime}` : `${day} · ${startTime}`;
  }

  function renderEvents() {
    const list = el("calendarEvents");
    if (!list) return;

    if (!isConfigured()) {
      list.innerHTML = '<p class="muted">Calendar connect is waiting on your Google Client ID.</p>';
      return;
    }

    if (!isConnected()) {
      list.innerHTML = '<p class="muted">Connect Google to load upcoming events.</p>';
      return;
    }

    if (!events.length) {
      list.innerHTML = '<p class="muted">No upcoming events found on this calendar.</p>';
      return;
    }

    list.innerHTML = events.map((event) => `
      <article class="calendar-event">
        <div>
          <strong>${escapeHtml(event.summary || "(No title)")}</strong>
          <div class="entry-meta">${escapeHtml(formatWhen(event))}</div>
          ${event.location ? `<div class="entry-meta">${escapeHtml(event.location)}</div>` : ""}
        </div>
      </article>
    `).join("");
  }

  function updateConnectButton() {
    const connectBtn = el("calendarConnectButton");
    const disconnectBtn = el("calendarDisconnectButton");
    const refreshBtn = el("calendarRefreshButton");
    if (!connectBtn) return;

    connectBtn.disabled = !isConfigured();
    connectBtn.textContent = isConnected() ? "Reconnect Google" : "Connect Google Calendar";
    if (disconnectBtn) disconnectBtn.classList.toggle("hidden", !isConnected());
    if (refreshBtn) refreshBtn.disabled = !isConnected();
  }

  function render() {
    renderSetupPanel();
    updateConnectButton();
    renderEvents();
  }

  async function fetchUpcomingEvents() {
    if (!isConnected()) return;
    setStatus("Loading upcoming events…");
    const calendarId = encodeURIComponent(config().calendarId || "primary");
    const params = new URLSearchParams({
      maxResults: "20",
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: new Date().toISOString()
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Calendar API error (${response.status}): ${text.slice(0, 180)}`);
    }

    const data = await response.json();
    events = Array.isArray(data.items) ? data.items : [];
    setStatus(`Loaded ${events.length} upcoming event${events.length === 1 ? "" : "s"}.`);
    renderEvents();
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
        setStatus("Connected. Fetching events…");
        render();
        try {
          await fetchUpcomingEvents();
        } catch (error) {
          setStatus(error.message || "Failed to load events.");
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
    events = [];
    if (token && window.google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(token, () => {});
    }
    setStatus("Disconnected from Google Calendar.");
    render();
  }

  async function refresh() {
    try {
      if (!isConnected()) {
        setStatus("Connect Google first.");
        return;
      }
      await fetchUpcomingEvents();
      render();
    } catch (error) {
      setStatus(error.message || "Refresh failed.");
      render();
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    loadStoredToken();
    el("calendarConnectButton")?.addEventListener("click", connect);
    el("calendarDisconnectButton")?.addEventListener("click", disconnect);
    el("calendarRefreshButton")?.addEventListener("click", refresh);
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
