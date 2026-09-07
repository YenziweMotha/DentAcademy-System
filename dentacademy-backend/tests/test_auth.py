def test_login_success_returns_token(client):
    res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["access_token"]
    assert data["role"] == "Administrator"
    assert data["token_type"] == "bearer"


def test_login_wrong_password_rejected(client):
    res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect username or password"


def test_login_unknown_username_generic_error(client):
    res = client.post(
        "/api/auth/login",
        json={"username": "nobody", "password": "whatever123"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect username or password"


def test_account_locks_after_five_failures(client):
    for _ in range(4):
        res = client.post(
            "/api/auth/login",
            json={"username": "lockme", "password": "wrong-password"},
        )
        assert res.status_code == 401

    res = client.post(
        "/api/auth/login",
        json={"username": "lockme", "password": "wrong-password"},
    )
    assert res.status_code == 423
    assert "locked" in res.json()["detail"].lower()

    res = client.post(
        "/api/auth/login",
        json={"username": "lockme", "password": "Lock@123"},
    )
    assert res.status_code == 423
