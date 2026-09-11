"""Security regression tests: authz IDOR, rate limits, secret leakage."""

import uuid

import pytest
from utils.security import generate_credential_password, get_password_hash
from models.user import User
from models.apprentice import Apprentice
from models.mentor import Mentor, MentorAssignment
from models.evaluation import Evaluation
from models.education import Education
from models.prediction import AIPrediction
from database import SessionLocal
from middleware.rate_limit import limiter


@pytest.fixture(autouse=True)
def _clear_rate_limits():
    limiter.clear()
    yield
    limiter.clear()


def _auth(client, username, password):
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def _seed_apprentice_pair(db):
    """Two apprentices + one mentor assigned only to the first."""
    tag = uuid.uuid4().hex[:10]
    u1 = User(
        username=f"app_a_{tag}",
        email=f"appa_{tag}@test.co.za",
        password_hash=get_password_hash("Apprent@123"),
        full_name="Apprentice A",
        role="Apprentice",
        is_active=True,
    )
    u2 = User(
        username=f"app_b_{tag}",
        email=f"appb_{tag}@test.co.za",
        password_hash=get_password_hash("Apprent@123"),
        full_name="Apprentice B",
        role="Apprentice",
        is_active=True,
    )
    um = User(
        username=f"mentor_{tag}",
        email=f"mentor_{tag}@test.co.za",
        password_hash=get_password_hash("Mentor@123"),
        full_name="Mentor Sec",
        role="Mentor",
        is_active=True,
    )
    db.add_all([u1, u2, um])
    db.flush()
    # Unique 13-digit IDs derived from tag digits
    digits = "".join(c for c in tag if c.isdigit()) or "1234567890"
    id1 = (digits * 3)[:13]
    id2 = (str(int(id1) + 1)).zfill(13)[-13:]
    a1 = Apprentice(
        first_name="A",
        surname="One",
        id_number=id1,
        status="ACTIVE",
        user_id=u1.user_id,
        email=u1.email,
    )
    a2 = Apprentice(
        first_name="B",
        surname="Two",
        id_number=id2,
        status="ACTIVE",
        user_id=u2.user_id,
        email=u2.email,
    )
    db.add_all([a1, a2])
    db.flush()
    mentor = Mentor(
        user_id=um.user_id,
        name="Mentor",
        surname="Sec",
        specialisation="Body",
        email=um.email,
    )
    db.add(mentor)
    db.flush()
    db.add(
        MentorAssignment(
            mentor_id=mentor.mentor_id,
            apprentice_id=a1.apprentice_id,
            is_current=True,
        )
    )
    db.add(
        Education(
            apprentice_id=a2.apprentice_id,
            qualification_type="NATED",
            institution_name="Other School",
            average_mark=70,
        )
    )
    db.add(
        Evaluation(
            apprentice_id=a2.apprentice_id,
            mentor_id=mentor.mentor_id,
            discipline=3,
            commitment=3,
            willingness=3,
            teamwork=3,
            time_management=3,
            professional_conduct=3,
            overall_score=3,
            approved=True,
        )
    )
    db.add(
        AIPrediction(
            apprentice_id=a2.apprentice_id,
            completion_likelihood=40,
            dropout_risk=60,
            employment_readiness=50,
            confidence_score=70,
            model_version="test",
            feature_snapshot_json={"secret_feature": 1},
            predictable=True,
        )
    )
    db.commit()
    return {
        "a1": a1.apprentice_id,
        "a2": a2.apprentice_id,
        "mentor_id": mentor.mentor_id,
        "app_a_user": u1.username,
        "app_b_user": u2.username,
        "mentor_user": um.username,
        "app_pass": "Apprent@123",
        "mentor_pass": "Mentor@123",
    }


def test_password_not_deterministic_from_identity():
    p1 = generate_credential_password("Jane Doe", "9001015800081", "0821234567", "a@b.c")
    p2 = generate_credential_password("Jane Doe", "9001015800081", "0821234567", "a@b.c")
    assert p1 != p2
    assert len(p1) >= 12


def test_login_inactive_user_rejected(client):
    tag = uuid.uuid4().hex[:8]
    db = SessionLocal()
    try:
        u = User(
            username=f"inactive_{tag}",
            email=f"inactive_{tag}@test.co.za",
            password_hash=get_password_hash("Inactive@1"),
            full_name="Inactive",
            role="Mentor",
            is_active=False,
        )
        db.add(u)
        db.commit()
        username = u.username
    finally:
        db.close()
    res = client.post(
        "/api/auth/login",
        json={"username": username, "password": "Inactive@1"},
    )
    assert res.status_code == 401


def test_education_idor_blocked(client):
    db = SessionLocal()
    try:
        seed = _seed_apprentice_pair(db)
    finally:
        db.close()
    token = _auth(client, seed["app_a_user"], seed["app_pass"])
    res = client.get(
        f"/api/apprentices/{seed['a2']}/education",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_evaluation_idor_mentor_blocked(client):
    db = SessionLocal()
    try:
        seed = _seed_apprentice_pair(db)
        ev = (
            db.query(Evaluation)
            .filter(Evaluation.apprentice_id == seed["a2"])
            .first()
        )
        ev_id = ev.evaluation_id
    finally:
        db.close()
    token = _auth(client, seed["mentor_user"], seed["mentor_pass"])
    res = client.get(
        f"/api/evaluations/{ev_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_prediction_idor_mentor_blocked(client):
    db = SessionLocal()
    try:
        seed = _seed_apprentice_pair(db)
    finally:
        db.close()
    token = _auth(client, seed["mentor_user"], seed["mentor_pass"])
    res = client.get(
        f"/api/predictions/{seed['a2']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_module_percentage_idor_blocked(client):
    db = SessionLocal()
    try:
        seed = _seed_apprentice_pair(db)
    finally:
        db.close()
    token = _auth(client, seed["app_a_user"], seed["app_pass"])
    res = client.get(
        f"/api/modules/apprentice/{seed['a2']}/percentage",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_attendance_idor_mentor_blocked(client):
    db = SessionLocal()
    try:
        seed = _seed_apprentice_pair(db)
    finally:
        db.close()
    token = _auth(client, seed["mentor_user"], seed["mentor_pass"])
    res = client.get(
        f"/api/attendance/apprentice/{seed['a2']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


def test_mentors_list_forbidden_for_apprentice(client):
    db = SessionLocal()
    try:
        seed = _seed_apprentice_pair(db)
    finally:
        db.close()
    token = _auth(client, seed["app_a_user"], seed["app_pass"])
    res = client.get("/api/mentors", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_user_list_omits_password_hash(client, admin_token):
    res = client.get("/api/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    for row in res.json():
        assert "password_hash" not in row
        assert "reset_token" not in row
        assert "dev_password" not in row


def test_mass_assignment_extra_fields_rejected(client, admin_token):
    res = client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": f"extra_{uuid.uuid4().hex[:8]}@test.co.za",
            "full_name": "Extra User",
            "role": "Mentor",
            "is_admin": True,
            "password_hash": "hacked",
        },
    )
    assert res.status_code == 422


def test_login_rate_limit(client):
    for _ in range(20):
        client.post("/api/auth/login", json={"username": "nosuch", "password": "x"})
    res = client.post("/api/auth/login", json={"username": "nosuch", "password": "x"})
    assert res.status_code == 429


def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_invalid_token_rejected(client):
    res = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not.a.real.token"},
    )
    assert res.status_code == 401


def test_security_headers_present(client):
    res = client.get("/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert "DENY" in (res.headers.get("X-Frame-Options") or "")
    assert "default-src" in (res.headers.get("Content-Security-Policy") or "")
