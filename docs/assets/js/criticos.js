let currentUser = null;
let criticalProcesses = [];
let criticalManuals = [];
let criticalPolicies = [];
let areas = [];

function showTab(tab) {
  const tabs = ["procesos", "manuales", "politicas"];
  tabs.forEach((key) => {
    const panel = document.getElementById(`panel${key.charAt(0).toUpperCase()}${key.slice(1)}`);
    const button = document.getElementById(`tab${key.charAt(0).toUpperCase()}${key.slice(1)}`);
    const active = key === tab;
    if (panel) panel.hidden = !active;
    if (button) {
      button.classList.toggle("btn-primary", active);
      button.classList.toggle("btn-secondary", !active);
    }
  });
}

function fillAreas() {
  const options = areas
    .filter((a) => String(a.estado || "Activo").toLowerCase() !== "inactivo")
    .map((a) => `<option value="${a.id}">${esc(a.nombre)}</option>`)
    .join("");
  areaFilter.innerHTML = '<option value="">Todas las áreas</option>' + options;
}

function criticalBadge() {
  return '<span class="badge-red">Crítico</span>';
}

function processFileCount(proceso) {
  return Number(proceso?.total_documentos || 0);
}

async function openCriticalProcessFiles(procesoId) {
  try {
    const data = await apiGet(`/api/procesos/${procesoId}`);
    const proceso = data.proceso;
    const docs = (proceso.documentos || []).filter(
      (d) => String(d.estado || "Activo").toLowerCase() !== "inactivo" && fileEntries(d).length
    );

    if (!docs.length) {
      showMsg("Este proceso crítico no tiene archivos disponibles.", "error");
      return;
    }

    // Reutilizamos el modal compartido y construimos el contenido de todos los documentos.
    openFilesModal(docs[0], {
      title: proceso.nombre || "Proceso crítico",
      subtitle: [proceso.codigo, proceso.area?.nombre, `${docs.length} documento(s)`].filter(Boolean).join(" · "),
    });

    const content = document.getElementById("sharedFilesContent");
    if (!content) return;
    content.innerHTML = docs.map((doc) => {
      const entries = fileEntries(doc);
      return `
        <div class="quick-item">
          <span class="tag">${esc(doc.tipo || "Documento")}</span>
          <strong style="display:block;margin:8px 0 10px">${esc(doc.nombre || "Archivo")}</strong>
          <div class="action-row" style="justify-content:flex-start;flex-wrap:wrap">
            ${entries.map((entry) => `
              <a class="btn btn-secondary btn-sm" href="${esc(entry.url)}" target="_blank" rel="noopener noreferrer">
                ${entry.icon} ${esc(entry.label)}
              </a>`).join("")}
          </div>
        </div>`;
    }).join("");
  } catch (error) {
    showMsg(error.message || "No fue posible consultar los archivos.", "error");
  }
}

function openCriticalDocumentFiles(docId, collection) {
  const source = collection === "manuales" ? criticalManuals : criticalPolicies;
  const doc = source.find((x) => Number(x.id) === Number(docId));
  if (!doc) return;
  const proceso = doc.proceso || {};
  openFilesModal(doc, {
    title: doc.nombre || "Archivo crítico",
    subtitle: [doc.tipo, proceso.codigo, proceso.area?.nombre].filter(Boolean).join(" · "),
  });
}

function renderProcesses() {
  rowsProcesos.innerHTML = criticalProcesses.length
    ? criticalProcesses.map((p) => `
      <tr>
        <td><div class="cell-title"><strong>${esc(p.nombre)}</strong><span class="cell-sub">${esc(p.codigo)}</span></div></td>
        <td>${esc(p.area?.nombre || "-")}</td>
        <td>${criticalBadge()}</td>
        <td>${processFileCount(p) > 0
          ? `<button class="btn btn-secondary btn-sm" type="button" onclick="openCriticalProcessFiles(${p.id})">📂 Ver archivos (${processFileCount(p)})</button>`
          : '<span class="muted">Sin archivos</span>'}</td>
      </tr>`).join("")
    : '<tr><td colspan="4" class="empty">No hay procesos críticos activos para mostrar.</td></tr>';
}

function renderDocuments(target, items, collection, label) {
  target.innerHTML = items.length
    ? items.map((doc) => `
      <tr>
        <td><div class="cell-title"><strong>${esc(doc.nombre)}</strong>${doc.version ? `<span class="cell-sub">Versión ${esc(doc.version)}</span>` : ""}</div></td>
        <td><div class="cell-title"><strong>${esc(doc.proceso?.nombre || "-")}</strong><span class="cell-sub">${esc(doc.proceso?.codigo || "")}</span></div></td>
        <td>${esc(doc.proceso?.area?.nombre || "-")}</td>
        <td>${criticalBadge()}</td>
        <td>${fileEntries(doc).length
          ? `<button class="btn btn-secondary btn-sm" type="button" onclick="openCriticalDocumentFiles(${doc.id}, '${collection}')">📂 Ver archivos (${fileEntries(doc).length})</button>`
          : '<span class="muted">Sin archivos</span>'}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty">No hay ${esc(label.toLowerCase())} críticos activos para mostrar.</td></tr>`;
}

async function loadMeta() {
  const data = await apiGet("/api/procesos/meta");
  areas = data.areas || [];
  fillAreas();
}

async function loadAll() {
  setLoading("rowsProcesos", 4, "Cargando procesos críticos...");
  setLoading("rowsManuales", 5, "Cargando manuales críticos...");
  setLoading("rowsPoliticas", 5, "Cargando políticas críticas...");

  const common = new URLSearchParams({ estado: "Activo", critico: "true" });
  if (q.value.trim()) common.set("q", q.value.trim());
  if (areaFilter.value) common.set("area_id", areaFilter.value);

  try {
    const processParams = new URLSearchParams(common);
    const manualParams = new URLSearchParams(common);
    manualParams.set("tipo", "Manual");
    const policyParams = new URLSearchParams(common);
    policyParams.set("tipo", "Política");

    const [pData, mData, polData] = await Promise.all([
      apiGet(`/api/procesos?${processParams.toString()}`),
      apiGet(`/api/documentos?${manualParams.toString()}`),
      apiGet(`/api/documentos?${policyParams.toString()}`),
    ]);

    criticalProcesses = (pData.procesos || []).filter((p) => p.es_critico && String(p.estado || "Activo").toLowerCase() !== "inactivo");
    criticalManuals = (mData.documentos || []).filter((d) => d.proceso?.es_critico && String(d.estado || "Activo").toLowerCase() !== "inactivo");
    criticalPolicies = (polData.documentos || []).filter((d) => d.proceso?.es_critico && String(d.estado || "Activo").toLowerCase() !== "inactivo");

    kProcesosCriticos.textContent = criticalProcesses.length;
    kManualesCriticos.textContent = criticalManuals.length;
    kPoliticasCriticas.textContent = criticalPolicies.length;

    renderProcesses();
    renderDocuments(rowsManuales, criticalManuals, "manuales", "Manuales");
    renderDocuments(rowsPoliticas, criticalPolicies, "politicas", "Políticas");
  } catch (error) {
    showMsg(error.message || "No fue posible cargar la sección de críticos.", "error");
  }
}

q.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadAll();
});

(async () => {
  currentUser = await initLayout("criticos");
  if (!currentUser) return;
  await loadMeta();
  await loadAll();
})();
