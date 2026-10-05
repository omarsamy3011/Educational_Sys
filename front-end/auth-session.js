(() => {
  const API_BASE =
    window.location.port === "5500"
      ? "http://127.0.0.1:3000"
      : window.location.origin;
  const REFRESH_MARGIN_MS = 60_000;
  let refreshPromise = null;
  let refreshTimer = null;

  function clearSession() {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
  }

  function redirectToLogin() {
    clearSession();
    window.location.replace("teacherlogin.html");
  }

  function getAccessTokenExpiry(token) {
    try {
      const payload = token.split(".")[1];
      if (!payload) return 0;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
      return JSON.parse(decoded).exp * 1000 || 0;
    } catch {
      return 0;
    }
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    const accessToken = sessionStorage.getItem("accessToken");
    if (!accessToken || !sessionStorage.getItem("refreshToken")) return;
    const expiresAt = getAccessTokenExpiry(accessToken);
    if (!expiresAt) return;
    const delay = Math.max(0, expiresAt - Date.now() - REFRESH_MARGIN_MS);
    refreshTimer = window.setTimeout(attemptScheduledRefresh, delay);
  }

  async function attemptScheduledRefresh() {
    try {
      await refreshAccessToken();
    } catch {
      if (sessionStorage.getItem("refreshToken")) {
        refreshTimer = window.setTimeout(attemptScheduledRefresh, 30_000);
      }
    }
  }

  async function refreshAccessToken() {
    if (refreshPromise) return refreshPromise;
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (!refreshToken) {
      redirectToLogin();
      throw new Error("Your session expired. Please sign in again.");
    }

    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE}/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The server returned an unreadable refresh response.");
      }
      if (!response.ok) {
        if ([400, 401, 403].includes(response.status)) {
          redirectToLogin();
        }
        throw new Error(result.message || "Could not refresh your session.");
      }
      if (typeof result.data?.accessToken !== "string") {
        throw new Error(result.message || "Could not refresh your session.");
      }
      sessionStorage.setItem("accessToken", result.data.accessToken);
      scheduleRefresh();
      return result.data.accessToken;
    })()
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  async function authenticatedFetch(input, options = {}) {
    let accessToken = sessionStorage.getItem("accessToken");
    if (!accessToken || getAccessTokenExpiry(accessToken) <= Date.now() + REFRESH_MARGIN_MS) {
      accessToken = await refreshAccessToken();
    }

    const sendRequest = (token) => {
      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(input, { ...options, headers });
    };

    let response = await sendRequest(accessToken);
    if (response.status === 401) {
      accessToken = await refreshAccessToken();
      response = await sendRequest(accessToken);
    }
    return response;
  }

  window.authenticatedFetch = authenticatedFetch;
  scheduleRefresh();
})();
