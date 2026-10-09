# Portal de Gestión de Procesos

Aplicación web desarrollada para centralizar la gestión, consulta y actualización de procesos, documentos y recursos internos de una organización.

El sistema permite administrar información de manera estructurada, controlar accesos por rol y sincronizar datos desde una fuente corporativa en SharePoint.

## Funcionalidades principales

- Dashboard general de procesos y documentos.
- Gestión de áreas.
- Consulta de procesos.
- Consulta de documentos, guías, manuales y políticas.
- Sección de procesos críticos.
- Filtros por área, estado y nombre.
- Acceso a archivos relacionados.
- Administración de usuarios.
- Control de permisos por rol.
- Sincronización de información desde SharePoint.
- Registro de últimas sincronizaciones.

## Roles

El portal trabaja con dos perfiles principales:

**Administrador**
- Gestiona usuarios.
- Ejecuta sincronizaciones.
- Administra información del portal.
- Accede a funciones administrativas.

**Usuario**
- Consulta la información disponible.
- Accede a procesos y documentación.
- Trabaja en modo de solo lectura.

## Arquitectura

El sistema utiliza una arquitectura web separada en:

```text
Frontend
   ↓
API Backend
   ↓
Base de datos