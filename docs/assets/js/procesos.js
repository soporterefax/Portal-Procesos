let currentUser = null;
let cache = [];
let areas = [];


/* =========================================================
   ELEMENTOS
========================================================= */

const modal = document.getElementById("modal");
const filesModal = document.getElementById("filesModal");

const rows = document.getElementById("rows");

const q = document.getElementById("q");
const areaFilter = document.getElementById("areaFilter");
const estadoFilter = document.getElementById("estadoFilter");

const form = document.getElementById("form");
const formTitle = document.getElementById("formTitle");

const id = document.getElementById("id");
const codigo = document.getElementById("codigo");
const area_id = document.getElementById("area_id");
const nombre = document.getElementById("nombre");
const tipo = document.getElementById("tipo");
const estado = document.getElementById("estado");

const responsable = document.getElementById("responsable");
const persona_responsable =
  document.getElementById("persona_responsable");

const objetivo = document.getElementById("objetivo");

const areas_relacionadas =
  document.getElementById("areas_relacionadas");

const fecha_actualizacion =
  document.getElementById("fecha_actualizacion");

const es_critico =
  document.getElementById("es_critico");

const filesTitle =
  document.getElementById("filesTitle");

const filesSubtitle =
  document.getElementById("filesSubtitle");

const filesContent =
  document.getElementById("filesContent");


/* =========================================================
   URL SEGURA
========================================================= */

function safeUrl(value) {

  if (!value) return null;

  let url = String(value).trim();

  if (!url) return null;


  if (/^www\./i.test(url)) {
    url = `https://${url}`;
  }


  try {

    const parsed = new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return null;
    }

    return parsed.href;

  }
  catch (_) {

    return null;

  }

}


/* =========================================================
   MODAL PROCESO
========================================================= */

function closeForm() {

  modal.hidden = true;

}


function openForm(proceso = null) {

  id.value =
    proceso?.id || "";

  codigo.value =
    proceso?.codigo || "";

  area_id.value =
    proceso?.area_id || "";

  nombre.value =
    proceso?.nombre || "";

  tipo.value =
    proceso?.tipo || "";

  estado.value =
    proceso?.estado || "Activo";

  responsable.value =
    proceso?.responsable || "";

  persona_responsable.value =
    proceso?.persona_responsable || "";

  objetivo.value =
    proceso?.objetivo || "";

  areas_relacionadas.value =
    proceso?.areas_relacionadas || "";

  fecha_actualizacion.value =
    proceso?.fecha_actualizacion || "";

  es_critico.checked =
    !!proceso?.es_critico;


  formTitle.textContent =
    proceso
      ? "Editar proceso"
      : "Nuevo proceso";


  modal.hidden = false;

}


/* =========================================================
   MODAL ARCHIVOS
========================================================= */

function closeFiles() {

  filesModal.hidden = true;

  filesContent.innerHTML = "";

}


/* =========================================================
   CREAR BOTÓN DE ARCHIVO
========================================================= */

function archivoLink(
  label,
  url,
  icon = "📄"
) {

  const safe =
    safeUrl(url);

  if (!safe) {
    return "";
  }


  return `
    <a
      class="btn btn-secondary btn-sm"
      href="${esc(safe)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${icon} ${esc(label)}
    </a>
  `;

}


/* =========================================================
   MOSTRAR DOCUMENTO
========================================================= */

function renderDocumento(documento) {

  const enlaces = [

    archivoLink(
      "Abrir documento",
      documento.enlace_doc,
      "📄"
    ),

    archivoLink(
      "Flujograma",
      documento.enlace_fluj,
      "↗"
    ),

    archivoLink(
      "Flujograma 2",
      documento.enlace_fluj1,
      "↗"
    ),

    archivoLink(
      "Flujograma 3",
      documento.enlace_fluj2,
      "↗"
    ),

    archivoLink(
      "Flujograma 4",
      documento.enlace_fluj3,
      "↗"
    )

  ].filter(Boolean);


  if (!enlaces.length) {

    return "";

  }


  const tipoDocumento =
    documento.tipo ||
    "Documento";


  return `
    <div class="quick-item">

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:15px;
          align-items:flex-start;
          flex-wrap:wrap;
        "
      >

        <div>

          <span class="tag">
            ${esc(tipoDocumento)}
          </span>

          <strong
            style="
              margin-top:8px;
              display:block;
            "
          >
            ${esc(
              documento.nombre ||
              "Documento"
            )}
          </strong>

          ${
            documento.version
              ? `
                  <small>
                    Versión:
                    ${esc(documento.version)}
                  </small>
                `
              : ""
          }

        </div>


        <div
          class="action-row"
          style="
            justify-content:flex-end;
          "
        >

          ${enlaces.join("")}

        </div>

      </div>

    </div>
  `;

}


