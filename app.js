(() => {
  "use strict";

  const STORAGE = {
    users: "pm_users_v8",
    entries: "pm_entries_v8",
    currentUser: "pm_current_user_v8",
    sessionActor: "pm_session_actor_v8",
    pins: "pm_pins_v2",
    completedJobs: "pm_completed_jobs_v3"
  };

  const memoryStorage = {};

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = String(value);
    }
  }

  const defaultUsers = [
    { id: "scott", name: "Scott", active: true, role: "Owner", seedHours: 0, avatar: "scott" },
    { id: "ronnie", name: "Ronnie", active: true, role: "Team member", seedHours: 0, avatar: "ronnie" },
    { id: "karen", name: "Karen", active: true, role: "Team member", seedHours: 0, avatar: "karen" },
    { id: "jason", name: "Jason", active: true, role: "Team member", seedHours: 0, avatar: "jason" }
  ];

  const defaultEntries = [];

  const avatarFiles = {
    scott: "assets/avatars/scott.png",
    ronnie: "assets/avatars/ronnie.png",
    karen: "assets/avatars/karen.png",
    jason: "assets/avatars/jason.png",
    spare1: "assets/avatars/spare1.png",
    spare2: "assets/avatars/spare2.png",
    spare3: "assets/avatars/spare3.png",
    spare4: "assets/avatars/spare4.png"
  };

  const fallbackAvatars = Object.keys(avatarFiles);
  const CANONICAL_ROLES = {
    scott: "Owner",
    ronnie: "Team member",
    karen: "Team member",
    jason: "Team member"
  };

  let users = load(STORAGE.users, null);
  let entries = load(STORAGE.entries, null);
  let sessionActorId = storageGet(STORAGE.sessionActor) || "";
  let currentUserId = storageGet(STORAGE.currentUser) || "";
  let pins = load(STORAGE.pins, {}) || {};
  if (!pins || typeof pins !== "object" || Array.isArray(pins)) pins = {};
  let completedJobs = load(STORAGE.completedJobs, {}) || {};
  if (!completedJobs || typeof completedJobs !== "object" || Array.isArray(completedJobs)) completedJobs = {};
  let pendingComplete = null;
  let pendingPhotos = [];
  let loginMode = "auth"; // "auth" | "switch"
  let cloudRenderTimer = null;
  let jobsViewDirty = true;
  let uiBound = false;

  // Fresh roster for the access model — no legacy demo users carried over.
  if (!Array.isArray(users) || users.length === 0) {
    users = JSON.parse(JSON.stringify(defaultUsers));
    storageSet(STORAGE.users, JSON.stringify(users));
  }
  if (!Array.isArray(entries)) {
    entries = JSON.parse(JSON.stringify(defaultEntries));
    storageSet(STORAGE.entries, JSON.stringify(entries));
  }

  users = normalizeUsers(users);
  storageSet(STORAGE.users, JSON.stringify(users));

  const el = (id) => document.getElementById(id);

  function load(key, fallback) {
    try {
      const value = storageGet(key);
      if (!value) return fallback === null ? null : JSON.parse(JSON.stringify(fallback));
      return JSON.parse(value);
    } catch {
      return fallback === null ? null : JSON.parse(JSON.stringify(fallback));
    }
  }

  function normalizeUsers(list) {
    return (Array.isArray(list) ? list : []).map((user, index) => {
      const avatarKey = avatarFiles[user.avatar]
        ? user.avatar
        : avatarFiles[user.id]
          ? user.id
          : fallbackAvatars[index % fallbackAvatars.length];
      return {
        ...user,
        role: CANONICAL_ROLES[user.id] || user.role || "Team member",
        avatar: avatarKey,
        seedHours: 0,
        // Missing active must mean active — cloud payloads sometimes omit the field.
        active: user.active !== false
      };
    });
  }

  function isUserActive(user) {
    return Boolean(user && user.active !== false);
  }

  function findActiveUser(userId) {
    return users.find((user) => user.id === userId && isUserActive(user)) || null;
  }

  function saveAll() {
    storageSet(STORAGE.users, JSON.stringify(users));
    storageSet(STORAGE.entries, JSON.stringify(entries));
    storageSet(STORAGE.pins, JSON.stringify(pins));
    storageSet(STORAGE.completedJobs, JSON.stringify(completedJobs));
    storageSet(STORAGE.sessionActor, sessionActorId || "");
    storageSet(STORAGE.currentUser, currentUserId || "");
    jobsViewDirty = true;
    window.PMHCloud?.pushState?.({
      users,
      entries,
      pins,
      completedJobs,
      updatedBy: sessionActorId || currentUserId || "crew"
    });
  }

  function applyCloudState(state) {
    const nextUsers = normalizeUsers(state.users);
    // Never replace a good local roster with an empty cloud payload.
    if (nextUsers.length) {
      users = nextUsers;
    }
    if (Array.isArray(state.entries)) entries = state.entries;
    if (state.pins && typeof state.pins === "object") pins = state.pins;
    if (state.completedJobs && typeof state.completedJobs === "object") {
      completedJobs = state.completedJobs;
    }

    // Only force sign-out if this actor was explicitly retired — never on soft/empty sync.
    if (sessionActorId && users.length) {
      const actor = users.find((user) => user.id === sessionActorId);
      if (actor && actor.active === false) {
        sessionActorId = "";
        currentUserId = "";
        persistSession();
      } else if (actor && currentUserId && !users.some((user) => user.id === currentUserId)) {
        currentUserId = sessionActorId;
        persistSession();
      }
    }

    storageSet(STORAGE.users, JSON.stringify(users));
    storageSet(STORAGE.entries, JSON.stringify(entries));
    storageSet(STORAGE.pins, JSON.stringify(pins));
    storageSet(STORAGE.completedJobs, JSON.stringify(completedJobs));
    jobsViewDirty = true;

    scheduleRenderAll();
    if (!sessionActorId && !el("loginView")?.classList.contains("active")) {
      showView("loginView");
    }
  }

  function scheduleRenderAll() {
    clearTimeout(cloudRenderTimer);
    cloudRenderTimer = setTimeout(() => {
      try {
        renderAll();
      } catch (error) {
        console.error("Failed to refresh after cloud sync", error);
      }
    }, 220);
  }

  function updateCloudStatus(info) {
    const node = el("cloudSyncStatus");
    if (!node) return;
    const message = info?.message || info?.status || "";
    node.textContent = message;
    node.dataset.state = info?.configured
      ? (info?.ready ? "on" : "pending")
      : "off";
    node.title = info?.error
      ? info.error
      : info?.configured
        ? "Hours are saved to the shared cloud automatically."
        : "Cloud sync is not configured yet. See FIREBASE_SETUP.md.";
  }

  function persistPins() {
    storageSet(STORAGE.pins, JSON.stringify(pins));
    window.PMHCloud?.pushState?.({
      users,
      entries,
      pins,
      completedJobs,
      updatedBy: sessionActorId || currentUserId || "crew"
    });
  }

  function getActor() {
    return findActiveUser(sessionActorId);
  }

  function isOwner(user = getActor()) {
    return Boolean(user && (user.id === "scott" || user.role === "Owner"));
  }

  function isManager(user = getActor()) {
    // Ronnie keeps manager powers; label stays "Team member" in the UI.
    return Boolean(user && user.id === "ronnie");
  }

  function canSwitchProfiles(user = getActor()) {
    // Hard gate: only Scott and Ronnie may switch profiles.
    return Boolean(user && (user.id === "scott" || user.id === "ronnie"));
  }

  function canManageCalendarSync(user = getActor()) {
    // Only Scott/Ronnie connect Google; everyone else just reads the shared schedule.
    return Boolean(user && (user.id === "scott" || user.id === "ronnie"));
  }

  window.PMHApp = {
    canManageCalendarSync: () => canManageCalendarSync(),
    isJobNumberComplete: (jobCode) => isJobNumberComplete(jobCode),
    isJobNumberFullyComplete: (jobCode) => isJobNumberFullyComplete(jobCode),
    getJobCompletionStatus: (jobCode) => getJobCompletionStatus(jobCode),
    isCalendarBookingComplete: (eventId, jobCode, date) =>
      isCalendarBookingComplete(eventId, jobCode, date),
    openAddPhotosForJob: (date, jobCode, returnView) => openAddPhotosForJob(date, jobCode, returnView),
    getJobHoursSummary: (jobCode) => getJobHoursSummary(jobCode),
    formatHours: (value) => formatHours(value),
    renderJobPhotosByNumber: (container, jobCode) => renderJobPhotosByNumber(container, jobCode)
  };

  function updateSwitchProfileVisibility() {
    const switchButton = el("changeUserButton");
    if (!switchButton) return;
    const allowed = canSwitchProfiles();
    switchButton.hidden = !allowed;
    switchButton.classList.toggle("hidden", !allowed);
    switchButton.setAttribute("aria-hidden", allowed ? "false" : "true");
    if (!allowed) switchButton.style.display = "none";
    else switchButton.style.removeProperty("display");
  }

  function updateBrandTheme() {
    const user = getCurrentUser();
    // Shared Marquees branding for every profile.
    document.querySelector(".app")?.classList.remove("brand-event-hire", "theme-event-hire");
    const title = el("brandTitle") || document.querySelector(".site-header h1");
    const subtitle = el("brandSubtitle") || document.querySelector(".site-header p");
    const logo = el("brandLogo") || document.querySelector(".site-header img");
    if (title) title.textContent = "Peterhead Marquees";
    if (subtitle) subtitle.textContent = "Team Manager";
    if (logo) {
      const nextSrc = "assets/peterhead-marquees-logo.jpg?v=1.10.1";
      if (logo.getAttribute("src") !== nextSrc) logo.src = nextSrc;
      logo.alt = "Peterhead Marquees";
    }
    el("summaryView")?.classList.remove("profile-theme-event");
    el("summaryRobot")?.classList.remove("avatar-event-hire", "avatar-owner");
  }

  function canEditTarget(targetId, actor = getActor()) {
    if (!actor || !targetId) return false;
    if (actor.id === "scott") return true;
    if (targetId === "scott") return false;
    if (actor.id === "ronnie") return true;
    return actor.id === targetId;
  }

  function canEditCurrentProfile() {
    return canEditTarget(currentUserId);
  }

  function persistSession() {
    storageSet(STORAGE.sessionActor, sessionActorId || "");
    storageSet(STORAGE.currentUser, currentUserId || "");
  }

  function jobKey(date, job) {
    return `${date}_${String(job || "").toUpperCase()}`;
  }

  function isJobComplete(date, job) {
    return Boolean(completedJobs[jobKey(date, job)]);
  }

  function isJobNumberComplete(jobCode) {
    const code = String(jobCode || "").toUpperCase();
    if (!code || code === "STORE") return false;
    return Object.values(completedJobs).some(
      (row) => String(row?.job || "").toUpperCase() === code
    );
  }

  function visitDatesForJob(jobCode) {
    const code = String(jobCode || "").toUpperCase();
    if (!code || code === "STORE") return [];
    const dates = new Set(
      entries
        .filter((entry) => !entry.cancelled && String(entry.job || "").toUpperCase() === code)
        .map((entry) => entry.date)
        .filter(Boolean)
    );
    try {
      const calendarEvents = window.PMHCalendar?.getEvents?.() || [];
      calendarEvents.forEach((event) => {
        const blob = `${event.summary || ""} ${String(event.description || "").replace(/<[^>]+>/g, " ")}`;
        if (extractJobNumber(blob) !== code) return;
        const startRaw = event.start?.dateTime || event.start?.date || "";
        if (!startRaw) return;
        dates.add(String(startRaw).slice(0, 10));
      });
    } catch {
      /* ignore */
    }
    return [...dates].sort();
  }

  function getJobCompletionStatus(jobCode) {
    const code = String(jobCode || "").toUpperCase();
    const rows = Object.values(completedJobs).filter(
      (row) => String(row?.job || "").toUpperCase() === code
    );
    const dates = visitDatesForJob(code);
    const completedDates = [...new Set(rows.map((row) => row.date).filter(Boolean))].sort();
    const hourDates = [
      ...new Set(
        entries
          .filter((entry) => !entry.cancelled && String(entry.job || "").toUpperCase() === code)
          .map((entry) => entry.date)
      )
    ].sort();
    const requiredDates = hourDates.length ? hourDates : dates;
    const hasCollection = rows.some(
      (row) =>
        row.visitType === "collection" ||
        row.visitType === "event_operator" ||
        row.visitType === "single"
    );
    const hasDelivery = rows.some((row) => row.visitType === "delivery");
    // Collection / one-visit completes the whole job. Delivery keeps it open.
    // Legacy records without visitType still require every hour-date marked.
    const legacyFullyComplete =
      !rows.some((row) => row.visitType) &&
      requiredDates.length > 0 &&
      requiredDates.every((date) => isJobComplete(date, code));
    const fullyComplete = hasCollection || legacyFullyComplete;
    return {
      job: code,
      dates,
      hourDates,
      requiredDates,
      completedDates,
      hasDelivery,
      hasCollection,
      fullyComplete,
      partial: !fullyComplete && (hasDelivery || completedDates.length > 0)
    };
  }

  function isJobNumberFullyComplete(jobCode) {
    return Boolean(getJobCompletionStatus(jobCode).fullyComplete);
  }

  function isCalendarBookingComplete(eventId, jobCode, date = "") {
    if (eventId) {
      const byEvent = Object.values(completedJobs).some(
        (row) => row?.calendarEventId && row.calendarEventId === eventId
      );
      if (byEvent) return true;
    }
    if (date && jobCode && isJobComplete(date, jobCode)) return true;
    return false;
  }

  function openPhotoDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("pmh_team_manager_photos_v1", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("photos")) {
          const store = db.createObjectStore("photos", { keyPath: "id" });
          store.createIndex("jobKey", "jobKey", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function savePhotosForJob(jobKeyValue, files) {
    if (!files.length) return [];
    const db = await openPhotoDb();
    const saved = [];
    await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      const store = tx.objectStore("photos");
      files.forEach((file, index) => {
        const record = {
          id: `${jobKeyValue}_${Date.now()}_${index}`,
          jobKey: jobKeyValue,
          name: file.name || `photo_${index + 1}.jpg`,
          type: file.type || "image/jpeg",
          blob: file,
          createdAt: Date.now()
        };
        store.put(record);
        saved.push(record.id);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return saved;
  }

  async function listPhotosForJob(jobKeyValue) {
    const db = await openPhotoDb();
    const photos = await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readonly");
      const index = tx.objectStore("photos").index("jobKey");
      const request = index.getAll(jobKeyValue);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return photos;
  }

  function crewHoursForJob(date, jobCode) {
    const code = String(jobCode || "").toUpperCase();
    const byUser = {};
    entries
      .filter((entry) => !entry.cancelled && entry.date === date && String(entry.job).toUpperCase() === code)
      .forEach((entry) => {
        if (!byUser[entry.userId]) {
          byUser[entry.userId] = { userId: entry.userId, hours: 0, mileage: 0 };
        }
        byUser[entry.userId].hours += Number(entry.hours) || 0;
        byUser[entry.userId].mileage += Number(entry.mileage) || 0;
      });
    return Object.values(byUser)
      .map((row) => ({
        ...row,
        name: users.find((user) => user.id === row.userId)?.name || "Unknown"
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function getJobHoursSummary(jobCode) {
    const code = String(jobCode || "").toUpperCase();
    if (!code || code === "STORE") {
      return { job: code, totalHours: 0, totalMiles: 0, dates: [], visits: [], crew: [] };
    }

    const jobEntries = entries.filter(
      (entry) => !entry.cancelled && String(entry.job || "").toUpperCase() === code
    );
    const dates = [...new Set(jobEntries.map((entry) => entry.date))].sort();
    const visits = dates.map((date) => {
      const crew = crewHoursForJob(date, code);
      const hours = crew.reduce((sum, row) => sum + Number(row.hours || 0), 0);
      const mileage = crew.reduce((sum, row) => sum + Number(row.mileage || 0), 0);
      return { date, hours, mileage, crew };
    });
    const byUser = {};
    jobEntries.forEach((entry) => {
      if (!byUser[entry.userId]) {
        byUser[entry.userId] = { userId: entry.userId, hours: 0, mileage: 0 };
      }
      byUser[entry.userId].hours += Number(entry.hours) || 0;
      byUser[entry.userId].mileage += Number(entry.mileage) || 0;
    });
    const crew = Object.values(byUser)
      .map((row) => ({
        ...row,
        name: users.find((user) => user.id === row.userId)?.name || "Unknown"
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const totalHours = crew.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    const totalMiles = crew.reduce((sum, row) => sum + Number(row.mileage || 0), 0);
    return { job: code, totalHours, totalMiles, dates, visits, crew };
  }

  function buildCalendarHoursBlock(date, jobCode, completedByName) {
    const summary = getJobHoursSummary(jobCode);
    const lines = [
      "--- Crew hours (completed) ---",
      `Job #${jobCode}`,
      ...summary.visits.map((visit) => {
        const names = visit.crew.map((row) => `${row.name} ${formatHours(row.hours)}h`).join(", ");
        return `${visit.date}: ${formatHours(visit.hours)} hrs${names ? ` · ${names}` : ""}`;
      }),
      `Total across ${summary.visits.length || 1} visit${summary.visits.length === 1 ? "" : "s"}: ${formatHours(summary.totalHours)} hrs`,
      `Completed by ${completedByName} on ${new Date().toLocaleDateString("en-GB")}`
    ];
    if (!summary.visits.length) {
      const crew = crewHoursForJob(date, jobCode);
      const totalHours = crew.reduce((sum, row) => sum + row.hours, 0);
      return [
        "--- Crew hours (completed) ---",
        `Job #${jobCode} · ${date}`,
        ...crew.map((row) => `${row.name}: ${formatHours(row.hours)} hrs`),
        `Total: ${formatHours(totalHours)} hrs`,
        `Completed by ${completedByName} on ${new Date().toLocaleDateString("en-GB")}`
      ].join("\n");
    }
    return lines.join("\n");
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function hashPin(pin, salt) {
    const data = new TextEncoder().encode(`${salt}:${pin}`);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function hasPin(userId) {
    const record = pins[userId];
    return Boolean(record && record.hash && record.salt);
  }

  function clearPinFields() {
    if (el("loginPin")) el("loginPin").value = "";
    if (el("loginPinConfirm")) el("loginPinConfirm").value = "";
    setPinError("");
  }

  function setPinError(message) {
    const node = el("pinError");
    if (!node) return;
    if (!message) {
      node.textContent = "";
      node.classList.add("hidden");
      return;
    }
    node.textContent = message;
    node.classList.remove("hidden");
  }

  function updatePinPanel() {
    const pinPanel = el("pinPanel");
    const confirmWrap = el("pinConfirmWrap");
    const help = el("pinHelp");
    const label = el("loginPinLabel");
    const button = el("continueButton");
    const switching = loginMode === "switch";

    if (pinPanel) pinPanel.classList.toggle("hidden", switching);
    if (switching) {
      if (help) {
        help.textContent = isOwner()
          ? "Open any profile with no PIN — you can edit everyone."
          : "Open any profile with no PIN. Scott’s profile is view only.";
      }
      if (button) button.textContent = "Open profile";
      clearPinFields();
      return;
    }

    const userId = el("loginUser")?.value || "";
    const creating = userId && !hasPin(userId);
    if (confirmWrap) confirmWrap.classList.toggle("hidden", !creating);
    if (help) {
      help.textContent = creating
        ? "First time for this profile — create a 4–6 digit PIN. This phone will stay signed in after that."
        : "Enter this profile’s PIN once. This phone will stay signed in.";
    }
    if (label) label.textContent = creating ? "Create PIN" : "PIN";
    if (button) button.textContent = creating ? "Set PIN & Enter Profile" : "Enter Profile";
    clearPinFields();
  }

  async function ensureSeedPins() {
    const defaults = ["scott", "ronnie", "karen", "jason"];
    let changed = false;
    for (const userId of defaults) {
      if (hasPin(userId)) continue;
      const salt = randomSalt();
      const hash = await hashPin("0000", salt);
      pins[userId] = { hash, salt, updatedAt: Date.now() };
      changed = true;
    }
    Object.keys(pins).forEach((userId) => {
      if (!users.some((user) => user.id === userId)) {
        delete pins[userId];
        changed = true;
      }
    });
    if (changed) persistPins();
  }

  function isValidPin(pin) {
    return /^\d{4,6}$/.test(String(pin || ""));
  }

  async function verifyOrCreatePin(userId) {
    const pin = (el("loginPin")?.value || "").trim();
    const confirm = (el("loginPinConfirm")?.value || "").trim();

    if (!isValidPin(pin)) {
      setPinError("Use a 4–6 digit PIN.");
      return false;
    }

    if (!hasPin(userId)) {
      if (pin !== confirm) {
        setPinError("PINs do not match.");
        return false;
      }
      const salt = randomSalt();
      const hash = await hashPin(pin, salt);
      pins[userId] = { hash, salt, updatedAt: Date.now() };
      persistPins();
      return true;
    }

    const record = pins[userId];
    const hash = await hashPin(pin, record.salt);
    if (hash !== record.hash) {
      setPinError("Incorrect PIN for this profile.");
      return false;
    }
    return true;
  }

  async function changeProfilePin() {
    const errorNode = el("changePinError");
    const successNode = el("changePinSuccess");
    const showError = (message) => {
      if (successNode) {
        successNode.textContent = "";
        successNode.classList.add("hidden");
      }
      if (!errorNode) return;
      if (!message) {
        errorNode.textContent = "";
        errorNode.classList.add("hidden");
        return;
      }
      errorNode.textContent = message;
      errorNode.classList.remove("hidden");
    };
    const showSuccess = (message) => {
      if (errorNode) {
        errorNode.textContent = "";
        errorNode.classList.add("hidden");
      }
      if (!successNode) return;
      successNode.textContent = message;
      successNode.classList.remove("hidden");
    };

    if (!sessionActorId || sessionActorId !== currentUserId) {
      showError("You can only change the PIN on your own signed-in profile.");
      return;
    }
    if (!hasPin(sessionActorId)) {
      showError("No PIN set yet. Sign out and create one on login.");
      return;
    }

    const currentPin = (el("currentPin")?.value || "").trim();
    const newPin = (el("newPin")?.value || "").trim();
    const confirmPin = (el("newPinConfirm")?.value || "").trim();

    if (!isValidPin(currentPin) || !isValidPin(newPin)) {
      showError("Use 4–6 digit PINs.");
      return;
    }
    if (newPin !== confirmPin) {
      showError("New PINs do not match.");
      return;
    }
    if (newPin === currentPin) {
      showError("New PIN must be different from the current PIN.");
      return;
    }

    const record = pins[sessionActorId];
    const currentHash = await hashPin(currentPin, record.salt);
    if (currentHash !== record.hash) {
      showError("Current PIN is incorrect.");
      return;
    }

    const salt = randomSalt();
    const hash = await hashPin(newPin, salt);
    pins[sessionActorId] = { hash, salt, updatedAt: Date.now() };
    persistPins();

    if (el("currentPin")) el("currentPin").value = "";
    if (el("newPin")) el("newPin").value = "";
    if (el("newPinConfirm")) el("newPinConfirm").value = "";
    showSuccess("PIN updated.");
  }

  function formatHours(value) {
    const hours = Number(value) || 0;
    const hasFraction = Math.abs(hours % 1) > 0.001;
    return hours.toLocaleString("en-GB", {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: hasFraction ? 1 : 0
    });
  }

  function localDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function startOfWeekMonday(date = new Date()) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    const day = d.getDay(); // 0 = Sunday
    const offset = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfWeekSunday(date = new Date()) {
    const start = startOfWeekMonday(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  function weekHoursForUser(userId, date = new Date()) {
    const weekStart = localDateKey(startOfWeekMonday(date));
    const weekEnd = localDateKey(endOfWeekSunday(date));
    return entries
      .filter((entry) =>
        entry.userId === userId &&
        !entry.cancelled &&
        entry.date >= weekStart &&
        entry.date <= weekEnd
      )
      .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  }

  function nextAvatarKey() {
    const used = new Set(users.map((user) => user.avatar).filter(Boolean));
    const unused = fallbackAvatars.filter((key) => !used.has(key));
    if (unused.length) return unused[0];
    // Fall back to least-used avatar so new users still get a matching robot icon.
    const counts = Object.fromEntries(fallbackAvatars.map((key) => [key, 0]));
    users.forEach((user) => {
      if (counts[user.avatar] !== undefined) counts[user.avatar] += 1;
    });
    return fallbackAvatars.sort((a, b) => counts[a] - counts[b])[0];
  }

  function getCurrentUser() {
    return users.find((user) => user.id === currentUserId);
  }

  function avatarSrc(user) {
    const key = user?.avatar || user?.id;
    const path = avatarFiles[key] || avatarFiles.scott;
    return `${path}?v=1.10.5`;
  }

  function renderRobot(target, user) {
    if (user && user.active === false) {
      const stoneId = `stone_${Math.random().toString(36).slice(2, 8)}`;
      target.innerHTML = `
        <svg class="tombstone-svg" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <linearGradient id="${stoneId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#9aa3a8"/>
              <stop offset="55%" stop-color="#6d757a"/>
              <stop offset="100%" stop-color="#3f464a"/>
            </linearGradient>
          </defs>
          <rect x="8" y="50" width="48" height="8" rx="2" fill="#4a5256"/>
          <path d="M18 50 V28 C18 16 46 16 46 28 V50 Z" fill="url(#${stoneId})" stroke="#2f3538" stroke-width="1.5"/>
          <path d="M26 34 H38 M28 40 H36" stroke="#2f3538" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="26" r="2.2" fill="#2f3538"/>
        </svg>
      `;
      return;
    }
    const src = typeof user === "string"
      ? `${avatarFiles[user] || avatarFiles.scott}?v=1.10.5`
      : avatarSrc(user);
    const name = typeof user === "object" && user?.name ? user.name : "Crew";
    target.innerHTML = `<img class="robot-photo" src="${src}" alt="${escapeHtml(name)} robot avatar">`;
  }

  function populateTimes() {
    let options = "";
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        options += `<option value="${value}">${value}</option>`;
      }
    }
    el("startTime").innerHTML = options;
    el("finishTime").innerHTML = options;
    el("startTime").value = "08:00";
    el("finishTime").value = "17:00";
  }

  function calculateHours() {
    const [startHour, startMinute] = el("startTime").value.split(":").map(Number);
    const [finishHour, finishMinute] = el("finishTime").value.split(":").map(Number);
    let minutes = (finishHour * 60 + finishMinute) - (startHour * 60 + startMinute);
    if (minutes < 0) minutes += 24 * 60;
    const hours = minutes / 60;
    el("calculatedHours").textContent = formatHours(hours);
    return hours;
  }

  function availableMonths() {
    const monthSet = new Set(entries.map((entry) => entry.date.slice(0, 7)));
    const now = new Date();
    monthSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    return [...monthSet].sort().reverse();
  }

  function monthLabel(month) {
    const [year, monthNumber] = month.split("-");
    return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric"
    });
  }

  function populateMonthSelect(select, selected) {
    if (!select) return;
    const months = availableMonths();
    const existing = [...select.options].map((option) => option.value).join("|");
    const next = months.join("|");
    if (existing !== next) {
      select.innerHTML = months.map((month) => `<option value="${month}">${monthLabel(month)}</option>`).join("");
    }
    select.value = months.includes(selected) ? selected : months[0] || "";
  }

  function showView(viewId) {
    const previousView = document.querySelector(".view.active")?.id || "";
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    document.querySelectorAll("#topNav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    el("topNav").classList.toggle(
      "hidden",
      viewId === "loginView" || viewId === "addHoursView" || viewId === "completeJobView"
    );
    updateBrandTheme();
    updateSwitchProfileVisibility();
    if (viewId === "calendarView") {
      window.PMHCalendar?.show?.();
    }
    if (viewId === "allJobsView" && jobsViewDirty) {
      try {
        renderAllJobs();
        jobsViewDirty = false;
      } catch (error) {
        console.error("Failed to render My Jobs", error);
      }
    }
    // Only jump to top when the user actually changes screen — not on cloud refreshes.
    if (previousView && previousView !== viewId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderLogin() {
    const activeUsers = users.filter((user) => isUserActive(user));
    const heading = el("loginHeading");
    const intro = el("loginIntro");
    const cancelSwitch = el("cancelSwitchButton");

    if (heading) {
      heading.textContent = loginMode === "switch" ? "Switch profile" : "Select Team Member";
    }
    if (intro) {
      intro.textContent = loginMode === "switch"
        ? "Scott and Ronnie can open other profiles from here."
        : "Enter your PIN once on this phone. You’ll stay signed in until you tap Sign out.";
    }

    el("loginUser").innerHTML = activeUsers.length
      ? activeUsers.map((user) => {
          const roleNote = user.role === "Owner" ? ` (${user.role})` : "";
          return `<option value="${user.id}">${escapeHtml(user.name)}${escapeHtml(roleNote)}</option>`;
        }).join("")
      : '<option value="" disabled selected>No active users</option>';

    const preferredId = loginMode === "switch" ? currentUserId : (sessionActorId || currentUserId);
    if (preferredId && activeUsers.some((user) => user.id === preferredId)) {
      el("loginUser").value = preferredId;
    } else if (activeUsers.length) {
      el("loginUser").value = activeUsers[0].id;
    }

    if (cancelSwitch) cancelSwitch.classList.toggle("hidden", loginMode !== "switch");
    updatePinPanel();
  }

  function renderSummary() {
    const user = getCurrentUser();
    if (!user) return;

    const editable = canEditCurrentProfile();
    const actor = getActor();
    const signOutButton = el("signOutButton");
    const addHoursButton = el("openAddHoursButton");
    const changePinPanel = el("changePinPanel");
    const viewOnlyBanner = el("viewOnlyBanner");

    el("summaryUserName").textContent = user.name;
    el("summaryRole").textContent = user.role;
    renderRobot(el("summaryRobot"), user);
    el("summaryRobot")?.classList.remove("avatar-owner");
    updateBrandTheme();

    updateSwitchProfileVisibility();
    if (signOutButton) {
      signOutButton.classList.remove("hidden");
      signOutButton.hidden = false;
    }
    if (addHoursButton) addHoursButton.classList.toggle("hidden", !editable);
    if (changePinPanel) {
      changePinPanel.classList.toggle("hidden", !(sessionActorId && sessionActorId === currentUserId));
    }
    if (viewOnlyBanner) {
      const showBanner = Boolean(actor && currentUserId === "scott" && actor.id !== "scott");
      viewOnlyBanner.classList.toggle("hidden", !showBanner);
      if (showBanner) {
        viewOnlyBanner.textContent = "View only — Scott’s profile can’t be edited.";
      }
    }

    const selectedMonth = el("summaryMonth").value || availableMonths()[0];
    populateMonthSelect(el("summaryMonth"), selectedMonth);
    const month = el("summaryMonth").value;

    const userEntries = entries
      .filter((entry) => entry.userId === user.id && entry.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date));

    const activeEntries = userEntries.filter((entry) => !entry.cancelled);
    const hours = activeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const mileage = activeEntries.reduce((sum, entry) => sum + Number(entry.mileage || 0), 0);
    const weeklyHours = weekHoursForUser(user.id);

    if (el("weeklyHours")) el("weeklyHours").textContent = formatHours(weeklyHours);
    el("monthlyHours").textContent = formatHours(hours);
    el("monthlyMileage").textContent = `${mileage.toFixed(0)} miles`;
    el("monthlyJobsHeading").textContent = `${monthLabel(month)} Jobs`;

    el("myEntries").innerHTML = userEntries.length
      ? userEntries.map((entry) => {
          const label = entry.job === "STORE" ? "STORE" : `#${entry.job}`;
          const typeClass = entry.job === "STORE" ? "store" : "job";
          if (entry.cancelled) {
            return `<article class="entry ${typeClass} cancelled">
              <div class="entry-head">
                <div>
                  <strong>${label}<span class="status">Cancelled</span></strong>
                  <div class="entry-meta">${formatDate(entry.date)} · ${entry.start}–${entry.finish}</div>
                  ${entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : ""}
                </div>
                <strong class="entry-hours"><s>${formatHours(entry.hours)} hrs</s></strong>
              </div>
              <div class="entry-meta"><s>Mileage: ${Number(entry.mileage || 0).toFixed(0)} miles</s></div>
              <div class="entry-meta">Excluded from totals</div>
            </article>`;
          }
          return `<article class="entry ${typeClass}">
            <div class="entry-head">
              <div>
                <strong>${label}</strong>
                <div class="entry-meta">${formatDate(entry.date)} · ${entry.start}–${entry.finish}</div>
                ${entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : ""}
              </div>
              <strong class="entry-hours">${formatHours(entry.hours)} hrs</strong>
            </div>
            <div class="entry-meta">Mileage: ${Number(entry.mileage || 0).toFixed(0)} miles</div>
            ${editable ? `<div class="entry-actions">
              <button class="button subtle edit-entry" data-id="${entry.id}">Edit</button>
              <button class="button subtle cancel-entry" data-id="${entry.id}">Cancel Entry</button>
            </div>` : '<div class="entry-meta">View only</div>'}
          </article>`;
        }).join("")
      : '<p class="muted">No entries recorded for this month.</p>';

    document.querySelectorAll(".edit-entry").forEach((button) => {
      button.addEventListener("click", () => openEditEntry(button.dataset.id));
    });
    document.querySelectorAll(".cancel-entry").forEach((button) => {
      button.addEventListener("click", () => cancelEntry(button.dataset.id));
    });
  }

  function formatDate(date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  const BASE_POSTCODE = "AB42 1UA";
  const geoCache = {};
  let mileageRequestId = 0;

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

  function extractUkPostcode(text) {
    const raw = String(text || "").toUpperCase().replace(/\s+/g, " ");
    const match = raw.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/);
    if (!match) return "";
    return `${match[1]} ${match[2]}`;
  }

  function normalizePostcodeKey(postcode) {
    return String(postcode || "").toUpperCase().replace(/\s+/g, "");
  }

  function haversineMiles(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const earthRadiusMiles = 3958.7613;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
  }

  async function lookupPostcode(postcode) {
    const key = normalizePostcodeKey(postcode);
    if (!key) return null;
    if (geoCache[key]) return geoCache[key];
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(key)}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 200 || !data.result) return null;
    const coords = {
      postcode: data.result.postcode,
      latitude: data.result.latitude,
      longitude: data.result.longitude
    };
    geoCache[key] = coords;
    return coords;
  }

  function setMileageHint(message) {
    const hint = el("mileageHint");
    if (hint) hint.textContent = message;
  }

  function postcodeForJob(jobCode) {
    const code = String(jobCode || "");
    if (!code || code === "STORE") return "";
    const calendarEvents = window.PMHCalendar?.getEvents?.() || [];
    for (const event of calendarEvents) {
      const title = event.summary || "";
      const description = String(event.description || "").replace(/<[^>]+>/g, " ");
      const location = event.location || "";
      const eventCode = extractJobNumber(`${title} ${description}`);
      if (eventCode !== code) continue;
      const fromLocation = extractUkPostcode(location);
      if (fromLocation) return fromLocation;
      const fromDescription = extractUkPostcode(description);
      if (fromDescription) return fromDescription;
      const fromTitle = extractUkPostcode(title);
      if (fromTitle) return fromTitle;
    }
    return "";
  }

  async function applyAutoMileage(jobCode) {
    const requestId = ++mileageRequestId;
    const code = String(jobCode || "").toUpperCase();

    if (!code) {
      el("mileage").value = "";
      setMileageHint("Round trip from AB42 1UA is filled when a job postcode is found.");
      return;
    }

    if (code === "STORE") {
      el("mileage").value = "0";
      setMileageHint("STORE — no site travel (0 miles).");
      return;
    }

    const jobPostcode = postcodeForJob(code);
    if (!jobPostcode) {
      el("mileage").value = "";
      setMileageHint(`No postcode found on calendar for #${code}. Enter mileage manually.`);
      return;
    }

    setMileageHint(`Calculating round trip AB42 1UA ↔ ${jobPostcode}…`);
    try {
      const [base, destination] = await Promise.all([
        lookupPostcode(BASE_POSTCODE),
        lookupPostcode(jobPostcode)
      ]);
      if (requestId !== mileageRequestId) return;
      if (!base || !destination) {
        el("mileage").value = "";
        setMileageHint(`Could not look up ${jobPostcode}. Enter mileage manually.`);
        return;
      }
      const oneWay = haversineMiles(
        base.latitude,
        base.longitude,
        destination.latitude,
        destination.longitude
      );
      const roundTrip = Math.round(oneWay * 2);
      el("mileage").value = String(roundTrip);
      setMileageHint(
        `Auto ${roundTrip} miles round trip: ${base.postcode} ↔ ${destination.postcode} (you can edit).`
      );
    } catch {
      if (requestId !== mileageRequestId) return;
      el("mileage").value = "";
      setMileageHint("Mileage lookup failed. Enter miles manually.");
    }
  }

  function collectJobOptions() {
    const byCode = new Map();

    const calendarEvents = window.PMHCalendar?.getEvents?.() || [];
    calendarEvents.forEach((event) => {
      const title = event.summary || "";
      const description = String(event.description || "").replace(/<[^>]+>/g, " ");
      const location = event.location || "";
      const code = extractJobNumber(`${title} ${description}`);
      if (!code) return;
      const postcode =
        extractUkPostcode(location) ||
        extractUkPostcode(description) ||
        extractUkPostcode(title) ||
        "";
      const label = title.trim()
        ? (postcode ? `#${code} · ${title.trim()} · ${postcode}` : `#${code} · ${title.trim()}`)
        : `#${code}`;
      const existing = byCode.get(code);
      if (!existing || (postcode && !existing.postcode) || (title && !String(existing.label).includes("·"))) {
        byCode.set(code, { value: code, label, source: "calendar", postcode });
      }
    });

    entries.forEach((entry) => {
      const code = String(entry.job || "").toUpperCase();
      if (!code || code === "STORE") return;
      if (!/^\d{3,5}$/.test(code)) return;
      if (!byCode.has(code)) {
        byCode.set(code, { value: code, label: `#${code}`, source: "entries", postcode: "" });
      }
    });

    return [...byCode.values()].sort((a, b) => Number(a.value) - Number(b.value));
  }

  function populateJobSelect(selected = "") {
    const select = el("jobNumber");
    if (!select) return;
    const wanted = String(selected || "").toUpperCase();
    const jobs = collectJobOptions();

    const options = [
      '<option value="">Select a job…</option>',
      '<option value="STORE">STORE</option>',
      ...jobs.map((job) => `<option value="${escapeHtml(job.value)}">${escapeHtml(job.label)}</option>`)
    ];

    if (wanted && wanted !== "STORE" && !jobs.some((job) => job.value === wanted)) {
      options.push(`<option value="${escapeHtml(wanted)}">#${escapeHtml(wanted)}</option>`);
    }

    select.innerHTML = options.join("");
    if (wanted && [...select.options].some((opt) => opt.value === wanted)) {
      select.value = wanted;
    } else {
      select.value = "";
    }
  }

  function collectCalendarJobOptions() {
    const byCode = new Map();
    const calendarEvents = window.PMHCalendar?.getEvents?.() || [];

    calendarEvents.forEach((event) => {
      const title = event.summary || "";
      const description = String(event.description || "").replace(/<[^>]+>/g, " ");
      const location = event.location || "";
      const code = extractJobNumber(`${title} ${description}`);
      if (!code) return;
      const postcode =
        extractUkPostcode(location) ||
        extractUkPostcode(description) ||
        extractUkPostcode(title) ||
        "";
      const label = title.trim()
        ? (postcode ? `#${code} · ${title.trim()} · ${postcode}` : `#${code} · ${title.trim()}`)
        : `#${code}`;
      const existing = byCode.get(code);
      if (!existing || (postcode && !existing.postcode) || (title && !String(existing.label).includes("·"))) {
        byCode.set(code, { value: code, label, postcode });
      }
    });

    return [...byCode.values()].sort((a, b) => Number(a.value) - Number(b.value));
  }

  function populateAllJobsSearch(selected = "") {
    const select = el("jobSearch");
    const hint = el("jobSearchHint");
    if (!select) return;

    const wanted = String(selected || "").replace("#", "").trim();
    const jobs = collectCalendarJobOptions();
    const nextSignature = ["", ...jobs.map((job) => `${job.value}:${job.label}`)].join("|");
    const existingSignature = [...select.options].map((opt) => `${opt.value}:${opt.textContent}`).join("|");
    if (existingSignature !== nextSignature) {
      select.innerHTML = [
        '<option value="">All calendar jobs</option>',
        ...jobs.map((job) => `<option value="${escapeHtml(job.value)}">${escapeHtml(job.label)}</option>`)
      ].join("");
    }
    if (wanted && [...select.options].some((opt) => opt.value === wanted)) {
      select.value = wanted;
    } else {
      select.value = "";
    }

    if (hint) {
      hint.textContent = jobs.length
        ? "Dropdown shows job numbers found on the calendar only."
        : "No calendar jobs found yet — connect/refresh Calendar to populate this list.";
    }
  }

  function resetEntryForm() {
    el("editingEntryId").value = "";
    el("entryFormTitle").textContent = "Add Hours";
    el("entryDate").value = new Date().toISOString().slice(0, 10);
    populateJobSelect("");
    el("startTime").value = "08:00";
    el("finishTime").value = "17:00";
    el("mileage").value = "";
    el("notes").value = "";
    setMileageHint("Round trip from AB42 1UA is filled when a job postcode is found.");
    calculateHours();
  }

  function openEditEntry(entryId) {
    if (!canEditCurrentProfile()) {
      alert("You can’t edit this profile.");
      return;
    }
    const entry = entries.find((item) => item.id === entryId && item.userId === currentUserId);
    if (!entry) return;
    el("editingEntryId").value = entry.id;
    el("entryFormTitle").textContent = "Edit Entry";
    el("entryDate").value = entry.date;
    populateJobSelect(entry.job);
    el("startTime").value = entry.start;
    el("finishTime").value = entry.finish;
    el("mileage").value = entry.mileage || "";
    el("notes").value = entry.notes || "";
    setMileageHint("Saved mileage shown. Change job to recalculate from AB42 1UA.");
    calculateHours();
    showView("addHoursView");
  }

  function cancelEntry(entryId) {
    if (!canEditCurrentProfile()) {
      alert("You can’t edit this profile.");
      return;
    }
    const entry = entries.find((item) => item.id === entryId && item.userId === currentUserId);
    if (!entry) return;
    if (!confirm("Cancel this entry? Its hours and mileage will be excluded from totals.")) return;
    entry.cancelled = true;
    saveAll();
    renderAll();
  }

  function saveEntry() {
    if (!canEditCurrentProfile()) {
      alert("You can’t edit this profile.");
      return;
    }
    const jobValue = el("jobNumber").value.trim().toUpperCase();
    if (!(jobValue === "STORE" || /^\d{3,5}$/.test(jobValue))) {
      alert("Select a job number from the list, or STORE.");
      return;
    }

    const hours = calculateHours();
    if (hours <= 0) {
      alert("Enter a valid start and finish time.");
      return;
    }

    const entry = {
      id: el("editingEntryId").value || uid("entry"),
      userId: currentUserId,
      date: el("entryDate").value,
      job: jobValue,
      start: el("startTime").value,
      finish: el("finishTime").value,
      hours,
      mileage: Number(el("mileage").value || 0),
      notes: el("notes").value.trim(),
      cancelled: false
    };

    const existingIndex = entries.findIndex((item) => item.id === entry.id);
    if (existingIndex >= 0) entries[existingIndex] = entry;
    else entries.push(entry);

    saveAll();
    resetEntryForm();
    renderAll();
    showView("summaryView");
  }

  function renderPendingPhotoPreview() {
    const preview = el("completeJobPhotoPreview");
    if (!preview) return;
    if (!pendingPhotos.length) {
      preview.innerHTML = '<p class="muted">No photos selected yet.</p>';
      return;
    }
    preview.innerHTML = pendingPhotos.map((file, index) => {
      const url = URL.createObjectURL(file);
      return `<figure class="photo-thumb">
        <img src="${url}" alt="Job photo ${index + 1}">
        <button type="button" class="button subtle remove-pending-photo" data-index="${index}">Remove</button>
      </figure>`;
    }).join("");
    preview.querySelectorAll(".remove-pending-photo").forEach((button) => {
      button.addEventListener("click", () => {
        pendingPhotos.splice(Number(button.dataset.index), 1);
        renderPendingPhotoPreview();
      });
    });
  }

  async function renderJobPhotos(container, date, jobCode) {
    if (!container) return;
    const key = jobKey(date, jobCode);
    try {
      const photos = await listPhotosForJob(key);
      if (!photos.length) {
        container.innerHTML = '<p class="muted">No photos attached.</p>';
        return;
      }
      container.innerHTML = photos.map((photo) => {
        const url = URL.createObjectURL(photo.blob);
        return `<figure class="photo-thumb">
          <img src="${url}" alt="${escapeHtml(photo.name)}">
          <a class="button subtle" href="${url}" download="${escapeHtml(photo.name)}">Download</a>
        </figure>`;
      }).join("");
    } catch {
      container.innerHTML = '<p class="muted">Could not load photos on this device.</p>';
    }
  }

  function photoKeysForJobNumber(jobCode) {
    const code = String(jobCode || "").toUpperCase();
    if (!code || code === "STORE") return [];
    const keys = new Set();
    Object.values(completedJobs).forEach((row) => {
      if (String(row?.job || "").toUpperCase() === code && row?.date) {
        keys.add(jobKey(row.date, code));
      }
    });
    entries
      .filter((entry) => String(entry.job || "").toUpperCase() === code)
      .forEach((entry) => keys.add(jobKey(entry.date, code)));
    return [...keys];
  }

  async function listPhotosForJobNumber(jobCode) {
    const keys = photoKeysForJobNumber(jobCode);
    const all = [];
    for (const key of keys) {
      const photos = await listPhotosForJob(key);
      all.push(...photos);
    }
    all.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    return all;
  }

  async function renderJobPhotosByNumber(container, jobCode) {
    if (!container) return;
    try {
      const photos = await listPhotosForJobNumber(jobCode);
      if (!photos.length) {
        container.innerHTML = '<p class="muted">No photos attached yet. Use Add photos to attach site photos from this phone.</p>';
        return;
      }
      container.innerHTML = photos.map((photo) => {
        const url = URL.createObjectURL(photo.blob);
        return `<figure class="photo-thumb">
          <img src="${url}" alt="${escapeHtml(photo.name)}">
          <a class="button subtle" href="${url}" download="${escapeHtml(photo.name)}">Download</a>
        </figure>`;
      }).join("");
    } catch {
      container.innerHTML = '<p class="muted">Could not load photos on this device.</p>';
    }
  }

  function latestCompletedMetaForJob(jobCode) {
    const code = String(jobCode || "").toUpperCase();
    if (!code) return null;
    return Object.values(completedJobs)
      .filter((row) => String(row?.job || "").toUpperCase() === code)
      .sort((a, b) => Number(b?.completedAt || 0) - Number(a?.completedAt || 0))[0] || null;
  }

  function resolveCompletedJobKey(date, jobCode) {
    const code = String(jobCode || "").toUpperCase();
    if (!code || code === "STORE") return "";
    if (date && isJobComplete(date, code)) return jobKey(date, code);
    const meta = latestCompletedMetaForJob(code);
    if (meta?.date) return jobKey(meta.date, code);
    if (date) return jobKey(date, code);
    return "";
  }

  function selectedVisitType() {
    const active = document.querySelector(".visit-type-button.is-selected");
    return active?.dataset?.visitType || "";
  }

  function setVisitTypeSelection(visitType) {
    document.querySelectorAll(".visit-type-button").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.visitType === visitType);
    });
    const hint = el("completeVisitTypeHint");
    const confirmBtn = el("confirmCompleteJobButton");
    if (!hint || !confirmBtn) return;
    if (visitType === "delivery") {
      hint.textContent = "Delivery: this visit is finished. The job stays open on the calendar for collection.";
      confirmBtn.textContent = "Mark delivery complete";
    } else if (visitType === "collection") {
      hint.textContent = "Collection: finishes the whole job. All visit hours are consolidated and it moves to Completed.";
      confirmBtn.textContent = "Mark collection complete";
    } else if (visitType === "event_operator") {
      hint.textContent = "Event Operator: on-site cover (e.g. photobooth). Marks this job fully complete.";
      confirmBtn.textContent = "Mark Event Operator complete";
    } else {
      hint.textContent = "Choose Delivery, Collection, or Event Operator first.";
      confirmBtn.textContent = "Mark complete";
    }
  }

  function renderCrewListHtml(crewRows, heading = "") {
    if (!crewRows.length) return "";
    const headingHtml = heading ? `<p class="muted job-select-hint">${escapeHtml(heading)}</p>` : "";
    return `${headingHtml}${crewRows
      .map(
        (row) => `
      <div class="job-person">
        <span>${escapeHtml(row.name)}</span>
        <strong>${formatHours(row.hours)} hrs · ${Number(row.mileage || 0).toFixed(0)} miles</strong>
      </div>`
      )
      .join("")}`;
  }

  function openCompleteJob(date, jobCode) {
    if (!canEditCurrentProfile()) {
      alert("You can’t edit this profile.");
      return;
    }
    if (String(jobCode).toUpperCase() === "STORE") {
      alert("STORE does not use calendar completion.");
      return;
    }
    if (isJobComplete(date, jobCode)) {
      openAddPhotosForJob(date, jobCode, "allJobsView");
      return;
    }
    const crew = crewHoursForJob(date, jobCode);
    if (!crew.length) {
      alert("No active hours found for this job.");
      return;
    }

    const summary = getJobHoursSummary(jobCode);
    pendingComplete = {
      date,
      job: String(jobCode).toUpperCase(),
      mode: "complete",
      returnView: "allJobsView",
      visitType: ""
    };
    pendingPhotos = [];
    el("completeJobTitle").textContent = `Complete #${pendingComplete.job}`;
    el("completeJobSummary").textContent =
      `${formatDate(date)} · Choose Delivery or Collection. Hours already logged by anyone on this job are kept and consolidated.`;
    el("completeJobCrew").innerHTML = renderCrewListHtml(
      crew,
      "Hours on this visit (today’s date):"
    );
    const allCrew = el("completeJobAllCrew");
    if (allCrew) {
      if (summary.visits.length > 1) {
        allCrew.classList.remove("hidden");
        allCrew.innerHTML = `
          <p class="muted job-select-hint">All visits so far for #${escapeHtml(pendingComplete.job)} · ${formatHours(summary.totalHours)} hrs total:</p>
          ${summary.visits
            .map(
              (visit) => `
            <div class="job-person">
              <span>${escapeHtml(visit.date)}${visit.crew.length ? ` · ${escapeHtml(visit.crew.map((row) => row.name).join(", "))}` : ""}</span>
              <strong>${formatHours(visit.hours)} hrs</strong>
            </div>`
            )
            .join("")}`;
      } else {
        allCrew.classList.add("hidden");
        allCrew.innerHTML = "";
      }
    }
    const typePanel = el("completeVisitTypePanel");
    if (typePanel) typePanel.classList.remove("hidden");
    setVisitTypeSelection("");
    const existing = el("completeJobExistingPhotos");
    if (existing) {
      existing.classList.add("hidden");
      existing.innerHTML = "";
    }
    if (el("completeJobPhotoHint")) {
      el("completeJobPhotoHint").textContent = "Add site photos for this visit (optional but recommended).";
    }
    if (el("completeJobPhotos")) el("completeJobPhotos").value = "";
    if (el("completeJobCamera")) el("completeJobCamera").value = "";
    el("completeJobStatus").textContent = window.PMHCalendar?.isConnected?.()
      ? "Google connected — collection completion can update the calendar booking with all crew hours."
      : "Google not connected — job can still be completed; connect Calendar to write hours onto the booking.";
    renderPendingPhotoPreview();
    showView("completeJobView");
  }

  function openAddPhotosForJob(date, jobCode, returnView = "allJobsView") {
    if (!canEditCurrentProfile()) {
      alert("You can’t edit this profile.");
      return;
    }
    const code = String(jobCode || "").toUpperCase();
    if (!code || code === "STORE") {
      alert("STORE does not use job photos.");
      return;
    }

    const key = resolveCompletedJobKey(date, code);
    if (!key || !completedJobs[key]) {
      alert("Mark this job complete first, then you can add photos.");
      return;
    }

    const meta = completedJobs[key];
    pendingComplete = {
      date: meta.date || date,
      job: code,
      mode: "photos",
      returnView: returnView || "allJobsView",
      key
    };
    pendingPhotos = [];
    el("completeJobTitle").textContent = `Add photos · #${code}`;
    el("completeJobSummary").textContent =
      `${formatDate(meta.date || date)} · Add photos now if none were taken when the job was marked complete.`;
    el("completeJobCrew").innerHTML = "";
    const allCrew = el("completeJobAllCrew");
    if (allCrew) {
      allCrew.classList.add("hidden");
      allCrew.innerHTML = "";
    }
    const typePanel = el("completeVisitTypePanel");
    if (typePanel) typePanel.classList.add("hidden");
    const existing = el("completeJobExistingPhotos");
    if (existing) {
      existing.classList.remove("hidden");
      renderJobPhotosByNumber(existing, code);
    }
    if (el("completeJobPhotoHint")) {
      el("completeJobPhotoHint").textContent = "Take or upload more site photos. They are saved on this phone.";
    }
    if (el("confirmCompleteJobButton")) {
      el("confirmCompleteJobButton").textContent = "Save photos";
    }
    if (el("completeJobPhotos")) el("completeJobPhotos").value = "";
    if (el("completeJobCamera")) el("completeJobCamera").value = "";
    el("completeJobStatus").textContent = meta.photoCount
      ? `${meta.photoCount} photo(s) already saved on this phone.`
      : "No photos saved yet for this job on this phone.";
    renderPendingPhotoPreview();
    showView("completeJobView");
  }

  function addPendingPhotos(fileList) {
    const files = [...(fileList || [])].filter((file) => file && file.type.startsWith("image/"));
    if (!files.length) return;
    pendingPhotos = pendingPhotos.concat(files);
    renderPendingPhotoPreview();
  }

  async function confirmAddPhotosOnly() {
    if (!pendingComplete || pendingComplete.mode !== "photos") return;
    const { date, job, key: knownKey, returnView } = pendingComplete;
    const key = knownKey || jobKey(date, job);
    const status = el("completeJobStatus");
    const button = el("confirmCompleteJobButton");

    if (!pendingPhotos.length) {
      if (status) status.textContent = "Choose at least one photo to save.";
      return;
    }

    if (button) button.disabled = true;
    if (status) status.textContent = "Saving photos…";

    try {
      const photoIds = await savePhotosForJob(key, pendingPhotos);
      if (completedJobs[key]) {
        completedJobs[key] = {
          ...completedJobs[key],
          photoCount: Number(completedJobs[key].photoCount || 0) + photoIds.length
        };
        saveAll();
      }

      pendingComplete = null;
      pendingPhotos = [];
      renderAll();
      showView(returnView || "allJobsView");
      if (returnView === "calendarView") {
        window.PMHCalendar?.show?.();
      }
      alert(`Saved ${photoIds.length} photo(s) for #${job}.`);
    } catch (error) {
      if (status) status.textContent = error.message || "Could not save photos.";
      alert(error.message || "Could not save photos.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function confirmCompleteJob() {
    if (!pendingComplete || !currentUserId) return;
    if (pendingComplete.mode === "photos") {
      await confirmAddPhotosOnly();
      return;
    }

    const { date, job } = pendingComplete;
    const visitType = selectedVisitType() || pendingComplete.visitType || "";
    const key = jobKey(date, job);
    const completer = getCurrentUser();
    const status = el("completeJobStatus");
    const button = el("confirmCompleteJobButton");

    if (!["delivery", "collection", "event_operator"].includes(visitType)) {
      if (status) status.textContent = "Choose Delivery, Collection, or Event Operator first.";
      return;
    }

    if (!pendingPhotos.length) {
      const proceed = window.confirm(
        "No photos selected. Continue without photos?"
      );
      if (!proceed) {
        if (status) status.textContent = "Add photos with the picker above, then continue.";
        return;
      }
    }

    if (button) button.disabled = true;
    if (status) status.textContent = "Saving…";

    try {
      const photoIds = await savePhotosForJob(key, pendingPhotos);
      const calendarEvent = window.PMHCalendar?.findEventForJob?.(job, date) || null;
      let calendarUpdated = false;
      let calendarError = "";
      const finishesJob = visitType === "collection" || visitType === "event_operator";
      const shouldUpdateCalendar =
        finishesJob &&
        calendarEvent &&
        window.PMHCalendar?.isConnected?.();

      if (shouldUpdateCalendar) {
        try {
          const block = buildCalendarHoursBlock(date, job, completer?.name || "Crew");
          await window.PMHCalendar.writeCrewHoursToEvent(calendarEvent.id, block);
          calendarUpdated = true;
        } catch (error) {
          calendarError = error.message || "Calendar update failed.";
        }
      } else if (finishesJob && !calendarEvent) {
        calendarError = "No matching calendar booking found for this job number.";
      } else if (finishesJob && !window.PMHCalendar?.isConnected?.()) {
        calendarError = "Connect Google Calendar to push hours onto the booking.";
      }

      completedJobs[key] = {
        job,
        date,
        visitType,
        completedAt: Date.now(),
        completedBy: currentUserId,
        calendarEventId: calendarEvent?.id || "",
        calendarUpdated,
        photoCount: photoIds.length
      };
      saveAll();

      pendingComplete = null;
      pendingPhotos = [];
      renderAll();
      showView("allJobsView");

      if (visitType === "delivery") {
        alert("Delivery marked complete. Job stays open on the calendar until collection is marked complete.");
      } else if (visitType === "event_operator") {
        alert(
          calendarUpdated
            ? "Event Operator marked complete. Hours were consolidated onto the calendar booking."
            : `Event Operator marked complete.${calendarError ? ` Calendar note: ${calendarError}` : ""}`
        );
      } else if (calendarUpdated) {
        alert("Collection marked complete. All visit hours were consolidated onto the calendar booking.");
      } else if (visitType === "collection") {
        alert(`Job marked complete.${calendarError ? ` Calendar note: ${calendarError}` : ""}`);
      } else {
        alert("Visit marked complete.");
      }
    } catch (error) {
      if (status) status.textContent = error.message || "Could not complete job.";
      alert(error.message || "Could not complete job.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function jobSiteDetails(jobCode, date = "") {
    try {
      const code = String(jobCode || "").toUpperCase();
      if (!code || code === "STORE") {
        return { name: "", address: "" };
      }
      const event = window.PMHCalendar?.findEventForJob?.(code, date) || null;
      if (!event) return { name: "", address: "" };

      const summary = String(event.summary || "").trim();
      const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Titles are usually "#186 - Customer - Place" — strip the leading job number for a cleaner name.
      let name = summary
        .replace(new RegExp(`^#?\\s*${escaped}\\s*[-–—:]\\s*`, "i"), "")
        .replace(new RegExp(`^job\\s*#?\\s*${escaped}\\s*[-–—:]\\s*`, "i"), "")
        .trim();
      if (!name || name === summary) {
        name = summary.replace(/^#\d{3,5}\s*[-–—:]?\s*/i, "").trim() || summary;
      }
      const address = String(event.location || "").trim();
      return { name, address };
    } catch {
      return { name: "", address: "" };
    }
  }

  function renderAllJobs() {
    const selectedMonth = el("allJobsMonth").value || availableMonths()[0];
    populateMonthSelect(el("allJobsMonth"), selectedMonth);
    const previousJobFilter = el("jobSearch")?.value || "";
    populateAllJobsSearch(previousJobFilter);
    const month = el("allJobsMonth").value;
    const jobFilter = (el("jobSearch")?.value || "").trim().toUpperCase();
    const userId = currentUserId;

    if (!userId) {
      el("allJobsList").innerHTML = '<p class="muted">Enter your Profile to see jobs you have logged.</p>';
      return;
    }

    const grouped = {};
    entries
      .filter((entry) => entry.userId === userId)
      .filter((entry) => entry.date.startsWith(month))
      .filter((entry) => {
        if (!jobFilter) return true;
        return String(entry.job || "").toUpperCase() === jobFilter;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((entry) => {
        const key = `${entry.date}_${entry.job}`;
        if (!grouped[key]) grouped[key] = { date: entry.date, job: entry.job, entries: [] };
        grouped[key].entries.push(entry);
      });

    const jobs = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));

    el("allJobsList").innerHTML = jobs.length
      ? jobs.map((job) => {
          const activeEntries = job.entries.filter((entry) => !entry.cancelled);
          const cancelledEntries = job.entries.filter((entry) => entry.cancelled);
          const allCancelled = activeEntries.length === 0 && cancelledEntries.length > 0;
          const totalHours = activeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
          const totalMiles = activeEntries.reduce((sum, entry) => sum + Number(entry.mileage || 0), 0);
          const label = job.job === "STORE" ? "STORE" : `#${job.job}`;
          const typeClass = job.job === "STORE" ? "store" : "job";
          const complete = isJobComplete(job.date, job.job);
          const completeMeta = complete ? completedJobs[jobKey(job.date, job.job)] : null;
          const visitBadge = completeMeta?.visitType === "delivery"
            ? "Delivery done"
            : completeMeta?.visitType === "collection"
              ? "Collection done"
              : completeMeta?.visitType === "event_operator" || completeMeta?.visitType === "single"
                ? "Event Operator done"
                : "Complete";
          const crew = job.job === "STORE" ? [] : crewHoursForJob(job.date, job.job);
          const site = job.job === "STORE" ? { name: "", address: "" } : jobSiteDetails(job.job, job.date);
          const siteBits = [
            site.name ? `<div class="job-site-name">${escapeHtml(site.name)}</div>` : "",
            site.address ? `<div class="job-site-address">${escapeHtml(site.address)}</div>` : ""
          ].filter(Boolean).join("");
          return `<article class="job-card ${typeClass}${allCancelled ? " cancelled" : ""}${complete ? " job-complete" : ""}" data-job="${escapeHtml(job.job)}" data-date="${escapeHtml(job.date)}">
            <div class="job-header">
              <div>
                <h3>${label}${allCancelled ? '<span class="status">Cancelled</span>' : ""}${complete ? `<span class="status complete-badge">${escapeHtml(visitBadge)}</span>` : ""}</h3>
                ${siteBits}
                <div class="muted">${formatDate(job.date)}</div>
              </div>
              <strong>${allCancelled ? `<s>${formatHours(job.entries.reduce((sum, entry) => sum + Number(entry.hours), 0))} hrs</s>` : `${formatHours(totalHours)} hrs`}</strong>
            </div>
            ${job.entries.map((entry) => `
              <div class="job-person ${entry.cancelled ? "cancelled" : ""}">
                <span>${entry.cancelled ? "Cancelled" : `${entry.start}–${entry.finish}`}${entry.notes ? ` · ${escapeHtml(entry.notes)}` : ""}</span>
                <strong>${entry.cancelled ? `<s>${formatHours(entry.hours)} hrs · ${Number(entry.mileage || 0).toFixed(0)} miles</s>` : `${formatHours(entry.hours)} hrs · ${Number(entry.mileage || 0).toFixed(0)} miles`}</strong>
              </div>
            `).join("")}
            ${!allCancelled ? `<div class="entry-meta">Your total: ${formatHours(totalHours)} hrs · ${totalMiles.toFixed(0)} miles</div>` : '<div class="entry-meta">Excluded from totals</div>'}
            ${crew.length > 1 ? `<div class="entry-meta">Crew on this job: ${crew.map((row) => `${escapeHtml(row.name)} ${formatHours(row.hours)}h`).join(" · ")}</div>` : ""}
            ${complete ? `<div class="entry-meta">Completed${completeMeta?.calendarUpdated ? " · calendar updated" : ""}${completeMeta?.photoCount ? ` · ${completeMeta.photoCount} photo(s)` : " · no photos yet"}</div>
              <div class="job-photo-gallery" data-photo-job="${escapeHtml(job.job)}" data-photo-date="${escapeHtml(job.date)}"></div>
              ${canEditCurrentProfile() ? `<button type="button" class="button subtle small-action add-job-photos" data-job="${escapeHtml(job.job)}" data-date="${escapeHtml(job.date)}">Add photos</button>` : ""}`
              : ""}
            ${!allCancelled && !complete && job.job !== "STORE" && canEditCurrentProfile() ? `<button type="button" class="button primary small-action mark-complete-job" data-job="${escapeHtml(job.job)}" data-date="${escapeHtml(job.date)}">Mark complete</button>` : ""}
          </article>`;
        }).join("")
      : jobFilter
        ? `<p class="muted">No hours logged on #${escapeHtml(jobFilter)} for this month yet.</p>`
        : '<p class="muted">No jobs logged for this month yet. Add hours on a job to see it here.</p>';

    document.querySelectorAll(".mark-complete-job").forEach((button) => {
      button.addEventListener("click", () => openCompleteJob(button.dataset.date, button.dataset.job));
    });

    document.querySelectorAll(".add-job-photos").forEach((button) => {
      button.addEventListener("click", () => openAddPhotosForJob(button.dataset.date, button.dataset.job, "allJobsView"));
    });

    document.querySelectorAll(".job-photo-gallery").forEach((gallery) => {
      renderJobPhotos(gallery, gallery.dataset.photoDate, gallery.dataset.photoJob);
    });
  }

  function renderCrew() {
    const ownerActor = isOwner();
    const leaderboard = users
      .map((user) => {
        const recordedHours = entries
          .filter((entry) => entry.userId === user.id && !entry.cancelled)
          .reduce((sum, entry) => sum + Number(entry.hours), 0);
        return { ...user, allTimeHours: Number(user.seedHours || 0) + recordedHours };
      })
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return b.allTimeHours - a.allTimeHours;
      });

    el("crewLeaderboard").innerHTML = leaderboard.map((user, index) => `
      <div class="leaderboard-row ${user.active ? "" : "retired"}">
        <div class="rank">${index + 1}</div>
        <div class="robot-avatar robot-avatar-md ${user.active ? "" : "tombstone"}" data-user-id="${escapeHtml(user.id)}"></div>
        <div class="leaderboard-copy">
          <strong>${escapeHtml(user.name)}${user.role === "Owner" ? ` · ${escapeHtml(user.role)}` : ""}${user.active ? "" : '<span class="retired-badge">Retired</span>'}</strong>
          <div class="muted">${user.active ? "All-time total" : "Retired · history kept"}</div>
          ${user.active || !ownerActor ? "" : `<button type="button" class="button subtle reinstate-user" data-id="${escapeHtml(user.id)}">Reinstate</button>`}
        </div>
        <div class="leaderboard-hours">${formatHours(user.allTimeHours)}<span>hrs</span></div>
      </div>
    `).join("");

    document.querySelectorAll("#crewLeaderboard .robot-avatar").forEach((avatar) => {
      const user = users.find((item) => item.id === avatar.dataset.userId);
      if (user) renderRobot(avatar, user);
    });

    document.querySelectorAll(".reinstate-user").forEach((button) => {
      button.addEventListener("click", () => reinstateUser(button.dataset.id));
    });

    const addUserPanel = el("addUserPanel");
    const retirePanel = el("retireUserPanel");
    if (addUserPanel) addUserPanel.classList.toggle("hidden", !ownerActor);
    if (retirePanel) retirePanel.classList.toggle("hidden", !ownerActor);

    const retireable = users.filter((user) => user.active && user.id !== "scott");
    if (el("retireUserSelect")) {
      el("retireUserSelect").innerHTML = retireable.length
        ? retireable.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("")
        : '<option value="" disabled selected>No active users to retire</option>';
    }
  }

  function renderAll() {
    renderLogin();
    renderCrew();
    updateBrandTheme();
    updateSwitchProfileVisibility();
    if (currentUserId && findActiveUser(currentUserId)) {
      renderSummary();
      if (el("allJobsView")?.classList.contains("active")) {
        renderAllJobs();
        jobsViewDirty = false;
      } else {
        jobsViewDirty = true;
      }
    }
    if (el("calendarView")?.classList.contains("active")) {
      window.PMHCalendar?.render?.();
    }
  }

  function restoreSessionView() {
    const actor = findActiveUser(sessionActorId);
    if (!actor) return false;
    if (!currentUserId || !findActiveUser(currentUserId)) {
      currentUserId = sessionActorId;
      persistSession();
    }
    loginMode = "auth";
    renderAll();
    const activeView = document.querySelector(".view.active")?.id;
    if (!activeView || activeView === "loginView") {
      showView("summaryView");
    }
    return true;
  }

  function signOut() {
    sessionActorId = "";
    currentUserId = "";
    loginMode = "auth";
    persistSession();
    clearPinFields();
    renderAll();
    showView("loginView");
  }

  function openProfileSwitcher() {
    if (!canSwitchProfiles()) {
      updateSwitchProfileVisibility();
      return;
    }
    loginMode = "switch";
    renderLogin();
    showView("loginView");
  }

  function cancelProfileSwitch() {
    loginMode = "auth";
    if (sessionActorId && currentUserId) {
      renderAll();
      showView("summaryView");
      return;
    }
    renderLogin();
    showView("loginView");
  }

  function addUser() {
    if (!isOwner()) {
      alert("Only Scott can add users.");
      return;
    }
    const name = el("newUserName").value.trim();
    if (!name) {
      alert("Enter a name.");
      return;
    }
    if (users.some((user) => user.name.toLowerCase() === name.toLowerCase() && user.active)) {
      alert("That user already exists.");
      return;
    }

    const id = uid("user");
    const avatar = nextAvatarKey();
    users.push({
      id,
      name,
      active: true,
      role: "Team member",
      seedHours: 0,
      avatar
    });

    saveAll();
    el("newUserName").value = "";
    alert(`${name} added. They can set a PIN the first time they sign in on their phone.`);
    renderAll();
    showView("crewView");
  }

  function retireUser() {
    if (!isOwner()) {
      alert("Only Scott can retire users.");
      return;
    }
    const userId = el("retireUserSelect").value;
    const user = users.find((item) => item.id === userId);
    if (!user || !user.active) return;
    if (user.id === "scott") {
      alert("Scott can’t be retired.");
      return;
    }
    if (!confirm(`Retire ${user.name}? They will stay on the crew list greyed out with a tombstone, and can be reinstated later.`)) return;
    user.active = false;
    if (currentUserId === user.id) {
      currentUserId = sessionActorId || "scott";
      persistSession();
    }
    saveAll();
    renderAll();
    showView("summaryView");
  }

  function reinstateUser(userId) {
    if (!isOwner()) {
      alert("Only Scott can reinstate users.");
      return;
    }
    const user = users.find((item) => item.id === userId);
    if (!user || user.active) return;
    user.active = true;
    saveAll();
    renderAll();
  }

  async function initialize() {
    populateTimes();
    resetEntryForm();
    bindUi();

    // Restore signed-in session immediately from this phone — don't wait on cloud.
    const restoredEarly = restoreSessionView();
    if (!restoredEarly) {
      renderLogin();
      showView("loginView");
    }

    await ensureSeedPins();

    updateCloudStatus(window.PMHCloud?.getStatus?.() || {
      configured: false,
      message: "Cloud sync off"
    });

    if (window.PMHCloud?.start) {
      try {
        await window.PMHCloud.start({
          getState: () => ({ users, entries, pins, completedJobs }),
          setState: (state) => applyCloudState(state),
          onStatus: updateCloudStatus
        });
      } catch (error) {
        console.error("Cloud sync failed to start", error);
        updateCloudStatus({
          configured: true,
          ready: false,
          message: "Cloud sync retrying…",
          error: error.message || "Cloud start failed"
        });
      }
    }

    // After cloud sync, keep the local session unless that person was retired.
    if (sessionActorId) {
      const actor = findActiveUser(sessionActorId);
      if (actor) {
        restoreSessionView();
      } else if (users.some((user) => user.id === sessionActorId && user.active === false)) {
        sessionActorId = "";
        currentUserId = "";
        persistSession();
        renderLogin();
        showView("loginView");
      } else if (!restoredEarly) {
        // Session id exists but roster not ready — stay on login without wiping.
        renderLogin();
        showView("loginView");
      }
    }

    window.PMHCalendar?.bind?.();
  }

  function bindUi() {
    if (uiBound) return;
    uiBound = true;

    el("continueButton").addEventListener("click", async () => {
      const selectedId = el("loginUser").value;
      if (!selectedId) return;
      el("continueButton").disabled = true;
      try {
        if (loginMode === "switch") {
          if (!canSwitchProfiles()) {
            signOut();
            return;
          }
          currentUserId = selectedId;
          persistSession();
          loginMode = "auth";
          clearPinFields();
          renderAll();
          showView("summaryView");
          return;
        }

        const ok = await verifyOrCreatePin(selectedId);
        if (!ok) return;
        sessionActorId = selectedId;
        currentUserId = selectedId;
        persistSession();
        clearPinFields();
        jobsViewDirty = true;
        renderAll();
        showView("summaryView");
      } finally {
        el("continueButton").disabled = false;
      }
    });

    el("loginUser").addEventListener("change", updatePinPanel);
    const pinInputs = [el("loginPin"), el("loginPinConfirm")].filter(Boolean);
    pinInputs.forEach((input) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 6);
        setPinError("");
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") el("continueButton").click();
      });
    });

    el("changeUserButton")?.addEventListener("click", openProfileSwitcher);
    el("signOutButton")?.addEventListener("click", signOut);
    el("cancelSwitchButton")?.addEventListener("click", cancelProfileSwitch);
    el("addUserButton")?.addEventListener("click", addUser);
    el("retireUserButton")?.addEventListener("click", retireUser);

    el("changePinButton")?.addEventListener("click", () => {
      changeProfilePin();
    });
    ["currentPin", "newPin", "newPinConfirm"].forEach((id) => {
      el(id)?.addEventListener("input", (event) => {
        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
        el("changePinError")?.classList.add("hidden");
        el("changePinSuccess")?.classList.add("hidden");
      });
    });

    el("openAddHoursButton")?.addEventListener("click", () => {
      if (!canEditCurrentProfile()) {
        alert("You can’t edit this profile.");
        return;
      }
      resetEntryForm();
      showView("addHoursView");
    });
    el("cancelFormButton")?.addEventListener("click", () => {
      resetEntryForm();
      showView("summaryView");
    });

    el("jobNumber").addEventListener("change", () => {
      applyAutoMileage(el("jobNumber").value);
    });

    el("takeJobPhotoButton")?.addEventListener("click", () => {
      el("completeJobCamera")?.click();
    });
    el("pickJobGalleryButton")?.addEventListener("click", () => {
      el("completeJobPhotos")?.click();
    });
    el("completeJobCamera")?.addEventListener("change", (event) => {
      addPendingPhotos(event.target.files);
      event.target.value = "";
    });
    el("completeJobPhotos")?.addEventListener("change", (event) => {
      addPendingPhotos(event.target.files);
      event.target.value = "";
    });
    el("confirmCompleteJobButton")?.addEventListener("click", () => {
      confirmCompleteJob();
    });
    el("cancelCompleteJobButton")?.addEventListener("click", () => {
      const returnView = pendingComplete?.returnView || "allJobsView";
      pendingComplete = null;
      pendingPhotos = [];
      showView(returnView);
      if (returnView === "calendarView") {
        window.PMHCalendar?.show?.();
      }
    });
    document.querySelectorAll(".visit-type-button").forEach((button) => {
      button.addEventListener("click", () => {
        const visitType = button.dataset.visitType || "";
        if (pendingComplete) pendingComplete.visitType = visitType;
        setVisitTypeSelection(visitType);
      });
    });

    el("startTime").addEventListener("change", calculateHours);
    el("finishTime").addEventListener("change", calculateHours);
    el("saveHoursButton").addEventListener("click", saveEntry);
    el("summaryMonth").addEventListener("change", renderSummary);
    el("allJobsMonth").addEventListener("change", () => {
      jobsViewDirty = true;
      renderAllJobs();
      jobsViewDirty = false;
    });
    el("jobSearch")?.addEventListener("change", () => {
      jobsViewDirty = true;
      renderAllJobs();
      jobsViewDirty = false;
    });
    el("exportPdfButton").addEventListener("click", () => window.print());

    document.querySelectorAll("#topNav button").forEach((button) => {
      button.addEventListener("click", () => {
        const viewId = button.dataset.view;
        try {
          if (viewId === "summaryView") renderSummary();
          if (viewId === "allJobsView") {
            renderAllJobs();
            jobsViewDirty = false;
          }
          if (viewId === "crewView") renderCrew();
        } catch (error) {
          console.error("Failed to render view", viewId, error);
        }
        showView(viewId);
      });
    });

    window.addEventListener("pmh-calendar-events-changed", () => {
      jobsViewDirty = true;
      if (!el("allJobsView")?.classList.contains("active")) return;
      try {
        renderAllJobs();
        jobsViewDirty = false;
      } catch (error) {
        console.error("Failed to refresh My Jobs", error);
      }
    });
  }

  initialize();
})();
