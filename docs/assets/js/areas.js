let currentUser = null;
let cache = [];
let areasMeta = [];

function closeForm() { modal.hidden = true; }

function fillAreaFilter() {
  areaFilter.innerHTML = '<option value="">Todas las áreas</option>' +
    areasMeta.map((area) => `<option value="${area.id}">${esc(area.nombre)}</option>`).join("");
}

function openForm(area = null) {
  id.value = area?.id || "";
  codigo.value = area?.codigo || "";
  nombre.value = area?.nombre || "";
  responsable_area.value = area?.responsable_area || "";
  nombre_personal.value = area?.nombre_personal || "";
  descripcion.value = area?.descripcion || "";
  estado.value = area?.estado || "Activo";
  formTitle.textContent = area ? "Editar área" : "Nueva área";
  modal.hidden = false;
}

function updateStats() {
  const responsables = cache.filter((x) => x.responsable_area).length;
  const personal = cache.filter((x) => x.nombre_personal).length;
  const procesos = cache.reduce((acc, x) => acc + Number(x.total_procesos || 0), 0);
  areasCount.textContent = cache.length;
  areasResp.textContent = responsables;
  areasPersonal.textContent = personal;
  areasProc.textContent = procesos;
}

async function loadAreaMeta() {
  const data = await apiGet('/api/areas');
  areasMeta = data.areas || [];
  fillAreaFilter();
}

async function load() {
  setLoading("rows", 6, "Cargando áreas...");
  try {
    const params = new URLSearchParams();
    if (q.value) params.set("q", q.value);
    if (areaFilter.value) params.set("area_id", areaFilter.value);
    if (estadoFilter.value) params.set("estado", estadoFilter.value);
    const data = await apiGet(`/api/areas?${params}`);
    cache = data.areas || [];
    updateStats();
    rows.innerHTML = cache.length
      ? cache.map((area) => `
        <tr>
          <td><span class="badge">${esc(area.codigo)}</span></td>
          <td><div class="cell-title"><strong>${esc(area.nombre)}</strong></div></td>
          <td>${esc(area.responsable_area || "-")}</td>
          <td><span class="badge">${Number(area.total_procesos || 0)} procesos</span></td>
          <td>${area.estado === "Inactivo" ? '<span class="status-inactive">Inactivo</span>' : '<span class="status-active">Activo</span>'}</td>
          ${currentUser.rol === "administrador"
            ? `<td class="admin-only-column"><div class="action-row"><button class="btn btn-secondary btn-sm" onclick="openForm(cache.find(x=>x.id===${area.id}))">Editar</button><button class="btn btn-danger btn-sm" onclick="removeArea(${area.id})">Eliminar</button></div></td>`
            : ""}
        </tr>`).join("")
      : `<tr><td colspan="${currentUser?.rol === 'administrador' ? 6 : 5}" class="empty">No hay áreas para mostrar.</td></tr>`;
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="${currentUser?.rol === 'administrador' ? 6 : 5}" class="empty">No se pudo cargar la información.</td></tr>`;
    showMsg(error.message, "error");
  }
}

async function removeArea(areaId) {
  if (!confirm("¿Eliminar esta área?")) return;
  try {
    await apiDelete(`/api/areas/${areaId}`);
    showMsg("Área eliminada");
    await Promise.all([loadAreaMeta(), load()]);
  } catch (error) {
    showMsg(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    codigo: codigo.value,
    nombre: nombre.value,
    responsable_area: responsable_area.value,
    nombre_personal: nombre_personal.value,
    descripcion: descripcion.value,
    estado: estado.value,
  };
  try {
    id.value ? await apiPut(`/api/areas/${id.value}`, body) : await apiPost("/api/areas", body);
    closeForm();
    showMsg("Área guardada");
    await Promise.all([loadAreaMeta(), load()]);
  } catch (error) {
    showMsg(error.message, "error");
  }
});

(async () => {
  currentUser = await initLayout("areas");
  if (!currentUser) return;
  await loadAreaMeta();
  await load();
})();
