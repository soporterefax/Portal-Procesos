# Publicación final: GitHub Pages + Azure

## Arquitectura

- `docs/`: frontend estático para GitHub Pages.
- `backend/`: API Flask para Azure App Service.
- Azure Database for MySQL Flexible Server: base de datos.

## Variables del backend (Azure App Service > Environment variables)

Configura:

- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `JWT_EXP_MINUTES=480`
- `DB_HOST`
- `DB_PORT=3306`
- `DB_NAME=portal_procesos`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL=true`
- `CORS_ORIGINS=https://TU-USUARIO.github.io`

No subas estas credenciales al repositorio.

## Startup command de App Service

Usa:

`gunicorn --bind=0.0.0.0:8000 --timeout 600 app:app`

El contenido de `backend/` es lo que se despliega, por lo que `app.py` queda en la raíz del paquete desplegado.

## GitHub Actions

En GitHub configura:

### Repository variable

- `AZURE_WEBAPP_NAME`: nombre exacto del App Service.

### Repository secret

- `AZURE_WEBAPP_PUBLISH_PROFILE`: contenido del Publish Profile del App Service.

El workflow `.github/workflows/azure-backend.yml` despliega el backend cuando hay cambios en `backend/`.

## GitHub Pages

En GitHub:

Settings > Pages > Deploy from a branch

- Branch: `main`
- Folder: `/docs`

Antes de publicar, edita `docs/assets/js/config.js` y reemplaza `TU-APP-SERVICE` por el nombre real del App Service.

## Inicialización de BD

Una vez configurada la conexión a Azure MySQL, ejecuta contra el mismo entorno:

`flask --app app init-db`

Luego crea el administrador:

`flask --app app create-admin`

## Pruebas

- API: `/api/health`
- BD: `/api/health/db`
- Frontend: URL de GitHub Pages
