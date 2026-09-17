const TOKEN_KEY = "portal_procesos_access_token";
const USER_KEY = "portal_procesos_current_user";

function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setAccessToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function getCachedUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setCachedUser(user) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutMs || 20000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
    response = await fetch(`${window.APP_CONFIG.API_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Intenta nuevamente.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }
    const error = new Error(data.error || `Error HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

const apiGet = (path) => apiFetch(path);
const apiPost = (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) });
const apiPut = (path, body) => apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
const apiPatch = (path, body) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
const apiDelete = (path) => apiFetch(path, { method: "DELETE" });

const apiPostLong = (path, body = {}) => apiFetch(path, { method: "POST", body: JSON.stringify(body), timeoutMs: 120000 });
