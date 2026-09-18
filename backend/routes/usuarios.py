from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

from auth_utils import roles_requeridos
from extensions import db
from models import Sincronizacion, Usuario


usuarios_bp = Blueprint(
    "usuarios",
    __name__,
    url_prefix="/api/usuarios",
)


def _texto(
    data,
    key,
    max_len=None,
):
    value = str(
        data.get(
            key,
            "",
        )
    ).strip()

    if max_len:
        value = value[:max_len]

    return value


def _normalizar_rol(value):
    rol = str(
        value or "usuario"
    ).strip().lower()

    return (
        rol
        if rol
        in {
            "administrador",
            "usuario",
        }
        else None
    )


# ==========================================================
# LISTAR USUARIOS
# ==========================================================

@usuarios_bp.get("")
@roles_requeridos(
    "administrador"
)
def listar_usuarios():

    q = (
        request.args.get("q")
        or ""
    ).strip()


    query = Usuario.query


    if q:

        patron = f"%{q}%"

        query = query.filter(
            db.or_(
                Usuario.nombre.ilike(
                    patron
                ),
                Usuario.username.ilike(
                    patron
                ),
                Usuario.rol.ilike(
                    patron
                ),
            )
        )


    usuarios = (
        query
        .order_by(
            Usuario.nombre.asc(),
            Usuario.username.asc(),
        )
        .all()
    )


    return jsonify(
        {
            "usuarios": [
                usuario.to_dict()
                for usuario
                in usuarios
            ]
        }
    )


# ==========================================================
# CREAR USUARIO
# ==========================================================

@usuarios_bp.post("")
@roles_requeridos(
    "administrador"
)
def crear_usuario():

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )


    nombre = _texto(
        data,
        "nombre",
        150,
    )

    username = _texto(
        data,
        "username",
        80,
    )

    password = str(
        data.get(
            "password",
            "",
        )
    )


    rol = _normalizar_rol(
        data.get("rol")
    )


    if (
        not nombre
        or not username
        or not password
    ):
        return jsonify(
            {
                "error":
                    "Nombre, usuario y contraseña son obligatorios"
            }
        ), 400


    if not rol:
        return jsonify(
            {
                "error":
                    "Rol no válido"
            }
        ), 400


    if len(password) < 8:
        return jsonify(
            {
                "error":
                    "La contraseña debe tener al menos 8 caracteres"
            }
        ), 400


    existente = (
        Usuario.query
        .filter(
            func.lower(
                func.trim(
                    Usuario.username
                )
            )
            == username.lower()
        )
        .first()
    )


    if existente:
        return jsonify(
            {
                "error":
                    "Ya existe un usuario con ese nombre de acceso"
            }
        ), 409


    usuario = Usuario(
        nombre=nombre,
        username=username,
        rol=rol,
        activo=bool(
            data.get(
                "activo",
                True,
            )
        ),
    )


    usuario.establecer_password(
        password
    )


    db.session.add(
        usuario
    )


    db.session.commit()


    return jsonify(
        {
            "usuario":
                usuario.to_dict(),

            "password_asignada":
                password,
        }
    ), 201


# ==========================================================
# EDITAR USUARIO
# ==========================================================

@usuarios_bp.put(
    "/<int:usuario_id>"
)
@roles_requeridos(
    "administrador"
)
def editar_usuario(
    usuario_id,
):

    usuario = db.session.get(
        Usuario,
        usuario_id,
    )


    if not usuario:
        return jsonify(
            {
                "error":
                    "Usuario no encontrado"
            }
        ), 404


    data = (
        request.get_json(
            silent=True
        )
        or {}
    )


    nombre = _texto(
        data,
        "nombre",
        150,
    )

    username = _texto(
        data,
        "username",
        80,
    )


    rol = _normalizar_rol(
        data.get("rol")
    )


    if (
        not nombre
        or not username
    ):
        return jsonify(
            {
                "error":
                    "Nombre y usuario son obligatorios"
            }
        ), 400


    if not rol:
        return jsonify(
            {
                "error":
                    "Rol no válido"
            }
        ), 400


    duplicado = (
        Usuario.query
        .filter(
            Usuario.id
            != usuario.id,

            func.lower(
                func.trim(
                    Usuario.username
                )
            )
            == username.lower(),
        )
        .first()
    )


    if duplicado:
        return jsonify(
            {
                "error":
                    "Ya existe otro usuario con ese nombre de acceso"
            }
        ), 409


    if (
        usuario.id
        == g.usuario_actual.id
        and rol
        != "administrador"
    ):
        return jsonify(
            {
                "error":
                    "No puedes retirar tu propio rol de administrador"
            }
        ), 400


    usuario.nombre = nombre
    usuario.username = username
    usuario.rol = rol


    db.session.commit()


    return jsonify(
        {
            "usuario":
                usuario.to_dict()
        }
    )


