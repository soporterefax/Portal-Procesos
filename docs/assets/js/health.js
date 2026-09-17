const statusElement = document.getElementById("api-status");
const detailElement = document.getElementById("api-detail");

async function comprobarApi() {
  try {
    const data = await apiGet("/api/health");
    statusElement.textContent = "Backend conectado ✅";
    detailElement.textContent = `${data.service} · ${data.status}`;
  } catch (error) {
    statusElement.textContent = "Backend sin conexión";
    detailElement.textContent = error.message;
  }
}

comprobarApi();