/* =========================================================
   ABRIR ARCHIVOS DEL PROCESO
========================================================= */

async function openFiles(procesoId) {

  filesModal.hidden = false;

  filesTitle.textContent =
    "Cargando...";

  filesSubtitle.textContent =
    "";

  filesContent.innerHTML = `
    <div class="loading-block">

      <span class="spinner"></span>

      Consultando archivos...

    </div>
  `;


  try {

    const response =
      await apiGet(
        `/api/procesos/${procesoId}`
      );


    const proceso =
      response.proceso;


    filesTitle.textContent =
      proceso.nombre ||
      "Archivos";


    filesSubtitle.textContent =
      `${proceso.codigo || ""}${
        proceso.area?.nombre
          ? " · " + proceso.area.nombre
          : ""
      }`;


    /*
      Solo mostrar documentos activos.
    */

    const documentos =
      (proceso.documentos || [])
        .filter(
          (documento) =>
            String(
              documento.estado ||
              "Activo"
            ).toLowerCase()
            !== "inactivo"
        );


    const contenido =
      documentos
        .map(renderDocumento)
        .filter(Boolean);


    if (!contenido.length) {

      filesContent.innerHTML = `
        <div class="empty">
          Este proceso no tiene archivos disponibles.
        </div>
      `;

      return;

    }


    filesContent.innerHTML =
      contenido.join("");


  }
  catch (error) {

    filesTitle.textContent =
      "Archivos";

    filesContent.innerHTML = `
      <div class="message error">
        ${esc(
          error.message ||
          "No fue posible consultar los archivos."
        )}
      </div>
    `;

  }

}


/* =========================================================
   ESTADO DEL PROCESO
========================================================= */

function estadoVisual(proceso) {

  if (proceso.es_critico) {

    return `
      <span class="badge-red">
        Crítico
      </span>
    `;

  }


  return `
    <span class="status-active">
      Activo
    </span>
  `;

}


/* =========================================================
   ÁREAS
========================================================= */

function fillAreas() {

  const opciones =
    areas
      .filter(
        area =>
          String(
            area.estado ||
            "Activo"
          ).toLowerCase()
          !== "inactivo"
      )
      .map(
        area => `
          <option value="${area.id}">
            ${esc(area.nombre)}
          </option>
        `
      )
      .join("");


  area_id.innerHTML =
    `
      <option value="">
        Seleccione...
      </option>
    ` +
    opciones;


  areaFilter.innerHTML =
    `
      <option value="">
        Todas las áreas
      </option>
    ` +
    opciones;

}


/* =========================================================
   METADATA
========================================================= */

async function meta() {

  const data =
    await apiGet(
      "/api/procesos/meta"
    );


  areas =
    data.areas || [];


  fillAreas();

}


/* =========================================================
   LISTAR PROCESOS
========================================================= */

