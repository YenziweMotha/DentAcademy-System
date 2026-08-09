import os
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.apprentice import Apprentice
from models.module import Module, ModuleProgress
from models.evaluation import Evaluation
from models.prediction import AIPrediction
from models.user import User

try:
    from weasyprint import HTML
except ImportError:
    HTML = None


def generate_apprentice_pdf(apprentice_id: int, db: Session) -> str:
    output_dir = "reports_output"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, f"apprentice_{apprentice_id}_report.pdf")

    app = db.query(Apprentice).filter(
        Apprentice.apprentice_id == apprentice_id
    ).first()
    if not app:
        raise ValueError("Apprentice not found")

    total_modules = db.query(Module).count()
    completed_modules = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice_id,
        ModuleProgress.status == "Completed",
    ).count()
    completion_pct = (
        round((completed_modules / total_modules) * 100, 2)
        if total_modules > 0
        else 0
    )

    avg_eval = None
    evals = db.query(Evaluation).filter(
        Evaluation.apprentice_id == apprentice_id, Evaluation.approved == True
    ).all()
    if evals:
        avg_eval = round(
            sum(float(e.overall_score) for e in evals) / len(evals), 2
        )

    pred = (
        db.query(AIPrediction)
        .filter(AIPrediction.apprentice_id == apprentice_id)
        .order_by(AIPrediction.generated_at.desc())
        .first()
    )
    dropout_risk = float(pred.dropout_risk) if pred and pred.dropout_risk else None
    completion_likelihood = (
        float(pred.completion_likelihood)
        if pred and pred.completion_likelihood
        else None
    )

    qualification_type = app.education.qualification_type if app.education else "N/A"
    institution = app.education.institution_name if app.education else "N/A"

    eval_rows = ""
    for i, e in enumerate(evals[-5:], 1):
        eval_rows += f"""
        <tr>
            <td>{i}</td>
            <td>{e.submitted_at.strftime('%Y-%m-%d')}</td>
            <td>{float(e.overall_score)}</td>
            <td>{'Yes' if e.approved else 'No'}</td>
        </tr>
        """
    if not eval_rows:
        eval_rows = '<tr><td colspan="4" style="text-align:center;">No evaluations yet</td></tr>'

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; padding: 30px; color: #333; }}
            h1 {{ color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }}
            h2 {{ color: #1e3a8a; margin-top: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th, td {{ border: 1px solid #d1d5db; padding: 10px; text-align: left; }}
            th {{ background-color: #eff6ff; color: #1e3a8a; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }}
            .info-card {{ background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }}
            .info-label {{ font-weight: bold; color: #374151; font-size: 0.9em; }}
            .info-value {{ font-size: 1.1em; margin-top: 4px; }}
            .risk-high {{ color: #dc2626; font-weight: bold; }}
            .risk-medium {{ color: #d97706; font-weight: bold; }}
            .risk-low {{ color: #16a34a; font-weight: bold; }}
            .header-logo {{ text-align: right; color: #6b7280; font-size: 0.9em; }}
            .disclaimer {{ margin-top: 40px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 0.85em; }}
        </style>
    </head>
    <body>
        <div class="header-logo">
            <strong>DentAcademy Management Portal</strong><br>
            Report Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}
        </div>
        <h1>Apprentice Progress Report</h1>

        <h2>Personal Information</h2>
        <div class="info-grid">
            <div class="info-card">
                <div class="info-label">Full Name</div>
                <div class="info-value">{app.first_name} {app.surname}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Apprentice ID</div>
                <div class="info-value">{app.apprentice_id}</div>
            </div>
            <div class="info-card">
                <div class="info-label">ID Number</div>
                <div class="info-value">{app.id_number[:6]}***{app.id_number[-4:]}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Status</div>
                <div class="info-value">{app.status}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Qualification</div>
                <div class="info-value">{qualification_type}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Institution</div>
                <div class="info-value">{institution}</div>
            </div>
        </div>

        <h2>Academic Progress</h2>
        <div class="info-grid">
            <div class="info-card">
                <div class="info-label">Module Completion</div>
                <div class="info-value">{completed_modules} / {total_modules} ({completion_pct}%)</div>
            </div>
            <div class="info-card">
                <div class="info-label">Average Evaluation Score</div>
                <div class="info-value">{avg_eval if avg_eval else 'N/A'}</div>
            </div>
        </div>

        <h2>AI Predictions</h2>
        <div class="info-grid">
            <div class="info-card">
                <div class="info-label">Completion Likelihood</div>
                <div class="info-value">{completion_likelihood if completion_likelihood is not None else 'N/A'}%</div>
            </div>
            <div class="info-card">
                <div class="info-label">Dropout Risk</div>
                <div class="info-value">
                    {'' if dropout_risk is None else (
                        f'<span class="risk-high">{dropout_risk}% (High Risk)</span>' if dropout_risk > 60 else
                        f'<span class="risk-medium">{dropout_risk}% (Monitor)</span>' if dropout_risk > 30 else
                        f'<span class="risk-low">{dropout_risk}% (On Track)</span>'
                    )}
                    {'N/A' if dropout_risk is None else ''}
                </div>
            </div>
        </div>

        <h2>Recent Evaluations</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Date Submitted</th>
                    <th>Overall Score</th>
                    <th>Approved</th>
                </tr>
            </thead>
            <tbody>
                {eval_rows}
            </tbody>
        </table>

        <div class="disclaimer">
            <strong>Disclaimer:</strong> This report contains AI-generated predictions that are estimates only.
            Predictions must be interpreted alongside professional human judgement and do not constitute
            definitive outcomes. DentAcademy assumes no liability for decisions made solely on the basis
            of this report.
        </div>
    </body>
    </html>
    """

    if HTML:
        HTML(string=html_content).write_pdf(pdf_path)
    else:
        with open(pdf_path, "wb") as f:
            placeholder = (
                b"%PDF-1.4\n%WeasyPrint not installed. Install with `pip install weasyprint` "
                b"to enable PDF generation. This is a placeholder file.\n"
            )
            f.write(placeholder)
    return pdf_path


def generate_summary_pdf(db: Session) -> str:
    output_dir = "reports_output"
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, "programme_summary.pdf")

    total_apprentices = db.query(Apprentice).count()
    active_apprentices = db.query(Apprentice).filter(
        Apprentice.status == "ACTIVE"
    ).count()

    total_modules = db.query(Module).count()

    avg_completion = 0.0
    if total_modules > 0:
        all_progress = db.query(ModuleProgress).all()
        apprentice_completed = {}
        for p in all_progress:
            if p.apprentice_id not in apprentice_completed:
                apprentice_completed[p.apprentice_id] = 0
            if p.status == "Completed":
                apprentice_completed[p.apprentice_id] += 1
        if apprentice_completed:
            pcts = [
                (c / total_modules * 100)
                for c in apprentice_completed.values()
            ]
            avg_completion = round(sum(pcts) / len(pcts), 2)

    pending_evals = db.query(Evaluation).filter(
        Evaluation.approved == False
    ).count()
    total_evals = db.query(Evaluation).count()
    approved_evals = db.query(Evaluation).filter(
        Evaluation.approved == True
    ).count()

    at_risk = db.query(AIPrediction).filter(
        AIPrediction.dropout_risk > 60
    ).count()

    mentors_count = db.query(User).filter(User.role == "Mentor").count()
    supervisors_count = db.query(User).filter(User.role == "Supervisor").count()

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; padding: 30px; color: #333; }}
            h1 {{ color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }}
            h2 {{ color: #1e3a8a; margin-top: 30px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th, td {{ border: 1px solid #d1d5db; padding: 12px; text-align: left; }}
            th {{ background-color: #eff6ff; color: #1e3a8a; }}
            .stats-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px; }}
            .stat-card {{ background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 20px; border-radius: 10px; border-top: 4px solid #1e40af; }}
            .stat-value {{ font-size: 2em; font-weight: bold; color: #1e40af; }}
            .stat-label {{ color: #374151; font-size: 0.9em; margin-top: 5px; }}
            .stat-red {{ background: linear-gradient(135deg, #fef2f2, #fee2e2); border-top-color: #dc2626; }}
            .stat-red .stat-value {{ color: #dc2626; }}
            .stat-green {{ background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-top-color: #16a34a; }}
            .stat-green .stat-value {{ color: #16a34a; }}
            .stat-amber {{ background: linear-gradient(135deg, #fffbeb, #fef3c7); border-top-color: #d97706; }}
            .stat-amber .stat-value {{ color: #d97706; }}
            .header-logo {{ text-align: right; color: #6b7280; font-size: 0.9em; }}
            .disclaimer {{ margin-top: 40px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 0.85em; }}
        </style>
    </head>
    <body>
        <div class="header-logo">
            <strong>DentAcademy Management Portal</strong><br>
            Report Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}
        </div>
        <h1>Programme Summary Report</h1>

        <h2>Programme Overview</h2>
        <div class="stats-grid">
            <div class="stat-card stat-green">
                <div class="stat-value">{total_apprentices}</div>
                <div class="stat-label">Total Apprentices</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{active_apprentices}</div>
                <div class="stat-label">Active Apprentices</div>
            </div>
            <div class="stat-card stat-red">
                <div class="stat-value">{at_risk}</div>
                <div class="stat-label">At-Risk Apprentices (>60%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{avg_completion}%</div>
                <div class="stat-label">Average Module Completion</div>
            </div>
            <div class="stat-card stat-amber">
                <div class="stat-value">{pending_evals}</div>
                <div class="stat-label">Pending Evaluations</div>
            </div>
            <div class="stat-card stat-green">
                <div class="stat-value">{total_modules}</div>
                <div class="stat-label">Training Modules</div>
            </div>
        </div>

        <h2>Faculty &amp; Evaluations</h2>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Supervisors</td><td>{supervisors_count}</td></tr>
                <tr><td>Mentors</td><td>{mentors_count}</td></tr>
                <tr><td>Total Evaluations Submitted</td><td>{total_evals}</td></tr>
                <tr><td>Evaluations Approved</td><td>{approved_evals}</td></tr>
                <tr><td>Evaluations Pending Approval</td><td>{pending_evals}</td></tr>
            </tbody>
        </table>

        <div class="disclaimer">
            <strong>Disclaimer:</strong> This report contains aggregate data and AI-generated insights.
            AI predictions are estimates only. DentAcademy assumes no liability for decisions made
            solely on the basis of this report.
        </div>
    </body>
    </html>
    """

    if HTML:
        HTML(string=html_content).write_pdf(pdf_path)
    else:
        with open(pdf_path, "wb") as f:
            placeholder = (
                b"%PDF-1.4\n%WeasyPrint not installed. Install with `pip install weasyprint` "
                b"to enable PDF generation. This is a placeholder file.\n"
            )
            f.write(placeholder)
    return pdf_path
