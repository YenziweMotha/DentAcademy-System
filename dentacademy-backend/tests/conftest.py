import os
import sys
import pathlib

os.environ["DATABASE_URL"] = (
    "mysql+pymysql://dent:dentpass@127.0.0.1:3306/dentacademy_test"
)
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-32chars-minimum!!"
os.environ["ENVIRONMENT"] = "test"
os.environ["SMTP_HOST"] = ""
os.environ["SMTP_USERNAME"] = ""
os.environ["SMTP_PASSWORD"] = ""
os.environ["DB_AUTO_CREATE"] = "1"
os.environ["AUTO_CREATE_TABLES"] = "1"
os.environ["AUTO_SEED"] = "0"

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient

from database import Base, engine, SessionLocal
from models.user import User
from models.module import Module
from models.apprentice import Apprentice
from utils.security import get_password_hash
from main import app


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        db.add(
            User(
                username="admin",
                email="admin@test.co.za",
                password_hash=get_password_hash("Admin@123"),
                full_name="Test Admin",
                role="Administrator",
                is_active=True,
            )
        )
        db.add(
            User(
                username="supervisor",
                email="supervisor@test.co.za",
                password_hash=get_password_hash("Super@123"),
                full_name="Test Supervisor",
                role="Supervisor",
                is_active=True,
            )
        )
        db.add(
            User(
                username="lockme",
                email="lockme@test.co.za",
                password_hash=get_password_hash("Lock@123"),
                full_name="Lockout Test User",
                role="Mentor",
                is_active=True,
            )
        )
        db.add(
            Module(
                module_name="Test Module",
                description="Seed module",
                category="Clinical",
                pass_mark=50,
                is_active=True,
            )
        )
        db.add(
            Apprentice(
                first_name="Test",
                surname="Student",
                id_number="9012120000001",
                status="ACTIVE",
            )
        )
        db.commit()
    finally:
        db.close()

    yield


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def admin_token(client):
    res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture()
def supervisor_token(client):
    res = client.post(
        "/api/auth/login",
        json={"username": "supervisor", "password": "Super@123"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]
