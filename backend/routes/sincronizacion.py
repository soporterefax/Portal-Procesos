from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from auth_utils import roles_requeridos
from extensions import db
from models import Sincronizacion
from services.graph_excel import descargar_excel_temporal, obtener_metadatos_archivo
from services.importador_excel import importar_excel


sincronizacion_bp = Blueprint(
    "sincronizacion", __name__, url_prefix="/api/sincronizacion"
)


def _utc_naive_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _serializar_resultado(resultado: dict) -> dict:
    return {
        "areas": resultado.get("areas", {}),
        "procesos": resultado.get("procesos", {}),
        "documentos": resultado.get("documentos", {}),
    }


@sincronizacion_bp.get("")
@roles_requeridos("administrador")
def estado_sincronizacion():
    ultima = Sincronizacion.query.order_by(Sincronizacion.id.desc()).first()
    archivo = None
    graph_ok = None
    graph_error = None
    check_graph = (request.args.get("check_graph", "1").strip().lower() not in {"0", "false", "no"})
    if check_graph:
        try:
            archivo = obtener_metadatos_archivo()
            graph_ok = True
        except Exception as exc:
            graph_ok = False
            graph_error = str(exc)

    return jsonify(
        {
            "ultima": ultima.to_dict() if ultima else None,
            "graph": {
                "conectado": graph_ok,
                "archivo": archivo,
                "error": graph_error,
            },
        }
    )


@sincronizacion_bp.post("/ejecutar")
@roles_requeridos("administrador")
def ejecutar_sincronizacion():
    registro = Sincronizacion(
        fuente="Microsoft Graph",
        estado="En proceso",
        iniciado_en=_utc_naive_now(),
        usuario_id=g.usuario_actual.id,
        mensaje="Descargando archivo desde OneDrive/SharePoint...",
    )
    db.session.add(registro)
    db.session.commit()

    temp_path = None
    try:
        temp_path, metadata = descargar_excel_temporal()
        registro.archivo = metadata.get("name") or temp_path.name
        registro.mensaje = "Archivo descargado. Importando información..."
        db.session.commit()

        resultado = importar_excel(str(temp_path))
        detalle = _serializar_resultado(resultado)

        registro.estado = "Completada"
        registro.finalizado_en = _utc_naive_now()
        registro.mensaje = "Sincronización completada correctamente."
        registro.detalle_json = json.dumps(detalle, ensure_ascii=False)
        db.session.commit()

        return jsonify(
            {
                "status": "ok",
                "sincronizacion": registro.to_dict(),
                "resultado": detalle,
                "archivo": metadata,
            }
        )
    except Exception as exc:
        db.session.rollback()
        registro = db.session.get(Sincronizacion, registro.id)
        if registro:
            registro.estado = "Error"
            registro.finalizado_en = _utc_naive_now()
            registro.mensaje = str(exc)
            db.session.commit()
        return jsonify({"error": str(exc)}), 500
    finally:
        if temp_path:
            shutil.rmtree(temp_path.parent, ignore_errors=True)
