import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from sqlalchemy.engine import URL, make_url


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _as_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "si", "sí"}


def _database_url():
    """Construye la conexión.

    Prioridad:
    1) DATABASE_URL, si fue definida.
    2) Variables DB_HOST/DB_USER/DB_PASSWORD/DB_NAME para MySQL.
    3) SQLite local como fallback de desarrollo.

    URL.create evita problemas con contraseñas que contienen @, #, %, /, etc.
    """
    raw_url = os.getenv("DATABASE_URL", "").strip()
    if raw_url:
        if raw_url.startswith("mysql://"):
            raw_url = raw_url.replace("mysql://", "mysql+pymysql://", 1)
        return raw_url

    host = os.getenv("DB_HOST", "").strip()
    user = os.getenv("DB_USER", "").strip()
    password = os.getenv("DB_PASSWORD", "")
    database = os.getenv("DB_NAME", "").strip()
    port = int(os.getenv("DB_PORT", "3306"))

    if host and user and database:
        return URL.create(
            drivername="mysql+pymysql",
            username=user,
            password=password,
            host=host,
            port=port,
            database=database,
            query={"charset": "utf8mb4"},
        )

    return f"sqlite:///{(BASE_DIR / 'procesos.db').as_posix()}"


def _is_mysql(uri) -> bool:
    try:
        return make_url(str(uri)).get_backend_name() == "mysql"
    except Exception:
        return str(uri).startswith(("mysql://", "mysql+pymysql://"))


_DATABASE_URI = _database_url()
_ENGINE_OPTIONS = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
}

# Azure Database for MySQL requiere conexiones cifradas. Certifi aporta una
# cadena CA pública mantenida, evitando guardar certificados/secretos en Git.
if _is_mysql(_DATABASE_URI) and _as_bool(os.getenv("DB_SSL"), True):
    _ENGINE_OPTIONS["connect_args"] = {
        "ssl": {"ca": certifi.where()},
        "connect_timeout": 15,
    }


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "solo-desarrollo-local")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "480"))

    SQLALCHEMY_DATABASE_URI = _DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = _ENGINE_OPTIONS
    JSON_SORT_KEYS = False

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://127.0.0.1:5500,http://localhost:5500",
        ).split(",")
        if origin.strip()
    ]