# ==========================================================
# RESTABLECER CONTRASEÑA
# ==========================================================

@usuarios_bp.patch(
    "/<int:usuario_id>/password"
)
@roles_requeridos(
    "administrador"
)
def restablecer_password(
    usuario_id,
):

    usuario = db.session.get(
        Usuario,
        usuario_id,
    )


    if not usuario:
        return jsonify(
            {
                "error":
                    "Usuario no encontrado"
            }
        ), 404


    data = (
        request.get_json(
            silent=True
        )
        or {}
    )


    password = str(
        data.get(
            "password",
            "",
        )
    )


    if len(password) < 8:
        return jsonify(
            {
                "error":
                    "La contraseña debe tener al menos 8 caracteres"
            }
        ), 400


    usuario.establecer_password(
        password
    )


    db.session.commit()


    return jsonify(
        {
            "status":
                "ok",

            "usuario":
                usuario.to_dict(),

            "password_asignada":
                password,
        }
    )


# ==========================================================
# ACTIVAR / DESACTIVAR
# ==========================================================

@usuarios_bp.patch(
    "/<int:usuario_id>/estado"
)
@roles_requeridos(
    "administrador"
)
def cambiar_estado(
    usuario_id,
):

    usuario = db.session.get(
        Usuario,
        usuario_id,
    )


    if not usuario:
        return jsonify(
            {
                "error":
                    "Usuario no encontrado"
            }
        ), 404


    data = (
        request.get_json(
            silent=True
        )
        or {}
    )


    activo = bool(
        data.get("activo")
    )


    if (
        usuario.id
        == g.usuario_actual.id
        and not activo
    ):
        return jsonify(
            {
                "error":
                    "No puedes desactivar tu propio usuario"
            }
        ), 400


    usuario.activo = activo


    db.session.commit()


    return jsonify(
        {
            "usuario":
                usuario.to_dict()
        }
    )


# ==========================================================
# ELIMINAR USUARIO
# ==========================================================

@usuarios_bp.delete(
    "/<int:usuario_id>"
)
@roles_requeridos(
    "administrador"
)
def eliminar_usuario(
    usuario_id,
):

    usuario = db.session.get(
        Usuario,
        usuario_id,
    )


    if not usuario:
        return jsonify(
            {
                "error":
                    "Usuario no encontrado"
            }
        ), 404


    # ------------------------------------------------------
    # No permitir eliminar la cuenta actualmente conectada.
    # ------------------------------------------------------

    if (
        usuario.id
        == g.usuario_actual.id
    ):
        return jsonify(
            {
                "error":
                    "No puedes eliminar tu propio usuario"
            }
        ), 400


    # ------------------------------------------------------
    # No permitir eliminar al último administrador.
    # ------------------------------------------------------

    if (
        usuario.rol
        == "administrador"
    ):

        total_admins = (
            Usuario.query
            .filter_by(
                rol="administrador"
            )
            .count()
        )


        if total_admins <= 1:
            return jsonify(
                {
                    "error":
                        "No puedes eliminar al último administrador del portal"
                }
            ), 400


    try:

        # --------------------------------------------------
        # Conservar historial de sincronizaciones.
        #
        # Si el usuario ejecutó sincronizaciones anteriormente,
        # eliminamos únicamente la referencia al usuario.
        # --------------------------------------------------

        (
            Sincronizacion.query
            .filter_by(
                usuario_id=usuario.id
            )
            .update(
                {
                    Sincronizacion.usuario_id:
                        None
                },
                synchronize_session=False,
            )
        )


        nombre = usuario.nombre
        username = usuario.username


        db.session.delete(
            usuario
        )


        db.session.commit()


        return jsonify(
            {
                "status":
                    "ok",

                "mensaje":
                    "Usuario eliminado correctamente",

                "usuario_eliminado":
                    {
                        "nombre":
                            nombre,

                        "username":
                            username,
                    },
            }
        )


    except Exception:

        db.session.rollback()

        return jsonify(
            {
                "error":
                    "No fue posible eliminar el usuario"
            }
        ), 500