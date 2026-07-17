(() => {
  "use strict";

  const STORAGE = {
    users: "pm_users_v6",
    entries: "pm_entries_v6",
    currentUser: "pm_current_user_v6",
    pins: "pm_pins_v1"
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
    { id: "scott", name: "Scott", active: true, role: "Owner", seedHours: 1000000, avatar: "scott" },
    { id: "ronnie", name: "Ronnie", active: true, role: "Team member", seedHours: 4862.5, avatar: "ronnie" },
    { id: "jason", name: "Jason", active: true, role: "Team member", seedHours: 4315, avatar: "jason" },
    { id: "jerald", name: "Jerald", active: true, role: "Team member", seedHours: 3988.5, avatar: "jerald" },
    { id: "kadek", name: "Kadek", active: true, role: "Team member", seedHours: 3721, avatar: "kadek" },
    { id: "josh", name: "Josh", active: true, role: "Team member", seedHours: 3506.5, avatar: "josh" },
    { id: "nathan", name: "Nathan", active: true, role: "Team member", seedHours: 3104, avatar: "nathan" },
    { id: "caden", name: "Caden", active: true, role: "Team member", seedHours: 2844.5, avatar: "caden" },
    { id: "luke", name: "Luke", active: true, role: "Team member", seedHours: 2517, avatar: "luke" }
  ];

  const defaultEntries = [
    { id: "e1", userId: "scott", date: "2026-07-17", job: "789", start: "08:00", finish: "17:00", hours: 9, mileage: 24, notes: "Commercial marquee install", cancelled: false },
    { id: "e2", userId: "scott", date: "2026-07-16", job: "812", start: "07:30", finish: "16:30", hours: 9, mileage: 31, notes: "Wedding clear-down", cancelled: false },
    { id: "e3", userId: "scott", date: "2026-07-15", job: "456", start: "08:30", finish: "18:00", hours: 9.5, mileage: 18, notes: "Gala setup", cancelled: false },
    { id: "e4", userId: "scott", date: "2026-07-14", job: "STORE", start: "09:00", finish: "13:00", hours: 4, mileage: 12, notes: "Loaded flooring", cancelled: false },
    { id: "e5", userId: "scott", date: "2026-07-13", job: "STORE", start: "08:00", finish: "12:00", hours: 4, mileage: 6, notes: "Sorted chair stock", cancelled: false },
    { id: "e6", userId: "scott", date: "2026-07-12", job: "321", start: "08:00", finish: "12:00", hours: 4, mileage: 8, notes: "Weather delay", cancelled: true },
    { id: "e7", userId: "scott", date: "2026-07-10", job: "701", start: "08:00", finish: "17:30", hours: 9.5, mileage: 22, notes: "Festival marquees", cancelled: false },
    { id: "e8", userId: "scott", date: "2026-07-08", job: "STORE", start: "10:00", finish: "15:00", hours: 5, mileage: 4, notes: "Van restock", cancelled: false },

    { id: "e9", userId: "ronnie", date: "2026-07-17", job: "789", start: "08:30", finish: "17:00", hours: 8.5, mileage: 18, notes: "", cancelled: false },
    { id: "e10", userId: "ronnie", date: "2026-07-16", job: "812", start: "08:00", finish: "16:00", hours: 8, mileage: 28, notes: "Pack-down lead", cancelled: false },
    { id: "e11", userId: "ronnie", date: "2026-07-15", job: "456", start: "08:00", finish: "17:00", hours: 9, mileage: 16, notes: "", cancelled: false },
    { id: "e12", userId: "ronnie", date: "2026-07-14", job: "STORE", start: "09:00", finish: "14:00", hours: 5, mileage: 10, notes: "Loaded sidewalls", cancelled: false },
    { id: "e13", userId: "ronnie", date: "2026-07-11", job: "655", start: "07:30", finish: "16:00", hours: 8.5, mileage: 40, notes: "Coastal install", cancelled: false },
    { id: "e14", userId: "ronnie", date: "2026-07-09", job: "640", start: "08:00", finish: "12:30", hours: 4.5, mileage: 14, notes: "Client postponed", cancelled: true },
    { id: "e15", userId: "ronnie", date: "2026-07-07", job: "STORE", start: "08:30", finish: "12:30", hours: 4, mileage: 5, notes: "Tool check", cancelled: false },

    { id: "e16", userId: "jason", date: "2026-07-17", job: "789", start: "09:00", finish: "16:00", hours: 7, mileage: 0, notes: "", cancelled: false },
    { id: "e17", userId: "jason", date: "2026-07-16", job: "812", start: "08:30", finish: "17:00", hours: 8.5, mileage: 20, notes: "", cancelled: false },
    { id: "e18", userId: "jason", date: "2026-07-15", job: "STORE", start: "09:00", finish: "13:30", hours: 4.5, mileage: 8, notes: "Frame rack tidy", cancelled: false },
    { id: "e19", userId: "jason", date: "2026-07-13", job: "701", start: "08:00", finish: "17:00", hours: 9, mileage: 25, notes: "Peg team", cancelled: false },
    { id: "e20", userId: "jason", date: "2026-07-12", job: "321", start: "08:00", finish: "11:00", hours: 3, mileage: 8, notes: "Stood down", cancelled: true },
    { id: "e21", userId: "jason", date: "2026-07-10", job: "688", start: "08:00", finish: "16:30", hours: 8.5, mileage: 19, notes: "Garden party", cancelled: false },
    { id: "e22", userId: "jason", date: "2026-07-08", job: "STORE", start: "10:00", finish: "14:00", hours: 4, mileage: 3, notes: "Counted weights", cancelled: false },

    { id: "e23", userId: "kadek", date: "2026-07-17", job: "789", start: "08:00", finish: "16:30", hours: 8.5, mileage: 15, notes: "", cancelled: false },
    { id: "e24", userId: "kadek", date: "2026-07-16", job: "STORE", start: "08:00", finish: "12:00", hours: 4, mileage: 7, notes: "Loaded carpets", cancelled: false },
    { id: "e25", userId: "kadek", date: "2026-07-15", job: "456", start: "08:30", finish: "17:00", hours: 8.5, mileage: 12, notes: "", cancelled: false },
    { id: "e26", userId: "kadek", date: "2026-07-14", job: "812", start: "09:00", finish: "15:00", hours: 6, mileage: 21, notes: "Early finish", cancelled: false },
    { id: "e27", userId: "kadek", date: "2026-07-11", job: "655", start: "08:00", finish: "17:00", hours: 9, mileage: 36, notes: "", cancelled: false },
    { id: "e28", userId: "kadek", date: "2026-07-09", job: "640", start: "08:00", finish: "12:00", hours: 4, mileage: 14, notes: "Cancelled with Ronnie", cancelled: true },
    { id: "e29", userId: "kadek", date: "2026-07-07", job: "STORE", start: "09:00", finish: "15:30", hours: 6.5, mileage: 5, notes: "Deep clean bay 2", cancelled: false }
  ];

  const avatarFiles = {
    scott: "assets/avatars/scott.png",
    ronnie: "assets/avatars/ronnie.png",
    jason: "assets/avatars/jason.png",
    jerald: "assets/avatars/jerald.png",
    kadek: "assets/avatars/kadek.png",
    josh: "assets/avatars/josh.png",
    nathan: "assets/avatars/nathan.png",
    caden: "assets/avatars/caden.png",
    luke: "assets/avatars/luke.png",
    spare1: "assets/avatars/spare1.png",
    spare2: "assets/avatars/spare2.png",
    spare3: "assets/avatars/spare3.png",
    spare4: "assets/avatars/spare4.png"
  };

  const fallbackAvatars = Object.keys(avatarFiles);

  let users = load(STORAGE.users, null);
  let entries = load(STORAGE.entries, null);
  let currentUserId = storageGet(STORAGE.currentUser) || "";
  let pins = load(STORAGE.pins, {}) || {};
  if (!pins || typeof pins !== "object" || Array.isArray(pins)) pins = {};

  // Migrate from earlier storage if present, otherwise seed defaults.
  if (!Array.isArray(users) || users.length === 0) {
    const legacyUsers = load("pm_users_v5", null) || load("pm_users_v4", null) || load("pm_users_v3", null);
    users = Array.isArray(legacyUsers) && legacyUsers.length
      ? legacyUsers
      : JSON.parse(JSON.stringify(defaultUsers));
    storageSet(STORAGE.users, JSON.stringify(users));
  }
  if (!Array.isArray(entries)) {
    // Prefer fresh demo seed for v6 so All Jobs has richer sample data.
    entries = JSON.parse(JSON.stringify(defaultEntries));
    storageSet(STORAGE.entries, JSON.stringify(entries));
  }
  if (!currentUserId) {
    currentUserId = storageGet("pm_current_user_v5") || storageGet("pm_current_user_v4") || storageGet("pm_current_user_v3") || "";
    if (currentUserId) storageSet(STORAGE.currentUser, currentUserId);
  }

  // Ensure every user has a unique robot avatar; Scott is Owner.
  users = users.map((user, index) => {
    const avatarKey = avatarFiles[user.avatar]
      ? user.avatar
      : avatarFiles[user.id]
        ? user.id
        : fallbackAvatars[index % fallbackAvatars.length];
    return {
      ...user,
      role: user.id === "scott" ? "Owner" : "Team member",
      avatar: avatarKey
    };
  });
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

  function saveAll() {
    storageSet(STORAGE.users, JSON.stringify(users));
    storageSet(STORAGE.entries, JSON.stringify(entries));
    storageSet(STORAGE.pins, JSON.stringify(pins));
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
    const userId = el("loginUser")?.value || "";
    const creating = userId && !hasPin(userId);
    const confirmWrap = el("pinConfirmWrap");
    const help = el("pinHelp");
    const label = el("loginPinLabel");
    const button = el("continueButton");

    if (confirmWrap) confirmWrap.classList.toggle("hidden", !creating);
    if (help) {
      help.textContent = creating
        ? "First time for this profile — create a 4-digit PIN."
        : "Enter this profile’s PIN to continue.";
    }
    if (label) label.textContent = creating ? "Create PIN" : "PIN";
    if (button) button.textContent = creating ? "Set PIN & Enter Profile" : "Enter Profile";
    clearPinFields();
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
      storageSet(STORAGE.pins, JSON.stringify(pins));
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

  function formatHours(value) {
    const hours = Number(value) || 0;
    const hasFraction = Math.abs(hours % 1) > 0.001;
    return hours.toLocaleString("en-GB", {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: hasFraction ? 1 : 0
    });
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
    return `${path}?v=1.5.1`;
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
      ? `${avatarFiles[user] || avatarFiles.scott}?v=1.5.1`
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
    const months = availableMonths();
    select.innerHTML = months.map((month) => `<option value="${month}">${monthLabel(month)}</option>`).join("");
    select.value = months.includes(selected) ? selected : months[0];
  }

  function showView(viewId) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    document.querySelectorAll("#topNav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    el("topNav").classList.toggle("hidden", viewId === "loginView" || viewId === "addHoursView");
    if (viewId === "calendarView") {
      window.PMHCalendar?.show?.();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderLogin() {
    const activeUsers = users.filter((user) => user.active);
    el("loginUser").innerHTML = activeUsers.length
      ? activeUsers.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("")
      : '<option value="" disabled selected>No active users</option>';
    if (currentUserId && activeUsers.some((user) => user.id === currentUserId)) {
      el("loginUser").value = currentUserId;
    } else if (activeUsers.length) {
      el("loginUser").value = activeUsers[0].id;
    }
    updatePinPanel();
  }

  function renderSummary() {
    const user = getCurrentUser();
    if (!user) return;

    el("summaryUserName").textContent = user.name;
    el("summaryRole").textContent = user.role;
    renderRobot(el("summaryRobot"), user);

    const selectedMonth = el("summaryMonth").value || availableMonths()[0];
    populateMonthSelect(el("summaryMonth"), selectedMonth);
    const month = el("summaryMonth").value;

    const userEntries = entries
      .filter((entry) => entry.userId === user.id && entry.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date));

    const activeEntries = userEntries.filter((entry) => !entry.cancelled);
    const hours = activeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const mileage = activeEntries.reduce((sum, entry) => sum + Number(entry.mileage || 0), 0);

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
            <div class="entry-actions">
              <button class="button subtle edit-entry" data-id="${entry.id}">Edit</button>
              <button class="button subtle cancel-entry" data-id="${entry.id}">Cancel Entry</button>
            </div>
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

  function collectJobOptions() {
    const byCode = new Map();

    const calendarEvents = window.PMHCalendar?.getEvents?.() || [];
    calendarEvents.forEach((event) => {
      const title = event.summary || "";
      const description = String(event.description || "").replace(/<[^>]+>/g, " ");
      const code = extractJobNumber(`${title} ${description}`);
      if (!code) return;
      const label = title.trim()
        ? `#${code} · ${title.trim()}`
        : `#${code}`;
      if (!byCode.has(code) || (title && !String(byCode.get(code).label).includes("·"))) {
        byCode.set(code, { value: code, label, source: "calendar" });
      }
    });

    entries.forEach((entry) => {
      const code = String(entry.job || "").toUpperCase();
      if (!code || code === "STORE") return;
      if (!/^\d{3,5}$/.test(code)) return;
      if (!byCode.has(code)) {
        byCode.set(code, { value: code, label: `#${code}`, source: "entries" });
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

  function resetEntryForm() {
    el("editingEntryId").value = "";
    el("entryFormTitle").textContent = "Add Hours";
    el("entryDate").value = new Date().toISOString().slice(0, 10);
    populateJobSelect("");
    el("startTime").value = "08:00";
    el("finishTime").value = "17:00";
    el("mileage").value = "";
    el("notes").value = "";
    calculateHours();
  }

  function openEditEntry(entryId) {
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
    calculateHours();
    showView("addHoursView");
  }

  function cancelEntry(entryId) {
    const entry = entries.find((item) => item.id === entryId && item.userId === currentUserId);
    if (!entry) return;
    if (!confirm("Cancel this entry? Its hours and mileage will be excluded from totals.")) return;
    entry.cancelled = true;
    saveAll();
    renderAll();
  }

  function saveEntry() {
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

  function renderAllJobs() {
    const selectedMonth = el("allJobsMonth").value || availableMonths()[0];
    populateMonthSelect(el("allJobsMonth"), selectedMonth);
    const month = el("allJobsMonth").value;
    const query = el("jobSearch").value.trim().toLowerCase();
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
        if (!query) return true;
        return entry.job.toLowerCase().includes(query.replace("#", ""));
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
          return `<article class="job-card ${typeClass}${allCancelled ? " cancelled" : ""}">
            <div class="job-header">
              <div>
                <h3>${label}${allCancelled ? '<span class="status">Cancelled</span>' : ""}</h3>
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
          </article>`;
        }).join("")
      : '<p class="muted">No jobs logged for this month yet. Add hours on a job to see it here.</p>';
  }

  function renderCrew() {
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
          <strong>${escapeHtml(user.name)}${user.active ? "" : '<span class="retired-badge">Retired</span>'}</strong>
          <div class="muted">${user.active ? "All-time total" : "Retired · history kept"}</div>
          ${user.active ? "" : `<button type="button" class="button subtle reinstate-user" data-id="${escapeHtml(user.id)}">Reinstate</button>`}
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

    const retireable = users.filter((user) => user.active && user.id !== "scott");
    el("retireUserSelect").innerHTML = retireable.length
      ? retireable.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("")
      : '<option value="" disabled selected>No active users to retire</option>';
  }

  function renderAll() {
    renderLogin();
    renderCrew();
    if (currentUserId && users.some((user) => user.id === currentUserId && user.active)) {
      renderSummary();
      renderAllJobs();
    }
  }

  function addUser() {
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

    currentUserId = id;
    storageSet(STORAGE.currentUser, currentUserId);
    saveAll();
    el("newUserName").value = "";
    renderAll();
    showView("summaryView");
  }

  function retireUser() {
    const userId = el("retireUserSelect").value;
    const user = users.find((item) => item.id === userId);
    if (!user || !user.active) return;
    if (!confirm(`Retire ${user.name}? They will stay on the crew list greyed out with a tombstone, and can be reinstated later.`)) return;
    user.active = false;
    if (currentUserId === user.id) {
      currentUserId = "";
      storageSet(STORAGE.currentUser, "");
      saveAll();
      renderAll();
      showView("loginView");
      return;
    }
    saveAll();
    renderAll();
  }

  function reinstateUser(userId) {
    const user = users.find((item) => item.id === userId);
    if (!user || user.active) return;
    user.active = true;
    saveAll();
    renderAll();
  }

  function initialize() {
    populateTimes();
    resetEntryForm();
    // Always start on the select-team-member screen each load.
    currentUserId = "";
    storageSet(STORAGE.currentUser, "");
    renderAll();
    showView("loginView");

    el("continueButton").addEventListener("click", async () => {
      const selectedId = el("loginUser").value;
      if (!selectedId) return;
      el("continueButton").disabled = true;
      try {
        const ok = await verifyOrCreatePin(selectedId);
        if (!ok) return;
        currentUserId = selectedId;
        storageSet(STORAGE.currentUser, currentUserId);
        clearPinFields();
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

    el("changeUserButton").addEventListener("click", () => {
      currentUserId = "";
      storageSet(STORAGE.currentUser, "");
      renderLogin();
      showView("loginView");
    });
    el("addUserButton").addEventListener("click", addUser);
    el("retireUserButton").addEventListener("click", retireUser);

    el("openAddHoursButton").addEventListener("click", () => {
      resetEntryForm();
      populateJobSelect("");
      showView("addHoursView");
    });

    el("cancelFormButton").addEventListener("click", () => {
      resetEntryForm();
      showView("summaryView");
    });

    el("startTime").addEventListener("change", calculateHours);
    el("finishTime").addEventListener("change", calculateHours);
    el("saveHoursButton").addEventListener("click", saveEntry);
    el("summaryMonth").addEventListener("change", renderSummary);
    el("allJobsMonth").addEventListener("change", renderAllJobs);
    el("jobSearch").addEventListener("input", renderAllJobs);
    el("exportPdfButton").addEventListener("click", () => window.print());

    document.querySelectorAll("#topNav button").forEach((button) => {
      button.addEventListener("click", () => {
        const viewId = button.dataset.view;
        if (viewId === "summaryView") renderSummary();
        if (viewId === "allJobsView") renderAllJobs();
        if (viewId === "crewView") renderCrew();
        showView(viewId);
      });
    });

    window.PMHCalendar?.bind?.();
  }

  initialize();
})();
