from flask import Blueprint, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from auth_utils import login_requerido, roles_requeridos
from extensions import db
from models import Area

areas_bp = Blueprint("areas", __name__, url_prefix="/api/areas")


@areas_bp.get("")
@login_requerido
def listar():
    q = (request.args.get("q") or "").strip()
    area_id = request.args.get("area_id", type=int)
    estado = (request.args.get("estado") or "").strip()
    query = Area.query.options(selectinload(Area.procesos))
    if q:
        patron = f"%{q}%"
        query = query.filter(
            db.or_(
                Area.codigo.ilike(patron),
                Area.nombre.ilike(patron),
                Area.responsable_area.ilike(patron),
                Area.nombre_personal.ilike(patron),
            )
        )
    if area_id:
        query = query.filter(Area.id == area_id)
    if estado:
        query = query.filter(Area.estado == estado)
    areas = query.order_by(Area.nombre.asc()).all()
    data = []
    for area in areas:
        item = area.to_dict()
        item["total_procesos"] = len(area.procesos)
        data.append(item)
    return jsonify({"areas": data})


@areas_bp.get("/<int:area_id>")
@login_requerido
def detalle(area_id):
    area = (
        Area.query.options(selectinload(Area.procesos))
        .filter(Area.id == area_id)
        .first()
    )
    if not area:
        return jsonify({"error": "Área no encontrada"}), 404
    item = area.to_dict()
    item["procesos"] = [
        proceso.to_dict()
        for proceso in sorted(area.procesos, key=lambda x: x.nombre.lower())
    ]
    return jsonify({"area": item})


@areas_bp.post("")
@roles_requeridos("administrador")
def crear():
    data = request.get_json(silent=True) or {}
    codigo = str(data.get("codigo", "")).strip().upper()
    nombre = str(data.get("nombre", "")).strip()
    if not codigo or not nombre:
        return jsonify({"error": "Código y nombre son obligatorios"}), 400
    if Area.query.filter(func.upper(func.trim(Area.codigo)) == codigo).first():
        return jsonify({"error": "Ya existe un área con ese código"}), 409
    if Area.query.filter(func.lower(func.trim(Area.nombre)) == nombre.lower()).first():
        return jsonify({"error": "Ya existe un área con ese nombre"}), 409
    area = Area(
        codigo=codigo,
        nombre=nombre,
        responsable_area=str(data.get("responsable_area", "")).strip() or None,
        nombre_personal=str(data.get("nombre_personal", "")).strip() or None,
        descripcion=str(data.get("descripcion", "")).strip() or None,
        estado=str(data.get("estado", "Activo")).strip() or "Activo",
    )
    db.session.add(area)
    db.session.commit()
    return jsonify({"area": area.to_dict()}), 201


@areas_bp.put("/<int:area_id>")
@roles_requeridos("administrador")
def editar(area_id):
    area = db.session.get(Area, area_id)
    if not area:
        return jsonify({"error": "Área no encontrada"}), 404
    data = request.get_json(silent=True) or {}
    codigo = str(data.get("codigo", "")).strip().upper()
    nombre = str(data.get("nombre", "")).strip()
    if not codigo or not nombre:
        return jsonify({"error": "Código y nombre son obligatorios"}), 400
    if Area.query.filter(Area.id != area.id, func.upper(func.trim(Area.codigo)) == codigo).first():
        return jsonify({"error": "Ya existe otra área con ese código"}), 409
    if Area.query.filter(Area.id != area.id, func.lower(func.trim(Area.nombre)) == nombre.lower()).first():
        return jsonify({"error": "Ya existe otra área con ese nombre"}), 409
    area.codigo = codigo
    area.nombre = nombre
    area.responsable_area = str(data.get("responsable_area", "")).strip() or None
    area.nombre_personal = str(data.get("nombre_personal", "")).strip() or None
    area.descripcion = str(data.get("descripcion", "")).strip() or None
    area.estado = str(data.get("estado", "Activo")).strip() or "Activo"
    db.session.commit()
    return jsonify({"area": area.to_dict()})


@areas_bp.delete("/<int:area_id>")
@roles_requeridos("administrador")
def eliminar(area_id):
    area = db.session.get(Area, area_id)
    if not area:
        return jsonify({"error": "Área no encontrada"}), 404
    if area.procesos:
        return jsonify({"error": "No se puede eliminar un área que tiene procesos asociados"}), 409
    db.session.delete(area)
    db.session.commit()
    return jsonify({"status": "ok"})