async function load() {

  setLoading(
    "rows",
    currentUser?.rol === "administrador"
      ? 5
      : 4,
    "Cargando procesos..."
  );


  try {

    const params =
      new URLSearchParams();


    /*
      Búsqueda
    */

    if (q.value.trim()) {

      params.set(
        "q",
        q.value.trim()
      );

    }


    /*
      Área
    */

    if (areaFilter.value) {

      params.set(
        "area_id",
        areaFilter.value
      );

    }


    /*
      Siempre ocultamos los inactivos.
    */

    params.set(
      "estado",
      "Activo"
    );


    /*
      Si selecciona crítico,
      adicionalmente filtramos por criticidad.
    */

    if (
      estadoFilter.value ===
      "Critico"
    ) {

      params.set(
        "critico",
        "true"
      );

    }


    const data =
      await apiGet(
        `/api/procesos?${params.toString()}`
      );


    cache =
      data.procesos || [];


    /*
      Seguridad adicional:
      nunca mostrar inactivos.
    */

    cache =
      cache.filter(
        proceso =>
          String(
            proceso.estado ||
            "Activo"
          ).toLowerCase()
          !== "inactivo"
      );


    if (!cache.length) {

      rows.innerHTML = `
        <tr>
          <td
            colspan="${
              currentUser?.rol ===
              "administrador"
                ? 5
                : 4
            }"
            class="empty"
          >
            No hay procesos para mostrar.
          </td>
        </tr>
      `;

      return;

    }


    rows.innerHTML =
      cache
        .map(
          proceso => `
            <tr>

              <!-- PROCESO -->
              <td>

                <div class="cell-title">

                  <button
                    type="button"
                    onclick="openFiles(${proceso.id})"
                    style="
                      border:0;
                      background:none;
                      padding:0;
                      text-align:left;
                      cursor:pointer;
                      color:inherit;
                      font:inherit;
                    "
                    title="Abrir archivos del proceso"
                  >
                    <strong>
                      ${esc(proceso.nombre)}
                    </strong>
                  </button>

                  <span class="cell-sub">
                    ${esc(proceso.codigo)}
                  </span>

                </div>

              </td>


              <!-- ÁREA -->
              <td>

                ${esc(
                  proceso.area?.nombre ||
                  "-"
                )}

              </td>


              <!-- ESTADO -->
              <td>

                ${estadoVisual(proceso)}

              </td>


              <!-- ARCHIVOS -->
              <td>

                ${
                  proceso.total_documentos > 0
                    ? `
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        onclick="openFiles(${proceso.id})"
                      >
                        📂 Ver archivos
                        (${proceso.total_documentos})
                      </button>
                    `
                    : `
                      <span class="muted">
                        Sin archivos
                      </span>
                    `
                }

              </td>


              ${
                currentUser.rol ===
                "administrador"
                  ? `
                    <!-- ACCIONES -->
                    <td class="admin-only-column">

                      <div class="action-row">

                        <button
                          class="btn btn-secondary btn-sm"
                          type="button"
                          onclick="
                            openForm(
                              cache.find(
                                item =>
                                  item.id ===
                                  ${proceso.id}
                              )
                            )
                          "
                        >
                          Editar
                        </button>


                        <button
                          class="btn btn-danger btn-sm"
                          type="button"
                          onclick="
                            removeP(
                              ${proceso.id}
                            )
                          "
                        >
                          Eliminar
                        </button>

                      </div>

                    </td>
                  `
                  : ""
              }

            </tr>
          `
        )
        .join("");


  }
  catch (error) {

    showMsg(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   ELIMINAR
========================================================= */

async function removeP(procesoId) {

  const confirmar =
    confirm(
      "¿Eliminar este proceso?"
    );


  if (!confirmar) {
    return;
  }


  try {

    await apiDelete(
      `/api/procesos/${procesoId}`
    );


    showMsg(
      "Proceso eliminado"
    );


    await load();


  }
  catch (error) {

    showMsg(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   GUARDAR PROCESO
========================================================= */

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const body = {

      codigo:
        codigo.value,

      area_id:
        area_id.value,

      nombre:
        nombre.value,

      tipo:
        tipo.value,

      estado:
        estado.value,

      responsable:
        responsable.value,

      persona_responsable:
        persona_responsable.value,

      objetivo:
        objetivo.value,

      es_critico:
        es_critico.checked,

      areas_relacionadas:
        areas_relacionadas.value,

      fecha_actualizacion:
        fecha_actualizacion.value

    };


    try {

      if (id.value) {

        await apiPut(
          `/api/procesos/${id.value}`,
          body
        );

      }
      else {

        await apiPost(
          "/api/procesos",
          body
        );

      }


      closeForm();


      showMsg(
        "Proceso guardado"
      );


      await load();


    }
    catch (error) {

      showMsg(
        error.message,
        "error"
      );

    }

  }
);


/* =========================================================
   ENTER EN BÚSQUEDA
========================================================= */

q.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Enter"
    ) {

      load();

    }

  }
);


/* =========================================================
   CERRAR MODALES AL HACER CLICK FUERA
========================================================= */

filesModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      filesModal
    ) {

      closeFiles();

    }

  }
);


modal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      modal
    ) {

      closeForm();

    }

  }
);


/* =========================================================
   INICIO
========================================================= */

(async () => {

  currentUser =
    await initLayout(
      "procesos"
    );


  if (!currentUser) {
    return;
  }


  await meta();

  await load();

})();