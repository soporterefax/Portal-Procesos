import click
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from extensions import db
from models import Usuario
from routes.auth import auth_bp
from routes.health import health_bp
from routes.areas import areas_bp
from routes.procesos import procesos_bp
from routes.documentos import documentos_bp
from routes.dashboard import dashboard_bp
from routes.reportes import reportes_bp
from routes.usuarios import usuarios_bp
from routes.sincronizacion import sincronizacion_bp

# Importar modelos registra las tablas en SQLAlchemy.
import models  # noqa: F401, E402


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ORIGINS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            }
        },
    )

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(areas_bp)
    app.register_blueprint(procesos_bp)
    app.register_blueprint(documentos_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(reportes_bp)
    app.register_blueprint(usuarios_bp)
    app.register_blueprint(sincronizacion_bp)

    @app.get("/")
    def root():
        return jsonify(
            {
                "service": "Portal Gestión de Procesos API",
                "health": "/api/health",
                "database_health": "/api/health/db",
                "auth_login": "/api/auth/login",
                "auth_me": "/api/auth/me",
            }
        )

    @app.cli.command("init-db")
    def init_db():
        """Crea las tablas que todavía no existen."""
        db.create_all()
        click.echo("Base de datos inicializada correctamente.")

    @app.cli.command("import-excel")
    @click.option(
        "--archivo",
        type=click.Path(exists=True, dir_okay=False, path_type=str),
        default=None,
        help="Ruta opcional a un Excel .xlsx. Si se omite usa backend/data/Plantilla_Procesos_Refax.xlsx.",
    )
    def import_excel_command(archivo):
        """Importa o actualiza Áreas, Procesos y Documentos desde Excel."""
        from services.importador_excel import importar_excel

        db.create_all()
        try:
            resultado = importar_excel(archivo)
        except Exception as error:
            raise click.ClickException(str(error)) from error

        click.echo("Importación completada correctamente.")
        click.echo(
            "Áreas: "
            f"{resultado['areas']['creadas']} creadas, "
            f"{resultado['areas']['actualizadas']} actualizadas, "
            f"{resultado['areas']['omitidas']} omitidas."
        )
        click.echo(
            "Procesos: "
            f"{resultado['procesos']['creados']} creados, "
            f"{resultado['procesos']['actualizados']} actualizados, "
            f"{resultado['procesos']['omitidos']} omitidos."
        )
        click.echo(
            "Documentos: "
            f"{resultado['documentos']['creados']} creados, "
            f"{resultado['documentos']['actualizados']} actualizados, "
            f"{resultado['documentos']['omitidos']} omitidos."
        )

    @app.cli.command("upgrade-estados")
    def upgrade_estados():
        """Agrega el campo estado a Áreas, Procesos y Documentos sin borrar datos existentes."""
        from sqlalchemy import inspect, text

        inspector = inspect(db.engine)
        cambios = []
        for tabla in ("areas", "procesos", "documentos"):
            columnas = {col["name"] for col in inspector.get_columns(tabla)}
            if "estado" not in columnas:
                db.session.execute(text(
                    f"ALTER TABLE {tabla} ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'Activo'"
                ))
                cambios.append(tabla)
        db.session.commit()

        # Los registros existentes quedan activos por defecto.
        db.session.execute(text("UPDATE areas SET estado='Activo' WHERE estado IS NULL OR TRIM(estado)=''"))
        db.session.execute(text("UPDATE procesos SET estado='Activo' WHERE estado IS NULL OR TRIM(estado)=''"))
        db.session.execute(text("UPDATE documentos SET estado='Activo' WHERE estado IS NULL OR TRIM(estado)=''"))
        db.session.commit()

        click.echo(
            "Campos de estado verificados correctamente. "
            + ("Actualizados: " + ", ".join(cambios) if cambios else "No se requirieron cambios de estructura.")
        )

    @app.cli.command("optimize-db")
    def optimize_db():
        """Crea índices de rendimiento que todavía no existen."""
        from sqlalchemy import Index

        indexes = [
            Index("ix_areas_estado_perf", models.Area.estado),
            Index("ix_procesos_area_id_perf", models.Proceso.area_id),
            Index("ix_procesos_tipo_perf", models.Proceso.tipo),
            Index("ix_procesos_critico_perf", models.Proceso.es_critico),
            Index("ix_procesos_estado_perf", models.Proceso.estado),
            Index("ix_documentos_proceso_id_perf", models.Documento.proceso_id),
            Index("ix_documentos_tipo_perf", models.Documento.tipo),
            Index("ix_documentos_estado_perf", models.Documento.estado),
            Index("ix_documentos_nombre_perf", models.Documento.nombre),
            Index("ix_usuarios_activo_perf", models.Usuario.activo),
            Index("ix_usuarios_rol_perf", models.Usuario.rol),
        ]
        for index in indexes:
            index.create(bind=db.engine, checkfirst=True)
        click.echo("Índices de rendimiento verificados correctamente.")

    @app.cli.command("upgrade-sync")
    def upgrade_sync():
        """Crea la tabla de historial de sincronización si todavía no existe."""
        db.create_all()
        click.echo("Historial de sincronización verificado correctamente.")

    @app.cli.command("create-admin")
    @click.option("--username", prompt=True, help="Usuario administrador")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    @click.option("--nombre", prompt="Nombre", default="Administrador")
    def create_admin(username, password, nombre):
        """Crea o actualiza un usuario con rol administrador."""
        db.create_all()
        username = username.strip()
        usuario = Usuario.query.filter_by(username=username).first()

        if usuario:
            usuario.nombre = nombre.strip() or "Administrador"
            usuario.rol = "administrador"
            usuario.activo = True
            usuario.establecer_password(password)
            accion = "actualizado"
        else:
            usuario = Usuario(
                nombre=nombre.strip() or "Administrador",
                username=username,
                rol="administrador",
                activo=True,
            )
            usuario.establecer_password(password)
            db.session.add(usuario)
            accion = "creado"

        db.session.commit()
        click.echo(f"Administrador '{username}' {accion} correctamente.")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
