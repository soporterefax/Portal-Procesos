let currentUser = null;
let cache = [];
let procesos = [];
let tipos = [];

function closeForm() { modal.hidden = true; }

function fillMeta() {
  const options = procesos.map((p) => `<option value="${p.id}">${esc(p.codigo)} · ${esc(p.nombre)}</option>`).join("");
  proceso_id.innerHTML = '<option value="">Seleccione...</option>' + options;
  procesoFilter.innerHTML = '<option value="">Todos los procesos</option>' + options;
  tipoFilter.innerHTML = '<option value="">Todos los tipos</option>' + tipos.map((t) => `<option>${esc(t)}</option>`).join("");
}

function openForm(documento = null) {
  id.value = documento?.id || "";
  proceso_id.value = documento?.proceso_id || "";
  tipo.value = documento?.tipo || "";
  nombre.value = documento?.nombre || "";
  version.value = documento?.version || "";
  fecha_actualizacion.value = documento?.fecha_actualizacion || "";
  enlace_doc.value = documento?.enlace_doc || "";
  enlace_fluj.value = documento?.enlace_fluj || "";
  enlace_fluj1.value = documento?.enlace_fluj1 || "";
  enlace_fluj2.value = documento?.enlace_fluj2 || "";
  enlace_fluj3.value = documento?.enlace_fluj3 || "";
  formTitle.textContent = documento ? "Editar documento" : "Nuevo documento";
  modal.hidden = false;
}

async function meta() {
  const data = await apiGet("/api/documentos/meta");
  procesos = data.procesos || [];
  tipos = data.tipos || [];
  fillMeta();
}

function safeUrl(value) {
  if (!value) return null;
  let url = String(value).trim();
  if (/^www\./i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch (_) {
    return null;
  }
}

function links(documento) {
  const entries = [
    ["Abrir documento", documento.enlace_doc, "doc"],
    ["Flujograma 1", documento.enlace_fluj, "flow"],
    ["Flujograma 2", documento.enlace_fluj1, "flow"],
    ["Flujograma 3", documento.enlace_fluj2, "flow"],
    ["Flujograma 4", documento.enlace_fluj3, "flow"],
  ].map(([label, url, type]) => [label, safeUrl(url), type]).filter(([, url]) => url);

  if (!entries.length) return '<span class="muted">Sin enlace</span>';
  return `<div class="doc-links">${entries.map(([label, url, type]) =>
    `<a class="doc-link ${type === "doc" ? "primary" : ""}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${type === "doc" ? "↗" : "⌁"} ${esc(label)}</a>`
  ).join("")}</div>`;
}

function updateStats() {
  docCount.textContent = cache.length;
  docMainLinks.textContent = cache.filter((x) => safeUrl(x.enlace_doc)).length;
  docTypes.textContent = new Set(cache.map((x) => x.tipo).filter(Boolean)).size;
  docProcesos.textContent = new Set(cache.map((x) => x.proceso?.id).filter(Boolean)).size;
}

async function load() {
  setLoading("rows", 7, "Cargando documentos...");
  try {
    const params = new URLSearchParams();
    if (q.value) params.set("q", q.value);
    if (procesoFilter.value) params.set("proceso_id", procesoFilter.value);
    if (tipoFilter.value) params.set("tipo", tipoFilter.value);
    const data = await apiGet(`/api/documentos?${params}`);
    cache = data.documentos;
    updateStats();
    rows.innerHTML = cache.length
      ? cache.map((x) => `
        <tr>
          <td>
            <div class="cell-title">
              <strong>${esc(x.nombre)}</strong>
              <span class="cell-sub">Enlace importado desde la carga inicial</span>
            </div>
          </td>
          <td>${x.tipo ? `<span class="tag tag-doc">${esc(x.tipo)}</span>` : '<span class="muted">-</span>'}</td>
          <td>
            <div class="cell-title">
              <strong>${esc(x.proceso?.codigo || "")}</strong>
              <span class="cell-sub">${esc(x.proceso?.nombre || "")}</span>
            </div>
          </td>
          <td>${esc(x.version || "-")}</td>
          <td>${esc(x.fecha_actualizacion || "-")}</td>
          <td>${links(x)}</td>
          ${currentUser.rol === "administrador"
            ? `<td class="admin-only-column"><div class="action-row"><button class="btn btn-secondary btn-sm" onclick="openForm(cache.find(y=>y.id===${x.id}))">Editar</button>
               <button class="btn btn-danger btn-sm" onclick="removeD(${x.id})">Eliminar</button></div></td>`
            : ''}
        </tr>`).join("")
      : `<tr><td colspan="${currentUser?.rol === 'administrador' ? 7 : 6}" class="empty">No hay documentos para mostrar.</td></tr>`;
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="${currentUser?.rol === 'administrador' ? 7 : 6}" class="empty">No se pudo cargar la información.</td></tr>`;
    showMsg(error.message, "error");
  }
}

async function removeD(documentId) {
  if (!confirm("¿Eliminar este documento?")) return;
  try {
    await apiDelete(`/api/documentos/${documentId}`);
    showMsg("Documento eliminado");
    await Promise.all([meta(), load()]);
  } catch (error) {
    showMsg(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    proceso_id: proceso_id.value,
    tipo: tipo.value,
    nombre: nombre.value,
    version: version.value,
    fecha_actualizacion: fecha_actualizacion.value,
    enlace_doc: enlace_doc.value,
    enlace_fluj: enlace_fluj.value,
    enlace_fluj1: enlace_fluj1.value,
    enlace_fluj2: enlace_fluj2.value,
    enlace_fluj3: enlace_fluj3.value,
  };
  try {
    id.value ? await apiPut(`/api/documentos/${id.value}`, body) : await apiPost("/api/documentos", body);
    closeForm();
    showMsg("Documento guardado");
    await Promise.all([meta(), load()]);
  } catch (error) {
    showMsg(error.message, "error");
  }
});

(async () => {
  currentUser = await initLayout("documentos");
  if (!currentUser) return;
  setLoading("rows", 7, "Cargando documentos...");
  try {
    await Promise.all([meta(), load()]);
  } catch (error) {
    showMsg(error.message, "error");
  }
})();
