PDF_MAGIC = b"%PDF"

REQUIRED_APPRENTICE_SECTIONS = [
    "Individual Apprentice Progress Report",
    "CONFIDENTIAL",
    "Apprentice identification",
    "Contact particulars",
    "Education background",
    "Mentor assignment",
    "Attendance record",
    "Module progress",
    "Workplace evaluations",
    "Artificial intelligence risk assessment",
    "AI commentary",
    "Declaration",
    "Disclaimer",
]


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


def test_apprentice_report_html_contains_formal_sections():
    from database import SessionLocal
    from services.report_service import render_apprentice_html

    db = SessionLocal()
    try:
        html = render_apprentice_html(
            1, db, prepared_by="Test Admin", prepared_role="Administrator"
        )
    finally:
        db.close()

    for section in REQUIRED_APPRENTICE_SECTIONS:
        assert section in html
    assert "Test Admin" in html
    assert "DA-APR-0001-" in html
    assert "executive summary" in html.lower() or "Executive summary" in html


def test_programme_summary_html_contains_formal_sections():
    from database import SessionLocal
    from services.report_service import render_programme_html

    db = SessionLocal()
    try:
        html = render_programme_html(
            db, prepared_by="Test Admin", prepared_role="Administrator"
        )
    finally:
        db.close()

    assert "Programme Summary Report" in html
    assert "CONFIDENTIAL" in html
    assert "AI executive commentary" in html
    assert "Apprentice register" in html
    assert "Declaration" in html
    assert "Test Admin" in html


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
