def test_audit_logs_require_auth(client):
    res = client.get("/api/audit")
    assert res.status_code in (401, 403)


def test_audit_logs_require_admin(client, supervisor_token, admin_token):
    res = client.get(
        "/api/audit",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert res.status_code == 403

    res = client.get(
        "/api/audit",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "summary" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 1


def test_audit_logs_filter_login(client, admin_token):
    res = client.get(
        "/api/audit",
        params={"action_type": "LOGIN", "limit": 10},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert all(item["action_type"] == "LOGIN" for item in data["items"])
    assert data["items"][0]["user_username"] in ("admin", "supervisor")


def test_audit_meta_and_detail(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    meta = client.get("/api/audit/meta", headers=headers)
    assert meta.status_code == 200
    body = meta.json()
    assert "LOGIN" in body["action_types"]
    assert "User" in body["entity_types"]

    listing = client.get("/api/audit", params={"limit": 1}, headers=headers)
    log_id = listing.json()["items"][0]["log_id"]
    detail = client.get(f"/api/audit/{log_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["log_id"] == log_id

    missing = client.get("/api/audit/999999", headers=headers)
    assert missing.status_code == 404
