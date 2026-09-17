async function login(username, password) {
  const data = await apiPost("/api/auth/login", { username, password });
  setAccessToken(data.access_token);
  setCachedUser(data.usuario);
  return data.usuario;
}

async function getCurrentUser({ force = false } = {}) {
  if (!force) {
    const cached = getCachedUser();
    if (cached) return cached;
  }
  const data = await apiGet("/api/auth/me");
  setCachedUser(data.usuario);
  return data.usuario;
}

function logout() {
  clearAccessToken();
  window.location.href = "login.html";
}

async function requireAuth({ adminOnly = false } = {}) {
  if (!getAccessToken()) {
    window.location.href = "login.html";
    return null;
  }

  try {
    const usuario = await getCurrentUser();
    if (adminOnly && usuario.rol !== "administrador") {
      window.location.href = "dashboard.html";
      return null;
    }
    return usuario;
  } catch (_) {
    clearAccessToken();
    window.location.href = "login.html";
    return null;
  }
}
