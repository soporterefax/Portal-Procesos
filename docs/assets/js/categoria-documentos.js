let currentUser = null;
let cache = [];
let procesos = [];
let areas = [];

const CATEGORY = window.DOC_CATEGORY || {
  tipo: "Documento",
  key: "documentos",
  labelPlural: "Documentos",
};

function closeForm() {
  modal.hidden = true;
}

function fillMeta() {
  const procesosActivos = procesos.filter(
    (p) => String(p.estado || "Activo").toLowerCase() !== "inactivo"
  );

  const pOpts = procesosActivos
    .map((p) => `<option value="${p.id}">${esc(p.codigo)} · ${esc(p.nombre)}</option>`)
    .join("");

  proceso_id.innerHTML = '<option value="">Seleccione...</option>' + pOpts;

  const aOpts = areas
    .filter((a) => String(a.estado || "Activo").toLowerCase() !== "inactivo")
    .map((a) => `<option value="${a.id}">${esc(a.nombre)}</option>`)
    .join("");

  areaFilter.innerHTML = '<option value="">Todas las áreas</option>' + aOpts;
}

function openForm(doc = null) {
  id.value = doc?.id || "";
  proceso_id.value = doc?.proceso_id || "";
  nombre.value = doc?.nombre || "";
  version.value = doc?.version || "";
  estado.value = doc?.estado || "Activo";
  fecha_actualizacion.value = doc?.fecha_actualizacion || "";
  enlace_doc.value = doc?.enlace_doc || "";
  enlace_fluj.value = doc?.enlace_fluj || "";
  enlace_fluj1.value = doc?.enlace_fluj1 || "";
  enlace_fluj2.value = doc?.enlace_fluj2 || "";
  enlace_fluj3.value = doc?.enlace_fluj3 || "";
  formTitle.textContent = doc
    ? `Editar ${CATEGORY.tipo.toLowerCase()}`
    : `Nuevo ${CATEGORY.tipo.toLowerCase()}`;
  modal.hidden = false;
}

async function meta() {
  const data = await apiGet("/api/documentos/meta");
  procesos = data.procesos || [];
  areas = data.areas || [];
  fillMeta();
}

function estadoVisual(doc) {
  if (doc.proceso?.es_critico) {
    return '<span class="badge-red">Crítico</span>';
  }
  return '<span class="status-active">Activo</span>';
}

function openFilesModalById(docId) {
  const doc = cache.find((x) => Number(x.id) === Number(docId));
  if (!doc) return;

  const proceso = doc.proceso || {};
  const area = proceso.area?.nombre || "";
  const codigo = proceso.codigo || "";
  const subtitle = [CATEGORY.tipo, codigo, area].filter(Boolean).join(" · ");

  openFilesModal(doc, {
    title: doc.nombre || CATEGORY.tipo,
    subtitle,
  });
}

async function load() {
  setLoading(
    "rows",
    currentUser?.rol === "administrador" ? 6 : 5,
    "Cargando información..."
  );

  try {
    const params = new URLSearchParams({ tipo: CATEGORY.tipo });

    if (q.value.trim()) params.set("q", q.value.trim());
    if (areaFilter.value) params.set("area_id", areaFilter.value);

    // Nunca mostramos inactivos en estas vistas.
    params.set("estado", "Activo");

    if (estadoFilter.value === "Critico") {
      params.set("critico", "true");
    }

    const data = await apiGet(`/api/documentos?${params.toString()}`);
    cache = (data.documentos || []).filter(
      (doc) => String(doc.estado || "Activo").toLowerCase() !== "inactivo"
    );

    rows.innerHTML = cache.length
      ? cache.map((x) => `
        <tr>
          <td>
            <div class="cell-title">
              <strong>${esc(x.nombre)}</strong>
              ${x.version ? `<span class="cell-sub">Versión ${esc(x.version)}</span>` : ""}
            </div>
          </td>
          <td>
            <div class="cell-title">
              <strong>${esc(x.proceso?.nombre || "-")}</strong>
              <span class="cell-sub">${esc(x.proceso?.codigo || "")}</span>
            </div>
          </td>
          <td>${esc(x.proceso?.area?.nombre || "-")}</td>
          <td>${estadoVisual(x)}</td>
          <td>${renderFileButton(x)}</td>
          ${currentUser.rol === "administrador"
            ? `<td class="admin-only-column">
                <div class="action-row">
                  <button class="btn btn-secondary btn-sm" type="button" onclick="openForm(cache.find(y => y.id === ${x.id}))">Editar</button>
                  <button class="btn btn-danger btn-sm" type="button" onclick="removeD(${x.id})">Eliminar</button>
                </div>
              </td>`
            : ""}
        </tr>`).join("")
      : `<tr><td colspan="${currentUser?.rol === "administrador" ? 6 : 5}" class="empty">No hay ${esc(CATEGORY.labelPlural.toLowerCase())} para mostrar.</td></tr>`;
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="${currentUser?.rol === "administrador" ? 6 : 5}" class="empty">No se pudo cargar la información.</td></tr>`;
    showMsg(error.message, "error");
  }
}

async function removeD(documentId) {
  if (!confirm(`¿Eliminar este ${CATEGORY.tipo.toLowerCase()}?`)) return;

  try {
    await apiDelete(`/api/documentos/${documentId}`);
    showMsg(`${CATEGORY.tipo} eliminado`);
    await load();
  } catch (error) {
    showMsg(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const body = {
    proceso_id: proceso_id.value,
    tipo: CATEGORY.tipo,
    nombre: nombre.value,
    version: version.value,
    estado: estado.value,
    fecha_actualizacion: fecha_actualizacion.value,
    enlace_doc: enlace_doc.value,
    enlace_fluj: enlace_fluj.value,
    enlace_fluj1: enlace_fluj1.value,
    enlace_fluj2: enlace_fluj2.value,
    enlace_fluj3: enlace_fluj3.value,
  };

  try {
    if (id.value) {
      await apiPut(`/api/documentos/${id.value}`, body);
    } else {
      await apiPost("/api/documentos", body);
    }

    closeForm();
    showMsg(`${CATEGORY.tipo} guardado`);
    await Promise.all([meta(), load()]);
  } catch (error) {
    showMsg(error.message, "error");
  }
});

q.addEventListener("keydown", (event) => {
  if (event.key === "Enter") load();
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeForm();
});

(async () => {
  currentUser = await initLayout(CATEGORY.key);
  if (!currentUser) return;

  await Promise.all([meta(), load()]);
})();
