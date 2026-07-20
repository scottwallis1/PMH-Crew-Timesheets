(() => {
  const RUNNING_VERSION = "1.39.0";
  const banner = document.getElementById("appUpdateBanner");
  const refreshButton = document.getElementById("appUpdateRefreshButton");
  let waitingWorker = null;
  let reloadArmed = false;

  function showUpdateBanner(reason) {
    if (!banner) return;
    banner.hidden = false;
    banner.classList.remove("hidden");
    banner.dataset.reason = reason || "version";
  }

  function hideUpdateBanner() {
    if (!banner) return;
    banner.hidden = true;
    banner.classList.add("hidden");
  }

  function applyUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    // Bust sticky browser caches on phones that still have no waiting worker.
    const url = new URL(window.location.href);
    url.searchParams.set("_refresh", String(Date.now()));
    window.location.replace(url.toString());
  }

  async function checkPublishedVersion() {
    try {
      const response = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const remote = String(data?.version || "").trim();
      if (remote && remote !== RUNNING_VERSION) {
        showUpdateBanner("version");
      }
    } catch {
      /* offline / first paint — ignore */
    }
  }

  function watchServiceWorker(registration) {
    if (!registration) return;

    if (registration.waiting) {
      waitingWorker = registration.waiting;
      showUpdateBanner("sw");
    }

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          waitingWorker = registration.waiting || installing;
          showUpdateBanner("sw");
        }
      });
    });

    // Periodic check while the app stays open on a phone.
    window.setInterval(() => {
      registration.update().catch(() => undefined);
      checkPublishedVersion();
    }, 5 * 60 * 1000);
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      checkPublishedVersion();
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      watchServiceWorker(registration);
      // Check for a newer published build even if this SW is current.
      checkPublishedVersion();
      // Also poke for updates shortly after launch.
      window.setTimeout(() => {
        registration.update().catch(() => undefined);
        checkPublishedVersion();
      }, 4000);
    } catch {
      checkPublishedVersion();
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadArmed) return;
      reloadArmed = true;
      window.location.reload();
    });
  }

  function cleanRefreshParam() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("_refresh")) return;
      url.searchParams.delete("_refresh");
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", next || "./");
    } catch {
      /* ignore */
    }
  }

  refreshButton?.addEventListener("click", () => {
    hideUpdateBanner();
    applyUpdate();
  });

  cleanRefreshParam();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerServiceWorker);
  } else {
    registerServiceWorker();
  }
})();
