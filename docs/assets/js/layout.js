const SIDEBAR_KEY = "portal_procesos_sidebar_collapsed";

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function roleLabel(role) {
  return role === "administrador" ? "Administrador" : "Usuario";
}

function showMsg(text, type = "ok") {
  const el = document.getElementById("msg");
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 3500);
}

function setLoading(targetId, columns = 1, text = "Cargando información...") {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (el.tagName === "TBODY") {
    el.innerHTML = `<tr><td colspan="${columns}" class="loading-cell"><span class="spinner"></span>${esc(text)}</td></tr>`;
  } else {
    el.innerHTML = `<div class="loading-block"><span class="spinner"></span>${esc(text)}</div>`;
  }
}

const PAGE_META = {
  dashboard: { title: "Dashboard", section: "Principal" },
  areas: { title: "Áreas", section: "Gestión" },
  procesos: { title: "Procesos", section: "Documentación" },
  documentos: { title: "Documentos", section: "Documentación" },
  guias: { title: "Guías", section: "Documentación" },
  manuales: { title: "Manuales", section: "Documentación" },
  politicas: { title: "Políticas", section: "Documentación" },
  reportes: { title: "Reportes", section: "Gestión" },
  usuarios: { title: "Usuarios", section: "Administración" },
  sincronizacion: { title: "Sincronización", section: "Administración" },
};

function applySidebarState(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  const sidebar = document.querySelector(".app-sidebar");
  if (sidebar) sidebar.classList.toggle("collapsed", collapsed);
  const toggle = document.getElementById("sidebarToggle");
  if (toggle) {
    toggle.setAttribute("aria-label", collapsed ? "Expandir menú" : "Contraer menú");
    toggle.title = collapsed ? "Expandir menú" : "Contraer menú";
    toggle.textContent = collapsed ? "›" : "‹";
  }
}

function toggleSidebar() {
  if (window.innerWidth <= 860) {
    document.body.classList.toggle("sidebar-open");
    return;
  }
  const collapsed = !document.body.classList.contains("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  applySidebarState(collapsed);
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 860) document.body.classList.remove("sidebar-open");
}

function injectUtilityBar(active, user) {
  const page = document.querySelector("main.page");
  if (!page || page.querySelector(".page-utility")) return;
  const meta = PAGE_META[active] || { title: active, section: "Portal" };
  const today = new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  page.insertAdjacentHTML(
    "afterbegin",
    `<div class="page-utility">
      <div class="breadcrumbs">🏷 <span>${esc(meta.section)}</span> <span>›</span> <b>${esc(meta.title)}</b></div>
      <div class="utility-right">
        <span class="pill">📅 <strong>${esc(today)}</strong></span>
        <span class="pill pill-accent">👤 <strong>${esc(user.nombre || user.username)}</strong> · ${esc(roleLabel(user.rol))}</span>
      </div>
    </div>`
  );
}

async function initLayout(active) {
  const user = await requireAuth();
  if (!user) return null;

  const adminLink = user.rol === "administrador"
    ? `<div class="nav-section"><div class="nav-section-title">Administración</div><nav>
         <a href="usuarios.html" data-key="usuarios" title="Usuarios"><span class="nav-icon">👥</span><span class="nav-label">Usuarios</span></a>
         <a href="sincronizacion.html" data-key="sincronizacion" title="Sincronización"><span class="nav-icon">↻</span><span class="nav-label">Sincronización</span></a>
       </nav></div>`
    : "";

  document.body.insertAdjacentHTML(
    "afterbegin",
    `<button class="mobile-menu-btn" type="button" onclick="toggleSidebar()" aria-label="Abrir menú" title="Abrir menú">☰</button>
     <aside class="app-sidebar">
      <div class="sidebar-top">
        <div class="brand">
          <img src="assets/img/logo-refax.png" alt="REFAX">
          <div class="brand-copy"><b>Portal de Gestión de Procesos</b><small>REFAX Perú</small></div>
        </div>
        <button id="sidebarToggle" class="sidebar-toggle" type="button" onclick="toggleSidebar()" aria-label="Contraer menú" title="Contraer menú">‹</button>
      </div>
      <div class="sidebar-scroll">
        <div class="nav-section">
          <div class="nav-section-title">Principal</div>
          <nav>
            <a href="dashboard.html" data-key="dashboard" title="Dashboard"><span class="nav-icon">⌂</span><span class="nav-label">Dashboard</span></a>
          </nav>
        </div>
        <div class="nav-section">
          <div class="nav-section-title">Gestión</div>
          <nav>
            <a href="areas.html" data-key="areas" title="Áreas"><span class="nav-icon">▦</span><span class="nav-label">Áreas</span></a>
            <a href="reportes.html" data-key="reportes" title="Reportes"><span class="nav-icon">▥</span><span class="nav-label">Reportes</span></a>
          </nav>
        </div>
        <div class="nav-section">
          <div class="nav-section-title">Documentación</div>
          <nav>
            <a href="procesos.html" data-key="procesos" title="Procesos"><span class="nav-icon">⚙</span><span class="nav-label">Procesos</span></a>
            <a href="documentos.html" data-key="documentos" title="Documentos"><span class="nav-icon">▤</span><span class="nav-label">Documentos</span></a>
            <a href="guias.html" data-key="guias" title="Guías"><span class="nav-icon">⌁</span><span class="nav-label">Guías</span></a>
            <a href="manuales.html" data-key="manuales" title="Manuales"><span class="nav-icon">▣</span><span class="nav-label">Manuales</span></a>
            <a href="politicas.html" data-key="politicas" title="Políticas"><span class="nav-icon">◆</span><span class="nav-label">Políticas</span></a>
          </nav>
        </div>
        ${adminLink}
      </div>
      <div class="side-user">
        <div class="side-user-icon">${esc((user.nombre || user.username || "U").charAt(0).toUpperCase())}</div>
        <div class="side-user-copy"><b>${esc(user.nombre || user.username)}</b><small>${esc(roleLabel(user.rol))}</small></div>
        <button class="logout-btn" onclick="logout()" title="Cerrar sesión"><span>↪</span><span class="nav-label">Salir</span></button>
      </div>
    </aside>`
  );

  document.body.classList.add("with-sidebar");
  document.querySelector(`[data-key="${active}"]`)?.classList.add("active");
  injectUtilityBar(active, user);

  document.querySelectorAll(".admin-only, .admin-only-column").forEach((x) => (x.hidden = user.rol !== "administrador"));

  applySidebarState(localStorage.getItem(SIDEBAR_KEY) === "1");
  document.querySelectorAll(".app-sidebar a").forEach((a) => a.addEventListener("click", closeSidebarOnMobile));
  return user;
}
