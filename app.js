(() => {
  "use strict";

  const STORAGE = {
    users: "pm_users_v4",
    entries: "pm_entries_v4",
    currentUser: "pm_current_user_v4"
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
    { id: "scott", name: "Scott", active: true, role: "Team member", seedHours: 1000000, robot: 0 },
    { id: "ronnie", name: "Ronnie", active: true, role: "Team member", seedHours: 4862.5, robot: 1 },
    { id: "jason", name: "Jason", active: true, role: "Team member", seedHours: 4315, robot: 2 },
    { id: "jerald", name: "Jerald", active: true, role: "Team member", seedHours: 3988.5, robot: 3 },
    { id: "kadek", name: "Kadek", active: true, role: "Team member", seedHours: 3721, robot: 4 },
    { id: "josh", name: "Josh", active: true, role: "Team member", seedHours: 3506.5, robot: 5 },
    { id: "nathan", name: "Nathan", active: true, role: "Team member", seedHours: 3104, robot: 6 },
    { id: "caden", name: "Caden", active: true, role: "Team member", seedHours: 2844.5, robot: 7 },
    { id: "luke", name: "Luke", active: true, role: "Team member", seedHours: 2517, robot: 8 }
  ];

  const defaultEntries = [
    { id: "e1", userId: "scott", date: "2026-07-17", job: "789", start: "08:00", finish: "17:00", hours: 9, mileage: 24, notes: "Commercial marquee install", cancelled: false },
    { id: "e2", userId: "scott", date: "2026-07-15", job: "456", start: "08:30", finish: "18:00", hours: 9.5, mileage: 18, notes: "Gala setup", cancelled: false },
    { id: "e3", userId: "scott", date: "2026-07-14", job: "STORE", start: "09:00", finish: "13:00", hours: 4, mileage: 12, notes: "Loaded flooring", cancelled: false },
    { id: "e7", userId: "scott", date: "2026-07-12", job: "321", start: "08:00", finish: "12:00", hours: 4, mileage: 8, notes: "Weather delay", cancelled: true },
    { id: "e4", userId: "ronnie", date: "2026-07-17", job: "789", start: "08:30", finish: "17:00", hours: 8.5, mileage: 18, notes: "", cancelled: false },
    { id: "e5", userId: "jason", date: "2026-07-17", job: "789", start: "09:00", finish: "16:00", hours: 7, mileage: 0, notes: "", cancelled: false },
    { id: "e6", userId: "kadek", date: "2026-07-15", job: "456", start: "08:30", finish: "17:00", hours: 8.5, mileage: 12, notes: "", cancelled: false }
  ];

  // 80s Terminator endoskeleton variants — unique chrome + eye glow per crew member
  const robotPalettes = [
    { metal: "#c5ccd1", dark: "#2b3238", glow: "#ff1a00", accent: "#8a939b" },
    { metal: "#9aa7b0", dark: "#1c242a", glow: "#ff3b1f", accent: "#6d7a84" },
    { metal: "#d4b483", dark: "#3a2a14", glow: "#ff4d00", accent: "#8f7040" },
    { metal: "#8f9aa3", dark: "#151b20", glow: "#ff0022", accent: "#5c6770" },
    { metal: "#dde3e8", dark: "#3a4349", glow: "#00e5ff", accent: "#9aa6af" },
    { metal: "#6f8f82", dark: "#15241f", glow: "#7CFF00", accent: "#3f5c50" },
    { metal: "#e8ebe9", dark: "#4a5250", glow: "#ff8a00", accent: "#9ea5a2" },
    { metal: "#b07a52", dark: "#2c180e", glow: "#ff2438", accent: "#7a4d30" },
    { metal: "#7f92a8", dark: "#141c28", glow: "#39a7ff", accent: "#4d6075" },
    { metal: "#9a7aad", dark: "#241530", glow: "#ff31d2", accent: "#634b72" },
    { metal: "#a8b8be", dark: "#24343a", glow: "#ffd400", accent: "#6f8289" },
    { metal: "#b07070", dark: "#301818", glow: "#ff6b35", accent: "#7a4040" }
  ];

  let users = load(STORAGE.users, null);
  let entries = load(STORAGE.entries, null);
  let currentUserId = storageGet(STORAGE.currentUser) || "";

  // Migrate from v3 storage if present, otherwise seed defaults.
  if (!Array.isArray(users) || users.length === 0) {
    const legacyUsers = load("pm_users_v3", null);
    users = Array.isArray(legacyUsers) && legacyUsers.length
      ? legacyUsers
      : JSON.parse(JSON.stringify(defaultUsers));
    storageSet(STORAGE.users, JSON.stringify(users));
  }
  if (!Array.isArray(entries)) {
    const legacyEntries = load("pm_entries_v3", null);
    entries = Array.isArray(legacyEntries)
      ? legacyEntries
      : JSON.parse(JSON.stringify(defaultEntries));
    storageSet(STORAGE.entries, JSON.stringify(entries));
  }
  if (!currentUserId) {
    currentUserId = storageGet("pm_current_user_v3") || "";
    if (currentUserId) storageSet(STORAGE.currentUser, currentUserId);
  }

  // Keep crew roles flat — no Boss tag.
  users = users.map((user, index) => ({
    ...user,
    role: "Team member",
    robot: Number.isInteger(user.robot) ? user.robot : index % robotPalettes.length
  }));
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

  function formatHours(value) {
    const hours = Number(value) || 0;
    const hasFraction = Math.abs(hours % 1) > 0.001;
    return hours.toLocaleString("en-GB", {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: hasFraction ? 1 : 0
    });
  }

  function getCurrentUser() {
    return users.find((user) => user.id === currentUserId);
  }

  function renderRobot(target, robotIndex) {
    const palette = robotPalettes[robotIndex % robotPalettes.length];
    const uidSvg = `r${robotIndex}_${Math.random().toString(36).slice(2, 8)}`;
    target.style.setProperty("--robot-glow", palette.glow);
    target.innerHTML = `
      <svg class="terminator-svg" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="metal-${uidSvg}" x1="0.15" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="28%" stop-color="${palette.metal}"/>
            <stop offset="62%" stop-color="${palette.accent}"/>
            <stop offset="100%" stop-color="${palette.dark}"/>
          </linearGradient>
          <linearGradient id="jaw-${uidSvg}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${palette.metal}"/>
            <stop offset="100%" stop-color="${palette.dark}"/>
          </linearGradient>
          <radialGradient id="eye-${uidSvg}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="25%" stop-color="${palette.glow}"/>
            <stop offset="100%" stop-color="#2a0500"/>
          </radialGradient>
          <filter id="glow-${uidSvg}" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.8" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="32" cy="32" r="31" fill="#050708"/>
        <path d="M16 28 C16 14 48 14 48 28 L46 22 C42 12 22 12 18 22 Z"
              fill="url(#metal-${uidSvg})" stroke="${palette.dark}" stroke-width="1"/>
        <path d="M15 27 C15 18 49 18 49 27 L51 34 C51 48 42 56 32 56 C22 56 13 48 13 34 Z"
              fill="url(#metal-${uidSvg})" stroke="${palette.dark}" stroke-width="1.1"/>
        <path d="M18 28 H46 L44 33 H20 Z" fill="${palette.dark}" opacity="0.95"/>
        <path d="M20 29 H44" stroke="${palette.metal}" stroke-width="1" opacity="0.55"/>
        <ellipse cx="24" cy="35" rx="6.2" ry="5.2" fill="#0b0d0f"/>
        <ellipse cx="40" cy="35" rx="6.2" ry="5.2" fill="#0b0d0f"/>
        <circle cx="24" cy="35" r="3.6" fill="url(#eye-${uidSvg})" filter="url(#glow-${uidSvg})"/>
        <circle cx="40" cy="35" r="3.6" fill="url(#eye-${uidSvg})" filter="url(#glow-${uidSvg})"/>
        <circle cx="24" cy="35" r="1.2" fill="#fff8f0"/>
        <circle cx="40" cy="35" r="1.2" fill="#fff8f0"/>
        <path d="M30 38 L32 44 L34 38 Z" fill="${palette.dark}"/>
        <path d="M17 40 L21 46 L17 48 Z" fill="${palette.accent}" opacity="0.7"/>
        <path d="M47 40 L43 46 L47 48 Z" fill="${palette.accent}" opacity="0.7"/>
        <path d="M20 46 H44 L42 53 H22 Z" fill="url(#jaw-${uidSvg})" stroke="${palette.dark}" stroke-width="0.8"/>
        <path d="M23 47 V51 M27 47 V51 M31 47 V51 M35 47 V51 M39 47 V51"
              stroke="${palette.dark}" stroke-width="1.3"/>
        <path d="M14 30 L9 24" stroke="${palette.metal}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M50 30 L55 24" stroke="${palette.metal}" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="9" cy="24" r="2" fill="${palette.accent}"/>
        <circle cx="55" cy="24" r="2" fill="${palette.accent}"/>
      </svg>
    `;
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
    document.querySelectorAll("#bottomNav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });
    el("bottomNav").classList.toggle("hidden", viewId === "loginView");
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
  }

  function renderSummary() {
    const user = getCurrentUser();
    if (!user) return;

    el("summaryUserName").textContent = user.name;
    el("summaryRole").textContent = user.role;
    renderRobot(el("summaryRobot"), user.robot);

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

  function resetEntryForm() {
    el("editingEntryId").value = "";
    el("entryFormTitle").textContent = "Add Hours";
    el("entryDate").value = new Date().toISOString().slice(0, 10);
    el("jobNumber").value = "";
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
    el("jobNumber").value = entry.job;
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
    if (!(jobValue === "STORE" || /^\d{3}$/.test(jobValue))) {
      alert("Enter exactly three digits or choose STORE.");
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

    const grouped = {};
    entries
      .filter((entry) => entry.date.startsWith(month))
      .filter((entry) => {
        const user = users.find((item) => item.id === entry.userId);
        return !query ||
          entry.job.toLowerCase().includes(query.replace("#", "")) ||
          (user?.name || "").toLowerCase().includes(query);
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
          const totalHours = activeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
          const label = job.job === "STORE" ? "STORE" : `#${job.job}`;
          const typeClass = job.job === "STORE" ? "store" : "job";
          return `<article class="job-card ${typeClass}">
            <div class="job-header">
              <div><h3>${label}</h3><div class="muted">${formatDate(job.date)}</div></div>
              <strong>${formatHours(totalHours)} hrs</strong>
            </div>
            ${job.entries.map((entry) => {
              const user = users.find((item) => item.id === entry.userId);
              return `<div class="job-person ${entry.cancelled ? "cancelled" : ""}">
                <span>${escapeHtml(user?.name || "Unknown")}${entry.cancelled ? " — Cancelled" : ""}</span>
                <strong>${entry.cancelled ? "0 hrs · 0 miles" : `${formatHours(entry.hours)} hrs · ${Number(entry.mileage || 0).toFixed(0)} miles`}</strong>
              </div>`;
            }).join("")}
          </article>`;
        }).join("")
      : '<p class="muted">No matching jobs found.</p>';
  }

  function renderCrew() {
    const leaderboard = users
      .filter((user) => user.active)
      .map((user) => {
        const recordedHours = entries
          .filter((entry) => entry.userId === user.id && !entry.cancelled)
          .reduce((sum, entry) => sum + Number(entry.hours), 0);
        return { ...user, allTimeHours: Number(user.seedHours || 0) + recordedHours };
      })
      .sort((a, b) => b.allTimeHours - a.allTimeHours);

    el("crewLeaderboard").innerHTML = leaderboard.map((user, index) => `
      <div class="leaderboard-row">
        <div class="rank">${index + 1}</div>
        <div class="robot-avatar robot-avatar-sm" data-robot="${user.robot}"></div>
        <div class="leaderboard-copy">
          <strong>${escapeHtml(user.name)}</strong>
          <div class="muted">All-time total</div>
        </div>
        <div class="leaderboard-hours">${formatHours(user.allTimeHours)} <span>hrs</span></div>
      </div>
    `).join("");

    document.querySelectorAll("#crewLeaderboard .robot-avatar").forEach((avatar) => {
      renderRobot(avatar, Number(avatar.dataset.robot) || 0);
    });

    const retireable = users.filter((user) => user.active && user.id !== "scott");
    el("retireUserSelect").innerHTML = retireable.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("");
  }

  function renderAll() {
    renderLogin();
    if (currentUserId) {
      renderSummary();
      renderAllJobs();
      renderCrew();
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
    users.push({
      id,
      name,
      active: true,
      role: "Team member",
      seedHours: 0,
      robot: users.length % robotPalettes.length
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
    if (!user) return;
    if (!confirm(`Retire ${user.name}? Their historical data will remain.`)) return;
    user.active = false;
    if (currentUserId === user.id) {
      currentUserId = "scott";
      storageSet(STORAGE.currentUser, currentUserId);
    }
    saveAll();
    renderAll();
  }

  function initialize() {
    populateTimes();
    resetEntryForm();
    renderAll();

    if (currentUserId && users.some((user) => user.id === currentUserId && user.active)) {
      showView("summaryView");
    } else {
      showView("loginView");
    }

    el("continueButton").addEventListener("click", () => {
      currentUserId = el("loginUser").value;
      storageSet(STORAGE.currentUser, currentUserId);
      renderAll();
      showView("summaryView");
    });

    el("changeUserButton").addEventListener("click", () => showView("loginView"));
    el("addUserButton").addEventListener("click", addUser);
    el("retireUserButton").addEventListener("click", retireUser);

    el("openAddHoursButton").addEventListener("click", () => {
      resetEntryForm();
      showView("addHoursView");
    });

    el("cancelFormButton").addEventListener("click", () => {
      resetEntryForm();
      showView("summaryView");
    });

    el("storeButton").addEventListener("click", () => {
      el("jobNumber").value = "STORE";
    });

    el("jobNumber").addEventListener("input", () => {
      if (el("jobNumber").value.toUpperCase() !== "STORE") {
        el("jobNumber").value = el("jobNumber").value.replace(/\D/g, "").slice(0, 3);
      }
    });

    el("startTime").addEventListener("change", calculateHours);
    el("finishTime").addEventListener("change", calculateHours);
    el("saveHoursButton").addEventListener("click", saveEntry);
    el("summaryMonth").addEventListener("change", renderSummary);
    el("allJobsMonth").addEventListener("change", renderAllJobs);
    el("jobSearch").addEventListener("input", renderAllJobs);
    el("exportPdfButton").addEventListener("click", () => window.print());

    document.querySelectorAll("#bottomNav button").forEach((button) => {
      button.addEventListener("click", () => {
        const viewId = button.dataset.view;
        if (viewId === "summaryView") renderSummary();
        if (viewId === "allJobsView") renderAllJobs();
        if (viewId === "crewView") renderCrew();
        showView(viewId);
      });
    });
  }

  initialize();
})();
