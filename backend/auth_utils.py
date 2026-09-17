from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request

from models import Usuario


def crear_token(usuario: Usuario) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario.id),
        "username": usuario.username,
        "rol": usuario.rol,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=current_app.config["JWT_EXP_MINUTES"]),
    }
    return jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )


def _extraer_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return auth[7:].strip()


def login_requerido(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extraer_token()
        if not token:
            return jsonify({"error": "Autenticación requerida"}), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=["HS256"],
            )
            usuario = Usuario.query.get(int(payload["sub"]))
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, KeyError, ValueError):
            return jsonify({"error": "Token inválido o expirado"}), 401

        if not usuario or not usuario.activo:
            return jsonify({"error": "Usuario no disponible"}), 401

        g.usuario_actual = usuario
        return fn(*args, **kwargs)

    return wrapper


def roles_requeridos(*roles):
    def decorator(fn):
        @wraps(fn)
        @login_requerido
        def wrapper(*args, **kwargs):
            if g.usuario_actual.rol not in roles:
                return jsonify({"error": "No tienes permisos para esta acción"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
