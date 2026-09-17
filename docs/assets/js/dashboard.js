function formatSyncDate(value) {
  if (!value) return "Nunca";
  const date = new Date(`${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayFirstName(user) {
  const base = (user?.nombre || user?.username || "Usuario").trim();
  return base.split(/\s+/)[0] || base;
}

function applyDashboardGreeting(user) {
  const firstName = getDisplayFirstName(user);
  const greeting = document.getElementById("dashboardGreeting");
  const welcome = document.getElementById("dashboardWelcome");
  const badge = document.getElementById("dashboardUserBadge");
  if (greeting) greeting.textContent = `Hola ${firstName}!`;
  if (welcome) welcome.textContent = "Bienvenida al Portal de Gestión de Procesos.";
  if (badge) badge.textContent = `Usuario: ${user.username || "-"}`;
}
async function loadDashboardSync(user) {
  if (user.rol !== "administrador") return;
  try {
    const sync = await apiGet("/api/sincronizacion?check_graph=0");
    dashboardSync.hidden = false;
    const last = sync.ultima;
    if (last) {
      const who = last.usuario?.nombre || last.usuario?.username || "Administrador";
      dashboardSyncText.textContent = `${formatSyncDate(last.finalizado_en || last.iniciado_en)} · ${last.estado} · ${who}`;
    } else {
      dashboardSyncText.textContent = "Aún no se ha ejecutado una sincronización desde OneDrive/SharePoint.";
    }
  } catch (_) {
    // La sincronización es informativa y nunca debe bloquear el Dashboard.
    dashboardSync.hidden = true;
  }
}

(async () => {
  const user = await initLayout("dashboard");
  if (!user) return;
  applyDashboardGreeting(user);
  setLoading("areasBars", 1, "Cargando resumen...");
  setLoading("criticos", 1, "Cargando procesos críticos...");
  setLoading("recentes", 5, "Cargando procesos recientes...");
  loadDashboardSync(user);
  try {
    const data = await apiGet("/api/dashboard");

    kAreas.textContent = data.kpis.areas;
    kProcesos.textContent = data.kpis.procesos;
    kCriticos.textContent = `${data.kpis.criticos} (${data.kpis.porcentaje_criticos}%)`;
    kDocumentos.textContent = data.kpis.documentos;

    const max = Math.max(1, ...data.procesos_por_area.map((x) => x.cantidad));
    areasBars.innerHTML = data.procesos_por_area.length
      ? data.procesos_por_area.map((x) => `<div class="bar-row"><span>${esc(x.area)}</span><div class="bar-track"><div class="bar-fill" style="width:${x.cantidad / max * 100}%"></div></div><b>${x.cantidad}</b></div>`).join("")
      : '<div class="empty">Sin datos disponibles.</div>';

    criticos.innerHTML = data.criticos_recientes.length
      ? data.criticos_recientes.map((x) => `
        <div class="quick-item">
          <span class="badge-red">Crítico</span>
          <strong>${esc(x.codigo)} · ${esc(x.nombre)}</strong>
          <small>${esc(x.area)}${x.tipo ? ` · ${esc(x.tipo)}` : ""}</small>
        </div>`).join("")
      : '<div class="empty">No hay procesos críticos registrados.</div>';

    recientes.innerHTML = data.procesos_recientes.length
      ? data.procesos_recientes.map((x) => `
        <tr>
          <td><span class="badge">${esc(x.codigo)}</span></td>
          <td><div class="cell-title"><strong>${esc(x.nombre)}</strong><span class="cell-sub">${esc(x.area)}</span></div></td>
          <td>${esc(x.area)}</td>
          <td>${x.tipo ? `<span class="tag tag-dark">${esc(x.tipo)}</span>` : '<span class="muted">-</span>'}</td>
          <td>${x.es_critico ? '<span class="badge-red">Sí</span>' : '<span class="badge">No</span>'}</td>
        </tr>`).join("")
      : '<tr><td colspan="5" class="empty">Sin datos.</td></tr>';
  } catch (error) {
    showMsg(error.message, "error");
  }
})();
