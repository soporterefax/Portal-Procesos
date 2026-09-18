(function () {
  function safeFileUrl(value) {
    if (!value) return null;
    let url = String(value).trim();
    if (!url) return null;
    if (/^www\./i.test(url)) url = `https://${url}`;
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
    } catch (_) {
      return null;
    }
  }

  function fileEntries(item) {
    return [
      { label: "Abrir documento", icon: "📄", url: safeFileUrl(item?.enlace_doc) },
      { label: "Flujograma 1", icon: "↗", url: safeFileUrl(item?.enlace_fluj) },
      { label: "Flujograma 2", icon: "↗", url: safeFileUrl(item?.enlace_fluj1) },
      { label: "Flujograma 3", icon: "↗", url: safeFileUrl(item?.enlace_fluj2) },
      { label: "Flujograma 4", icon: "↗", url: safeFileUrl(item?.enlace_fluj3) },
    ].filter((x) => x.url);
  }

  function ensureFilesModal() {
    if (document.getElementById("sharedFilesModal")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="sharedFilesModal" class="modal" hidden>
        <div class="modal-card" style="max-width:850px">
          <div class="panel-header">
            <div>
              <div class="eyebrow">📂 Archivos</div>
              <h2 id="sharedFilesTitle" style="margin:0 0 5px">Archivos</h2>
              <div id="sharedFilesSubtitle" class="muted"></div>
            </div>
            <button id="sharedFilesClose" type="button" class="btn btn-secondary btn-sm">Cerrar</button>
          </div>
          <div id="sharedFilesContent" class="quick-list" style="margin-top:20px"></div>
        </div>
      </div>`
    );

    const modal = document.getElementById("sharedFilesModal");
    document.getElementById("sharedFilesClose").addEventListener("click", closeFilesModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeFilesModal();
    });
  }

  function renderFileButton(item) {
    const total = fileEntries(item).length;
    if (!total) return '<span class="muted">Sin archivos</span>';

    return `<button
      type="button"
      class="btn btn-secondary btn-sm"
      onclick="openFilesModalById(${Number(item.id)})"
    >📂 Ver archivos (${total})</button>`;
  }

  function openFilesModal(item, options = {}) {
    ensureFilesModal();

    const modal = document.getElementById("sharedFilesModal");
    const title = document.getElementById("sharedFilesTitle");
    const subtitle = document.getElementById("sharedFilesSubtitle");
    const content = document.getElementById("sharedFilesContent");

    const entries = fileEntries(item);
    title.textContent = options.title || item?.nombre || "Archivos";
    subtitle.textContent = options.subtitle || "";

    if (!entries.length) {
      content.innerHTML = '<div class="empty">No hay archivos disponibles.</div>';
    } else {
      content.innerHTML = `
        <div class="quick-item">
          <div class="action-row" style="justify-content:flex-start;flex-wrap:wrap">
            ${entries.map((entry) => `
              <a
                class="btn btn-secondary btn-sm"
                href="${esc(entry.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >${entry.icon} ${esc(entry.label)}</a>
            `).join("")}
          </div>
        </div>`;
    }

    modal.hidden = false;
  }

  function closeFilesModal() {
    const modal = document.getElementById("sharedFilesModal");
    if (!modal) return;
    modal.hidden = true;
    const content = document.getElementById("sharedFilesContent");
    if (content) content.innerHTML = "";
  }

  window.safeFileUrl = safeFileUrl;
  window.fileEntries = fileEntries;
  window.renderFileButton = renderFileButton;
  window.openFilesModal = openFilesModal;
  window.closeFilesModal = closeFilesModal;
})();
