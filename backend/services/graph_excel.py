from __future__ import annotations

import os
import tempfile
from pathlib import Path
from urllib.parse import quote

import requests


GRAPH_SCOPE = "https://graph.microsoft.com/.default"
GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class GraphConfigError(RuntimeError):
    pass


def _env(name: str, required: bool = True) -> str:
    value = (os.getenv(name) or "").strip()

    if required and not value:
        raise GraphConfigError(
            f"Falta configurar {name} en las variables de entorno."
        )

    return value


def obtener_token() -> str:
    tenant_id = _env("GRAPH_TENANT_ID")
    client_id = _env("GRAPH_CLIENT_ID")
    client_secret = _env("GRAPH_CLIENT_SECRET")

    response = requests.post(
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": GRAPH_SCOPE,
            "grant_type": "client_credentials",
        },
        timeout=20,
    )

    if not response.ok:
        raise RuntimeError(
            f"No se pudo obtener token de Microsoft Graph "
            f"(HTTP {response.status_code})."
        )

    data = response.json()
    token = data.get("access_token")

    if not token:
        raise RuntimeError(
            "Microsoft Graph no devolvió un access_token."
        )

    return token


def _item_endpoint() -> tuple[str, str]:
    """
    Obtiene los endpoints de metadata y descarga del Excel.

    Prioridad:
    1. GRAPH_FILE_PATH
    2. GRAPH_ITEM_ID

    Esto permite que el portal use una ruta fija en SharePoint
    aunque GRAPH_ITEM_ID todavía exista en Azure.
    """

    drive_id = _env("GRAPH_DRIVE_ID")

    file_path = _env(
        "GRAPH_FILE_PATH",
        required=False,
    ).strip("/")

    item_id = _env(
        "GRAPH_ITEM_ID",
        required=False,
    )

    # ----------------------------------------
    # OPCIÓN PRINCIPAL: archivo por ruta
    # ----------------------------------------

    if file_path:
        # Codificamos espacios, tildes y caracteres especiales,
        # pero conservamos "/" para respetar las carpetas.
        encoded_path = quote(file_path, safe="/")

        return (
            f"{GRAPH_BASE}/drives/{drive_id}/root:/{encoded_path}",
            f"{GRAPH_BASE}/drives/{drive_id}/root:/{encoded_path}:/content",
        )

    # ----------------------------------------
    # RESPALDO: archivo por Item ID
    # ----------------------------------------

    if item_id:
        return (
            f"{GRAPH_BASE}/drives/{drive_id}/items/{item_id}",
            f"{GRAPH_BASE}/drives/{drive_id}/items/{item_id}/content",
        )

    raise GraphConfigError(
        "Configura GRAPH_FILE_PATH o GRAPH_ITEM_ID "
        "para identificar el Excel de procesos."
    )


def obtener_metadatos_archivo(
    token: str | None = None,
) -> dict:

    token = token or obtener_token()

    meta_url, _ = _item_endpoint()

    response = requests.get(
        meta_url,
        headers={
            "Authorization": f"Bearer {token}",
        },
        timeout=20,
    )

    if not response.ok:
        raise RuntimeError(
            f"No se pudo consultar el archivo en Microsoft Graph "
            f"(HTTP {response.status_code}). "
            f"Respuesta: {response.text[:300]}"
        )

    data = response.json()

    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "webUrl": data.get("webUrl"),
        "lastModifiedDateTime": data.get(
            "lastModifiedDateTime"
        ),
        "size": data.get("size"),
        "parentPath": (
            data.get("parentReference", {})
            .get("path")
        ),
    }


def descargar_excel_temporal() -> tuple[Path, dict]:
    token = obtener_token()

    metadata = obtener_metadatos_archivo(token)

    _, content_url = _item_endpoint()

    response = requests.get(
        content_url,
        headers={
            "Authorization": f"Bearer {token}",
        },
        timeout=(20, 90),
        allow_redirects=True,
    )

    if not response.ok:
        raise RuntimeError(
            f"No se pudo descargar el Excel desde Microsoft Graph "
            f"(HTTP {response.status_code}). "
            f"Respuesta: {response.text[:300]}"
        )

    filename = (
        metadata.get("name")
        or os.getenv("GRAPH_FILE_NAME")
        or "Plantilla_Procesos_Refax.xlsx"
    )

    if not filename.lower().endswith(".xlsx"):
        raise RuntimeError(
            "El archivo configurado en Microsoft Graph "
            "no es un Excel .xlsx."
        )

    temp_dir = Path(
        tempfile.mkdtemp(
            prefix="portal-procesos-sync-"
        )
    )

    temp_path = temp_dir / filename

    temp_path.write_bytes(
        response.content
    )

    return temp_path, metadata