from flask import Blueprint, g, jsonify, request

from auth_utils import crear_token, login_requerido, roles_requeridos
from models import Usuario


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    if not username or not password:
        return jsonify({"error": "Usuario y contraseña son obligatorios"}), 400

    usuario = Usuario.query.filter_by(username=username).first()
    if not usuario or not usuario.activo or not usuario.verificar_password(password):
        return jsonify({"error": "Usuario o contraseña incorrectos"}), 401

    return jsonify(
        {
            "access_token": crear_token(usuario),
            "token_type": "Bearer",
            "usuario": usuario.to_dict(),
        }
    )


@auth_bp.get("/me")
@login_requerido
def me():
    return jsonify({"usuario": g.usuario_actual.to_dict()})


@auth_bp.get("/admin-check")
@roles_requeridos("administrador")
def admin_check():
    return jsonify({"status": "ok", "message": "Acceso de administrador confirmado"})
