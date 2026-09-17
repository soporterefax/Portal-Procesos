from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from auth_utils import login_requerido, roles_requeridos
from extensions import db
from models import Area, Documento, Proceso

documentos_bp = Blueprint("documentos", __name__, url_prefix="/api/documentos")


def fecha(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def full(documento):
    data = documento.to_dict()
    data["proceso"] = (
        {
            "id": documento.proceso.id,
            "codigo": documento.proceso.codigo,
            "nombre": documento.proceso.nombre,
            "area_id": documento.proceso.area_id,
            "area": documento.proceso.area.to_dict() if documento.proceso.area else None,
        }
        if documento.proceso
        else None
    )
    return data


@documentos_bp.get("")
@login_requerido
def listar():
    q = (request.args.get("q") or "").strip()
    proceso_id = request.args.get("proceso_id", type=int)
    tipo = (request.args.get("tipo") or "").strip()
    area_id = request.args.get("area_id", type=int)
    estado = (request.args.get("estado") or "").strip()
    query = Documento.query.options(selectinload(Documento.proceso)).join(Proceso)
    if proceso_id:
        query = query.filter(Documento.proceso_id == proceso_id)
    if area_id:
        query = query.filter(Proceso.area_id == area_id)
    if tipo:
        query = query.filter(func.lower(Documento.tipo) == tipo.lower())
    if estado:
        query = query.filter(func.lower(Documento.estado) == estado.lower())
    if q:
        patron = f"%{q}%"
        query = query.filter(
            db.or_(
                Documento.nombre.ilike(patron),
                Documento.tipo.ilike(patron),
                Documento.version.ilike(patron),
                Proceso.nombre.ilike(patron),
                Proceso.codigo.ilike(patron),
            )
        )
    documentos = query.order_by(Documento.nombre).all()
    return jsonify({"documentos": [full(x) for x in documentos]})


@documentos_bp.get("/meta")
@login_requerido
def meta():
    tipos = [
        x[0]
        for x in db.session.query(Documento.tipo)
        .filter(Documento.tipo.isnot(None), Documento.tipo != "")
        .distinct()
        .order_by(Documento.tipo)
        .all()
    ]
    procesos = Proceso.query.order_by(Proceso.nombre).all()
    areas = Area.query.order_by(Area.nombre).all()
    return jsonify(
        {
            "procesos": [
                {"id": p.id, "codigo": p.codigo, "nombre": p.nombre}
                for p in procesos
            ],
            "tipos": tipos,
            "areas": [a.to_dict() for a in areas],
        }
    )


@documentos_bp.get("/<int:did>")
@login_requerido
def detalle(did):
    documento = (
        Documento.query.options(selectinload(Documento.proceso))
        .filter(Documento.id == did)
        .first()
    )
    if not documento:
        return jsonify({"error": "Documento no encontrado"}), 404
    return jsonify({"documento": full(documento)})


def cargar(documento, data):
    documento.tipo = str(data.get("tipo", "")).strip()
    documento.nombre = str(data.get("nombre", "")).strip()
    documento.version = str(data.get("version", "")).strip() or None
    documento.fecha_actualizacion = fecha(data.get("fecha_actualizacion"))
    estado = str(data.get("estado", documento.estado or "Activo")).strip().title()
    documento.estado = estado if estado in {"Activo", "Inactivo"} else "Activo"
    for key in ["enlace_doc", "enlace_fluj", "enlace_fluj1", "enlace_fluj2", "enlace_fluj3"]:
        setattr(documento, key, str(data.get(key, "")).strip() or None)


def validar(data):
    try:
        proceso_id = int(data.get("proceso_id"))
    except (TypeError, ValueError):
        proceso_id = None
    if not proceso_id or not str(data.get("tipo", "")).strip() or not str(data.get("nombre", "")).strip():
        return None, "Proceso, tipo y nombre son obligatorios"
    if not db.session.get(Proceso, proceso_id):
        return None, "El proceso seleccionado no existe"
    return proceso_id, None


@documentos_bp.post("")
@roles_requeridos("administrador")
def crear():
    data = request.get_json(silent=True) or {}
    proceso_id, error = validar(data)
    if error:
        return jsonify({"error": error}), 400
    documento = Documento(proceso_id=proceso_id, tipo="", nombre="")
    cargar(documento, data)
    db.session.add(documento)
    db.session.commit()
    return jsonify({"documento": full(documento)}), 201


@documentos_bp.put("/<int:did>")
@roles_requeridos("administrador")
def editar(did):
    documento = db.session.get(Documento, did)
    if not documento:
        return jsonify({"error": "Documento no encontrado"}), 404
    data = request.get_json(silent=True) or {}
    proceso_id, error = validar(data)
    if error:
        return jsonify({"error": error}), 400
    documento.proceso_id = proceso_id
    cargar(documento, data)
    db.session.commit()
    return jsonify({"documento": full(documento)})


@documentos_bp.delete("/<int:did>")
@roles_requeridos("administrador")
def eliminar(did):
    documento = db.session.get(Documento, did)
    if not documento:
        return jsonify({"error": "Documento no encontrado"}), 404
    db.session.delete(documento)
    db.session.commit()
    return jsonify({"status": "ok"})
