from flask import Blueprint, current_app, jsonify
from sqlalchemy import text
from sqlalchemy.engine import make_url

from extensions import db


health_bp = Blueprint("health", __name__, url_prefix="/api/health")


@health_bp.get("")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "Portal Gestión de Procesos API",
        }
    )


@health_bp.get("/db")
def health_db():
    try:
        db.session.execute(text("SELECT 1"))
        uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
        parsed = make_url(str(uri))
        payload = {
            "status": "ok",
            "database": "connected",
            "dialect": parsed.get_backend_name(),
        }
        # Datos útiles para diagnóstico, sin exponer usuario ni contraseña.
        if parsed.host:
            payload["host"] = parsed.host
        if parsed.database:
            payload["name"] = parsed.database
        return jsonify(payload)
    except Exception as exc:
        current_app.logger.exception("Error verificando la base de datos")
        return (
            jsonify(
                {
                    "status": "error",
                    "database": "disconnected",
                    "error": exc.__class__.__name__,
                }
            ),
            503,
        )
