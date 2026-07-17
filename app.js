(() => {
  "use strict";

  const STORAGE = {
    users: "pm_users_v3",
    entries: "pm_entries_v3",
    currentUser: "pm_current_user_v3"
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
    { id: "scott", name: "Scott", active: true, role: "Boss", seedHours: 1000000, robot: 0 },
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
    { id: "e3", userId: "scott", date: "2026-07-12", job: "STORE", start: "09:00", finish: "13:00", hours: 4, mileage: 12, notes: "Loaded flooring", cancelled: true },
    { id: "e4", userId: "ronnie", date: "2026-07-17", job: "789", start: "08:30", finish: "17:00", hours: 8.5, mileage: 18, notes: "", cancelled: false },
    { id: "e5", userId: "jason", date: "2026-07-17", job: "789", start: "09:00", finish: "16:00", hours: 7, mileage: 0, notes: "", cancelled: false },
    { id: "e6", userId: "kadek", date: "2026-07-15", job: "456", start: "08:30", finish: "17:00", hours: 8.5, mileage: 12, notes: "", cancelled: false }
  ];

  const robotPalettes = [
    ["#7f8f8c", "#2a3331", "#ff2d20"],
    ["#385f59", "#111d1a", "#00f0ff"],
    ["#d29a3e", "#5f4214", "#ff4328"],
    ["#3f4a50", "#12191c", "#ff1d1d"],
    ["#bfc9c6", "#46524f", "#6dffea"],
    ["#2d7a68", "#17352e", "#8cff00"],
    ["#e5ecea", "#65706d", "#ff7a00"],
    ["#a96d43", "#3d2416", "#ff263b"],
    ["#465c73", "#151e29", "#39a7ff"],
    ["#764c8f", "#271732", "#ff31d2"],
    ["#8da7b0", "#27444d", "#ffd400"],
    ["#a76060", "#3d1d1d", "#ff6b35"]
  ];

  let users = load(STORAGE.users, defaultUsers);
  let entries = load(STORAGE.entries, defaultEntries);
  let currentUserId = storageGet(STORAGE.currentUser) || "";

  // Always seed the demo crew if storage is missing, empty or invalid.
  if (!Array.isArray(users) || users.length === 0) {
    users = JSON.parse(JSON.stringify(defaultUsers));
    storageSet(STORAGE.users, JSON.stringify(users));
  }
  if (!Array.isArray(entries)) {
    entries = JSON.parse(JSON.stringify(defaultEntries));
    storageSet(STORAGE.entries, JSON.stringify(entries));
  }

  const el = (id) => document.getElementById(id);

  function load(key, fallback) {
    try {
      const value = storageGet(key);
      return value ? JSON.parse(value) : JSON.parse(JSON.stringify(fallback));
    } catch {
      return JSON.parse(JSON.stringify(fallback));
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

  function getCurrentUser() {
    return users.find((user) => user.id === currentUserId);
  }

  function renderRobot(target, robotIndex) {
    const palette = robotPalettes[robotIndex % robotPalettes.length];
    target.style.setProperty("--robot-a", palette[0]);
    target.style.setProperty("--robot-b", palette[1]);
    target.style.setProperty("--robot-glow", palette[2]);
    target.innerHTML = '<span class="head"></span><span class="face"></span><span class="eyes"></span><span class="jaw"></span>';
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
    el("calculatedHours").textContent = hours.toFixed(1);
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

    el("monthlyHours").textContent = hours.toFixed(1);
    el("monthlyMileage").textContent = `${mileage.toFixed(0)} miles`;
    el("monthlyJobsHeading").textContent = `${monthLabel(month)} Jobs`;

    el("myEntries").innerHTML = userEntries.length
      ? userEntries.map((entry) => {
          const label = entry.job === "STORE" ? "STORE" : `#${entry.job}`;
          if (entry.cancelled) {
            return `<article class="entry cancelled">
              <div class="entry-head">
                <div>
                  <strong>${label}<span class="status">Cancelled</span></strong>
                  <div class="entry-meta">${formatDate(entry.date)} · ${entry.start}–${entry.finish}</div>
                  ${entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : ""}
                </div>
                <strong><s>${Number(entry.hours).toFixed(1)} hrs</s></strong>
              </div>
              <div class="entry-meta"><s>Mileage: ${Number(entry.mileage || 0).toFixed(0)} miles</s></div>
              <div class="entry-meta">Excluded from totals</div>
            </article>`;
          }
          return `<article class="entry">
            <div class="entry-head">
              <div>
                <strong>${label}</strong>
                <div class="entry-meta">${formatDate(entry.date)} · ${entry.start}–${entry.finish}</div>
                ${entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : ""}
              </div>
              <strong>${Number(entry.hours).toFixed(1)} hrs</strong>
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
          return `<article class="job-card">
            <div class="job-header">
              <div><h3>${label}</h3><div class="muted">${formatDate(job.date)}</div></div>
              <strong>${totalHours.toFixed(1)} hrs</strong>
            </div>
            ${job.entries.map((entry) => {
              const user = users.find((item) => item.id === entry.userId);
              return `<div class="job-person ${entry.cancelled ? "muted" : ""}">
                <span>${escapeHtml(user?.name || "Unknown")}${entry.cancelled ? " — Cancelled" : ""}</span>
                <strong>${entry.cancelled ? "0.0 hrs · 0 miles" : `${Number(entry.hours).toFixed(1)} hrs · ${Number(entry.mileage || 0).toFixed(0)} miles`}</strong>
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
        <div class="leaderboard-copy">
          <strong>${escapeHtml(user.name)}${user.role === "Boss" ? '<span class="boss-badge">Boss</span>' : ""}</strong>
          <div class="muted">All-time total</div>
        </div>
        <div class="leaderboard-hours">${user.allTimeHours.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs</div>
      </div>
    `).join("");

    const retireable = users.filter((user) => user.active && user.role !== "Boss");
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
