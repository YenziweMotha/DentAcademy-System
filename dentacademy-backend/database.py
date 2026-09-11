import os
import logging
from urllib.parse import urlsplit, quote_plus
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost:3306/dentacademy_db")


def _tls_connect_args():
    if "tidbcloud" in DATABASE_URL or os.getenv("DB_SSL_REQUIRED") == "1":
        args = {
            "ssl_verify_cert": True,
            "ssl_verify_identity": True,
        }
        ca = os.getenv("DB_SSL_CA")
        if ca:
            args["ssl_ca"] = ca
        if os.getenv("DB_SSL_INSECURE") == "1":
            args["ssl_verify_cert"] = False
            args["ssl_verify_identity"] = False
        return args
    return {}


engine = create_engine(
    DATABASE_URL,
    connect_args=_tls_connect_args(),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_database():
    """Create the target database if it does not yet exist.

    Used for "online" deployments (e.g. TiDB Cloud) where the schema is
    provisioned by the app itself (AUTO_CREATE_TABLES) and the database
    must be present before the first connection. No-op for SQLite or when
    DB_AUTO_CREATE is disabled.
    """
    if os.getenv("DB_AUTO_CREATE", "1") != "1":
        return
    if not DATABASE_URL.startswith(("mysql+pymysql", "mysql://")):
        return

    import re

    parts = urlsplit(DATABASE_URL)
    db_name = parts.path.lstrip("/") or "dentacademy_db"
    # Reject path injection into CREATE DATABASE identifier.
    if not re.fullmatch(r"[A-Za-z0-9_]+", db_name):
        raise ValueError("DATABASE_URL database name contains invalid characters")
    user = quote_plus(parts.username or "")
    password = quote_plus(parts.password or "")
    netloc = parts.hostname or "localhost"
    if parts.port:
        netloc = f"{netloc}:{parts.port}"
    # Connect to the built-in `sys` database to issue CREATE DATABASE.
    admin_url = f"{parts.scheme}://{user}:{password}@{netloc}/sys"

    admin_engine = create_engine(
        admin_url,
        connect_args=_tls_connect_args(),
        pool_pre_ping=True,
    )
    try:
        with admin_engine.connect() as conn:
            conn.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            conn.execute(text(f"USE `{db_name}`"))
        logging.getLogger("dentacademy").info("Ensured database '%s' exists.", db_name)
    finally:
        admin_engine.dispose()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
