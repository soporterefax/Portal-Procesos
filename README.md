# Portal de Gestión de Procesos — versión consolidada

Esta es la base única del proyecto. Ya no es necesario copiar archivos desde los ZIP de pasos anteriores.

## Incluye

- Frontend estático en `docs/` preparado para GitHub Pages.
- Backend Flask API en `backend/` preparado para Azure App Service.
- SQLAlchemy con SQLite como fallback local y Azure Database for MySQL mediante variables de entorno.
- JWT para autenticación.
- Roles administrador/consulta.
- CRUD de Áreas, Procesos y Documentos.
- Dashboard y Reportes.
- CORS configurable.
- Conexión MySQL con TLS.
- GitHub Actions para desplegar el backend a Azure App Service.

## Desarrollo local

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
flask --app app init-db
flask --app app create-admin
python app.py
```

API local: `http://127.0.0.1:8000`

### Frontend

Desde la raíz, en otra terminal:

```powershell
python -m http.server 5500 --directory docs
```

Frontend local: `http://127.0.0.1:5500`

## Azure / GitHub

Consulta `DEPLOYMENT.md`.

## Mejoras de rendimiento y administración (2026-09)

Esta versión incorpora:
- caché de usuario en `sessionStorage` para evitar consultar `/api/auth/me` en cada página;
- carga paralela de metadatos y listados en Procesos y Documentos;
- `selectinload` en listados para reducir consultas N+1 a MySQL;
- comando `flask --app app optimize-db` para crear índices de rendimiento sin duplicarlos;
- sidebar expandible/compacto con estado persistente;
- módulo `/api/usuarios` y `usuarios.html`, exclusivo de administradores;
- creación/restablecimiento de contraseñas por admin; la contraseña actual nunca se almacena en texto legible;
- apertura directa de documentos y flujogramas mediante los enlaces importados desde Excel.

Después de actualizar el backend, ejecutar una sola vez desde `backend/` (con el `.env` apuntando a Azure MySQL):

```powershell
flask --app app optimize-db
```


## Ajustes de perfiles e identidad visual (2026-09)
- Perfiles disponibles: **Administrador** y **Usuario**.
- Usuario: acceso de solo lectura; las rutas de escritura siguen protegidas en backend con rol administrador.
- Administrador: CRUD y gestión de usuarios/contraseñas.
- Color principal del portal actualizado de rojo a **naranja**.
- Favicon REFAX aplicado a todas las páginas.

## Actualización: páginas compactas por tipo documental

Se agregaron páginas independientes para Procesos, Documentos, Guías, Manuales y Políticas. Todas incluyen filtros por nombre, área y estado (Activo/Inactivo). Los listados se simplificaron para mostrar solo información esencial.

Antes de desplegar esta versión sobre una base existente, ejecutar una vez desde `backend`:

```bash
flask --app app upgrade-estados
flask --app app optimize-db
```

El primer comando agrega el campo `estado` a procesos y documentos sin borrar información y deja los registros existentes como `Activo`.
