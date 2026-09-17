let currentUser = null;

function formatDate(value) {
  if (!value) return "-";
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

function parseDetail(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch (_) { return null; }
}

function renderResult(detail) {
  const data = parseDetail(detail);
  if (!data) {
    syncResult.innerHTML = '<div class="empty">Sin detalle disponible.</div>';
    return;
  }
  const cards = [
    ["Áreas", data.areas, "creadas", "actualizadas", "omitidas"],
    ["Procesos", data.procesos, "creados", "actualizados", "omitidos"],
    ["Documentos", data.documentos, "creados", "actualizados", "omitidos"],
  ];
  syncResult.innerHTML = cards.map(([label, item, createdKey, updatedKey, skippedKey]) => `
    <div class="sync-result-row">
      <strong>${label}</strong>
      <span>${Number(item?.[createdKey] || 0)} nuevos</span>
      <span>${Number(item?.[updatedKey] || 0)} actualizados</span>
      <span>${Number(item?.[skippedKey] || 0)} omitidos</span>
    </div>`).join("");
}

function renderStatus(data) {
  const graph = data.graph || {};
  const last = data.ultima;
  graphStatus.textContent = graph.conectado ? "Conectado" : "Pendiente";
  graphStatus.className = graph.conectado ? "sync-ok" : "sync-warn";
  graphStatusSub.textContent = graph.conectado
    ? "Microsoft Graph disponible"
    : (graph.error || "Falta completar la configuración");

  const file = graph.archivo || {};
  sourceFile.textContent = file.name || last?.archivo || "-";
  sourceModified.textContent = file.lastModifiedDateTime
    ? `Modificado: ${new Date(file.lastModifiedDateTime).toLocaleString("es-PE")}`
    : "-";
  if (file.webUrl) {
    sourceUrl.innerHTML = `<a class="doc-link primary" href="${esc(file.webUrl)}" target="_blank" rel="noopener noreferrer">↗ Abrir archivo fuente</a>`;
  } else {
    sourceUrl.textContent = graph.error || "Archivo no disponible";
  }

  lastSyncDate.textContent = last?.finalizado_en ? formatDate(last.finalizado_en) : "Nunca";
  lastSyncUser.textContent = last?.usuario
    ? `Ejecutada por ${last.usuario.nombre || last.usuario.username}`
    : "Sin historial todavía";
  lastSyncStatus.textContent = last?.estado || "Sin historial";
  lastSyncStatus.className = last?.estado === "Completada" ? "sync-ok" : (last?.estado === "Error" ? "sync-error" : "");
  lastSyncMessage.textContent = last?.mensaje || "-";
  renderResult(last?.detalle_json);
}

async function loadSyncStatus() {
  try {
    const data = await apiGet("/api/sincronizacion");
    renderStatus(data);
  } catch (error) {
    showMsg(error.message, "error");
  }
}

async function runSync() {
  if (!confirm("¿Actualizar ahora la información desde OneDrive/SharePoint?")) return;
  syncBtn.disabled = true;
  syncBtn.textContent = "Sincronizando...";
  showMsg("Descargando e importando el archivo. Esto puede tardar unos segundos.");
  try {
    const data = await apiPostLong("/api/sincronizacion/ejecutar", {});
    showMsg("Sincronización completada correctamente.");
    renderStatus({
      graph: { conectado: true, archivo: data.archivo },
      ultima: data.sincronizacion,
    });
    renderResult(data.resultado);
  } catch (error) {
    showMsg(error.message, "error");
    await loadSyncStatus();
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = "↻ Actualizar desde OneDrive";
  }
}

syncBtn.addEventListener("click", runSync);

(async () => {
  currentUser = await initLayout("sincronizacion");
  if (!currentUser) return;
  if (currentUser.rol !== "administrador") {
    location.href = "dashboard.html";
    return;
  }
  await loadSyncStatus();
})();
