from __future__ import annotations

import os
import tempfile
from pathlib import Path

import requests
from flask import current_app


GRAPH_SCOPE = "https://graph.microsoft.com/.default"
GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class GraphConfigError(RuntimeError):
    pass


def _env(name: str, required: bool = True) -> str:
    value = (os.getenv(name) or "").strip()
    if required and not value:
        raise GraphConfigError(f"Falta configurar {name} en las variables de entorno.")
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
            f"No se pudo obtener token de Microsoft Graph (HTTP {response.status_code})."
        )
    data = response.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError("Microsoft Graph no devolvió un access_token.")
    return token


def _item_endpoint() -> tuple[str, str]:
    drive_id = _env("GRAPH_DRIVE_ID")
    item_id = _env("GRAPH_ITEM_ID", required=False)
    file_path = _env("GRAPH_FILE_PATH", required=False).strip("/")

    if item_id:
        return (
            f"{GRAPH_BASE}/drives/{drive_id}/items/{item_id}",
            f"{GRAPH_BASE}/drives/{drive_id}/items/{item_id}/content",
        )

    if file_path:
        return (
            f"{GRAPH_BASE}/drives/{drive_id}/root:/{file_path}",
            f"{GRAPH_BASE}/drives/{drive_id}/root:/{file_path}:/content",
        )

    raise GraphConfigError(
        "Configura GRAPH_ITEM_ID o GRAPH_FILE_PATH para identificar el Excel de procesos."
    )


def obtener_metadatos_archivo(token: str | None = None) -> dict:
    token = token or obtener_token()
    meta_url, _ = _item_endpoint()
    response = requests.get(
        meta_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    if not response.ok:
        raise RuntimeError(
            f"No se pudo consultar el archivo en Microsoft Graph (HTTP {response.status_code})."
        )
    data = response.json()
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "webUrl": data.get("webUrl"),
        "lastModifiedDateTime": data.get("lastModifiedDateTime"),
        "size": data.get("size"),
    }


def descargar_excel_temporal() -> tuple[Path, dict]:
    token = obtener_token()
    metadata = obtener_metadatos_archivo(token)
    _, content_url = _item_endpoint()

    response = requests.get(
        content_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=(20, 90),
        allow_redirects=True,
    )
    if not response.ok:
        raise RuntimeError(
            f"No se pudo descargar el Excel desde Microsoft Graph (HTTP {response.status_code})."
        )

    filename = metadata.get("name") or os.getenv("GRAPH_FILE_NAME") or "Plantilla_Procesos_Refax.xlsx"
    if not filename.lower().endswith(".xlsx"):
        raise RuntimeError("El archivo configurado en Microsoft Graph no es un Excel .xlsx.")

    temp_dir = Path(tempfile.mkdtemp(prefix="portal-procesos-sync-"))
    temp_path = temp_dir / filename
    temp_path.write_bytes(response.content)
    return temp_path, metadata
