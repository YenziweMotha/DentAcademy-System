PDF_MAGIC = b"%PDF"


def test_programme_summary_pdf(client, admin_token):
    res = client.get(
        "/api/reports/programme-summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(PDF_MAGIC)


def test_apprentice_report_pdf(client, admin_token):
    res = client.get(
        "/api/reports/apprentice/1",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(PDF_MAGIC)


def test_apprentice_report_missing_returns_404(client, admin_token):
    res = client.get(
        "/api/reports/apprentice/99999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 404


def test_audit_log_requires_admin(client, admin_token, supervisor_token):
    res = client.get(
        "/api/reports/audit-log",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert res.status_code == 403

    res = client.get(
        "/api/reports/audit-log",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_reports_require_auth(client):
    res = client.get("/api/reports/programme-summary")
    assert res.status_code in (401, 403)


def test_supervisor_dashboard_accessible_to_supervisor(client, supervisor_token):
    res = client.get(
        "/api/dashboard/supervisor",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "avg_completion_pct" in data
    assert "apprentice_list" in data


def test_admin_dashboard_requires_admin(client, supervisor_token):
    res = client.get(
        "/api/dashboard/admin",
        headers={"Authorization": f"Bearer {supervisor_token}"},
    )
    assert res.status_code == 403
