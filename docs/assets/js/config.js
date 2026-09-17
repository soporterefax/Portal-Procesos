window.APP_CONFIG = {
  API_URL:
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:8000"
      : "https://portal-procesos-api-refax-fjdpgdf3dea2fbfe.centralus-01.azurewebsites.net"
};
