from datetime import date, datetime

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default="usuario")
    activo = db.Column(db.Boolean, nullable=False, default=True)

    def establecer_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def verificar_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def es_administrador(self) -> bool:
        return self.rol == "administrador"

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "username": self.username,
            "rol": self.rol,
            "activo": self.activo,
        }


class Area(db.Model):
    __tablename__ = "areas"

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(120), nullable=False)
    responsable_area = db.Column(db.String(150), nullable=True)
    nombre_personal = db.Column(db.String(150), nullable=True)
    descripcion = db.Column(db.Text, nullable=True)
    estado = db.Column(db.String(20), nullable=False, default="Activo", index=True)

    procesos = db.relationship(
        "Proceso",
        backref="area",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "codigo": self.codigo,
            "nombre": self.nombre,
            "responsable_area": self.responsable_area,
            "nombre_personal": self.nombre_personal,
            "descripcion": self.descripcion,
            "estado": self.estado or "Activo",
        }


class Proceso(db.Model):
    __tablename__ = "procesos"

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(30), unique=True, nullable=False, index=True)
    area_id = db.Column(db.Integer, db.ForeignKey("areas.id"), nullable=False)
    tipo = db.Column(db.String(50), nullable=True)
    nombre = db.Column(db.String(200), nullable=False)
    responsable = db.Column(db.String(150), nullable=True)
    persona_responsable = db.Column(db.String(150), nullable=True)
    objetivo = db.Column(db.Text, nullable=True)
    es_critico = db.Column(db.Boolean, default=False, nullable=False)
    areas_relacionadas = db.Column(db.Text, nullable=True)
    fecha_actualizacion = db.Column(db.Date, nullable=True)
    estado = db.Column(db.String(20), nullable=False, default="Activo", index=True)

    documentos = db.relationship(
        "Documento",
        backref="proceso",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "codigo": self.codigo,
            "area_id": self.area_id,
            "tipo": self.tipo,
            "nombre": self.nombre,
            "responsable": self.responsable,
            "persona_responsable": self.persona_responsable,
            "objetivo": self.objetivo,
            "es_critico": self.es_critico,
            "areas_relacionadas": self.areas_relacionadas,
            "fecha_actualizacion": (
                self.fecha_actualizacion.isoformat()
                if isinstance(self.fecha_actualizacion, date)
                else None
            ),
            "estado": self.estado or "Activo",
        }


class Documento(db.Model):
    __tablename__ = "documentos"

    id = db.Column(db.Integer, primary_key=True)
    proceso_id = db.Column(db.Integer, db.ForeignKey("procesos.id"), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)
    nombre = db.Column(db.String(200), nullable=False)
    version = db.Column(db.String(30), nullable=True)
    fecha_actualizacion = db.Column(db.Date, nullable=True)
    estado = db.Column(db.String(20), nullable=False, default="Activo", index=True)
    enlace_doc = db.Column(db.String(500), nullable=True)
    enlace_fluj = db.Column(db.String(500), nullable=True)
    enlace_fluj1 = db.Column(db.String(500), nullable=True)
    enlace_fluj2 = db.Column(db.String(500), nullable=True)
    enlace_fluj3 = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "proceso_id": self.proceso_id,
            "tipo": self.tipo,
            "nombre": self.nombre,
            "version": self.version,
            "fecha_actualizacion": (
                self.fecha_actualizacion.isoformat()
                if isinstance(self.fecha_actualizacion, date)
                else None
            ),
            "estado": self.estado or "Activo",
            "enlace_doc": self.enlace_doc,
            "enlace_fluj": self.enlace_fluj,
            "enlace_fluj1": self.enlace_fluj1,
            "enlace_fluj2": self.enlace_fluj2,
            "enlace_fluj3": self.enlace_fluj3,
        }


class Sincronizacion(db.Model):
    __tablename__ = "sincronizaciones"

    id = db.Column(db.Integer, primary_key=True)
    fuente = db.Column(db.String(40), nullable=False, default="Microsoft Graph")
    archivo = db.Column(db.String(255), nullable=True)
    estado = db.Column(db.String(30), nullable=False, default="Completada")
    iniciado_en = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    finalizado_en = db.Column(db.DateTime, nullable=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    mensaje = db.Column(db.Text, nullable=True)
    detalle_json = db.Column(db.Text, nullable=True)

    usuario = db.relationship("Usuario", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "fuente": self.fuente,
            "archivo": self.archivo,
            "estado": self.estado,
            "iniciado_en": self.iniciado_en.isoformat() if self.iniciado_en else None,
            "finalizado_en": self.finalizado_en.isoformat() if self.finalizado_en else None,
            "usuario": self.usuario.to_dict() if self.usuario else None,
            "mensaje": self.mensaje,
            "detalle_json": self.detalle_json,
        }
