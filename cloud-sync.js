(() => {
  "use strict";

  const DOC_PATH = ["pmhCrew", "main", "data", "state"];
  const STATUS = {
    disabled: "Cloud sync off",
    connecting: "Connecting…",
    synced: "Cloud sync on",
    saving: "Saving to cloud…",
    offline: "Offline — will sync when online",
    error: "Cloud sync error"
  };

  let app = null;
  let auth = null;
  let db = null;
  let unsub = null;
  let ready = false;
  let applyingRemote = false;
  let status = STATUS.disabled;
  let lastError = "";
  let hooks = {
    getState: null,
    setState: null,
    onStatus: null
  };
  let pushTimer = null;
  let lastPushedJson = "";
  let started = false;

  function config() {
    return window.PMH_FIREBASE_CONFIG || {};
  }

  function isConfigured() {
    const c = config();
    return Boolean(c.apiKey && c.projectId && c.appId);
  }

  function setStatus(next, errorMessage = "") {
    status = next;
    lastError = errorMessage || "";
    try {
      hooks.onStatus?.({
        status,
        message: errorMessage ? `${next}: ${errorMessage}` : next,
        configured: isConfigured(),
        ready,
        error: lastError
      });
    } catch {
      // ignore UI errors
    }
  }

  function docRef() {
    return db.collection(DOC_PATH[0]).doc(DOC_PATH[1])
      .collection(DOC_PATH[2]).doc(DOC_PATH[3]);
  }

  function statePayload(state) {
    return {
      users: state.users || [],
      entries: state.entries || [],
      pins: state.pins || {},
      completedJobs: state.completedJobs || {},
      updatedAt: Date.now(),
      updatedBy: state.updatedBy || "crew"
    };
  }

  async function ensureFirebase() {
    if (!isConfigured()) {
      setStatus(STATUS.disabled);
      return false;
    }
    if (!window.firebase) {
      setStatus(STATUS.error, "Firebase SDK not loaded");
      return false;
    }
    if (!app) {
      app = firebase.apps?.length ? firebase.app() : firebase.initializeApp(config());
      auth = firebase.auth();
      db = firebase.firestore();
      try {
        await db.enablePersistence({ synchronizeTabs: true });
      } catch (error) {
        // Multiple tabs or unsupported browser — sync still works without persistence.
        console.warn("Firestore persistence unavailable", error?.code || error);
      }
    }
    if (!auth.currentUser) {
      setStatus(STATUS.connecting);
      await auth.signInAnonymously();
    }
    ready = true;
    return true;
  }

  async function pullAndSeed() {
    const snap = await docRef().get();
    const local = hooks.getState?.();
    if (!snap.exists) {
      if (local) {
        const payload = statePayload(local);
        await docRef().set(payload, { merge: false });
        lastPushedJson = JSON.stringify({
          users: payload.users,
          entries: payload.entries,
          pins: payload.pins,
          completedJobs: payload.completedJobs
        });
      }
      return;
    }
    const remote = snap.data() || {};
    applyingRemote = true;
    try {
      hooks.setState?.({
        users: Array.isArray(remote.users) ? remote.users : [],
        entries: Array.isArray(remote.entries) ? remote.entries : [],
        pins: remote.pins && typeof remote.pins === "object" ? remote.pins : {},
        completedJobs: remote.completedJobs && typeof remote.completedJobs === "object"
          ? remote.completedJobs
          : {}
      }, { fromCloud: true });
      lastPushedJson = JSON.stringify({
        users: remote.users || [],
        entries: remote.entries || [],
        pins: remote.pins || {},
        completedJobs: remote.completedJobs || {}
      });
    } finally {
      applyingRemote = false;
    }
  }

  function listen() {
    if (unsub) unsub();
    unsub = docRef().onSnapshot(
      (snap) => {
        if (!snap.exists) {
          setStatus(STATUS.synced);
          return;
        }
        const remote = snap.data() || {};
        const remoteJson = JSON.stringify({
          users: remote.users || [],
          entries: remote.entries || [],
          pins: remote.pins || {},
          completedJobs: remote.completedJobs || {}
        });
        if (remoteJson === lastPushedJson) {
          setStatus(navigator.onLine ? STATUS.synced : STATUS.offline);
          return;
        }
        applyingRemote = true;
        try {
          hooks.setState?.({
            users: Array.isArray(remote.users) ? remote.users : [],
            entries: Array.isArray(remote.entries) ? remote.entries : [],
            pins: remote.pins && typeof remote.pins === "object" ? remote.pins : {},
            completedJobs: remote.completedJobs && typeof remote.completedJobs === "object"
              ? remote.completedJobs
              : {}
          }, { fromCloud: true });
          lastPushedJson = remoteJson;
          setStatus(navigator.onLine ? STATUS.synced : STATUS.offline);
        } catch (error) {
          setStatus(STATUS.error, error.message || "Could not apply cloud data");
        } finally {
          applyingRemote = false;
        }
      },
      (error) => {
        setStatus(STATUS.error, error.message || "Listener failed");
      }
    );
  }

  async function pushState(state, immediate = false) {
    if (!isConfigured() || !ready || applyingRemote) return;
    const payload = statePayload(state);
    const bodyJson = JSON.stringify({
      users: payload.users,
      entries: payload.entries,
      pins: payload.pins,
      completedJobs: payload.completedJobs
    });
    if (bodyJson === lastPushedJson) return;

    const run = async () => {
      try {
        setStatus(STATUS.saving);
        await docRef().set(payload, { merge: false });
        lastPushedJson = bodyJson;
        setStatus(navigator.onLine ? STATUS.synced : STATUS.offline);
      } catch (error) {
        setStatus(STATUS.error, error.message || "Save failed");
      }
    };

    if (immediate) {
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      await run();
      return;
    }

    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      run();
    }, 400);
  }

  async function start(options = {}) {
    if (started) return ready;
    started = true;
    hooks = {
      getState: options.getState || null,
      setState: options.setState || null,
      onStatus: options.onStatus || null
    };

    if (!isConfigured()) {
      setStatus(STATUS.disabled);
      return false;
    }

    try {
      setStatus(STATUS.connecting);
      const ok = await ensureFirebase();
      if (!ok) return false;
      await pullAndSeed();
      listen();
      setStatus(navigator.onLine ? STATUS.synced : STATUS.offline);
      window.addEventListener("online", () => {
        if (ready) setStatus(STATUS.synced);
      });
      window.addEventListener("offline", () => {
        if (ready) setStatus(STATUS.offline);
      });
      return true;
    } catch (error) {
      setStatus(STATUS.error, error.message || "Could not start cloud sync");
      return false;
    }
  }

  window.PMHCloud = {
    isConfigured,
    isReady: () => ready,
    start,
    pushState,
    getStatus: () => ({ status, error: lastError, configured: isConfigured(), ready })
  };
})();
