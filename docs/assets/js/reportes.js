function bars(el, data) {
  const max = Math.max(1, ...data.map((x) => x.cantidad));
  el.innerHTML = data.length
    ? data.map((x) => `<div class="bar-row"><span>${esc(x.nombre)}</span><div class="bar-track"><div class="bar-fill" style="width:${x.cantidad / max * 100}%"></div></div><b>${x.cantidad}</b></div>`).join("")
    : '<div class="empty">Sin datos</div>';
}

(async () => {
  if (!await initLayout("reportes")) return;
  setLoading("pa", 1, "Cargando reporte...");
  setLoading("dt", 1, "Cargando reporte...");
  setLoading("pt", 1, "Cargando reporte...");
  try {
    const report = await apiGet("/api/reportes");
    a.textContent = report.totales.areas;
    p.textContent = report.totales.procesos;
    c.textContent = report.totales.criticos;
    d.textContent = report.totales.documentos;
    bars(pa, report.procesos_por_area);
    bars(dt, report.documentos_por_tipo);
    bars(pt, report.procesos_por_tipo);
  } catch (error) {
    showMsg(error.message, "error");
  }
})();
