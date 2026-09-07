import os
from sqlalchemy import create_engine
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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
