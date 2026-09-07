"""
Feature engineering pipeline for DentAcademy AI predictions.

Builds the feature vector from real, queryable data as specified in FR-29/SDD §5.2.
The exact vector is persisted into feature_snapshot_json (FR-30/FR-32).
"""

from typing import Any, Dict, List, Tuple

from sqlalchemy.orm import Session

from ai.scoring import FEATURE_NAMES, feature_dict_to_vector
from models.attendance import Attendance
from models.education import Education
from models.evaluation import Evaluation
from models.module import Module, ModuleProgress

__all__ = [
    "FEATURE_NAMES",
    "build_feature_vector",
    "feature_dict_to_vector",
]


def _linear_trend(values: List[float]) -> float:
    """Simple least-squares slope over an ordinal index."""
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = sum(values) / n
    numerator = sum((xs[i] - x_mean) * (values[i] - y_mean) for i in range(n))
    denominator = sum((xs[i] - x_mean) ** 2 for i in range(n))
    return numerator / denominator if denominator != 0 else 0.0


def build_feature_vector(
    apprentice_id: int, db: Session
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Returns (feature_dict, missing_fields).
    missing_fields is non-empty if the minimum-data gate is not satisfied.
    """
    missing = []

    edu = db.query(Education).filter(Education.apprentice_id == apprentice_id).first()
    if edu and edu.subjects:
        marks = [float(s.mark) for s in edu.subjects]
        academic_avg = sum(marks) / len(marks) if marks else 0.0
    elif edu and edu.average_mark is not None:
        academic_avg = float(edu.average_mark)
    else:
        academic_avg = 0.0
        missing.append("education_records")

    total_modules = db.query(Module).filter(Module.is_active == True).count()  # noqa: E712
    completed = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice_id,
        ModuleProgress.status == "Completed",
    ).count()
    completion_pct = (completed / total_modules * 100) if total_modules > 0 else 0.0

    progress_count = (
        db.query(ModuleProgress)
        .filter(ModuleProgress.apprentice_id == apprentice_id)
        .count()
    )
    if progress_count == 0:
        missing.append("module_progress")

    progress_rows = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice_id,
        ModuleProgress.assessment_score.isnot(None),
    ).all()
    avg_assessment = (
        sum(float(p.assessment_score) for p in progress_rows) / len(progress_rows)
        if progress_rows
        else 0.0
    )

    att_records = db.query(Attendance).filter(
        Attendance.apprentice_id == apprentice_id
    ).all()
    attendance_rate = (
        sum(float(a.attendance_rate) for a in att_records) / len(att_records)
        if att_records
        else 0.0
    )
    if not att_records:
        missing.append("attendance_records")

    evals = (
        db.query(Evaluation)
        .filter(
            Evaluation.apprentice_id == apprentice_id,
            Evaluation.approved == True,  # noqa: E712
        )
        .order_by(Evaluation.submitted_at.asc())
        .all()
    )
    eval_count = len(evals)

    if eval_count < 2:
        missing.append("evaluations (minimum 2 approved required)")

    avg_discipline = sum(e.discipline for e in evals) / eval_count if evals else 0.0
    avg_commitment = sum(e.commitment for e in evals) / eval_count if evals else 0.0
    avg_willingness = sum(e.willingness for e in evals) / eval_count if evals else 0.0
    avg_teamwork = sum(e.teamwork for e in evals) / eval_count if evals else 0.0
    avg_time_mgmt = sum(e.time_management for e in evals) / eval_count if evals else 0.0
    avg_professional = (
        sum(e.professional_conduct for e in evals) / eval_count if evals else 0.0
    )
    eval_trend = _linear_trend([float(e.overall_score) for e in evals])

    feature_dict = {
        "academic_avg_mark": round(academic_avg, 4),
        "module_completion_pct": round(completion_pct, 4),
        "avg_assessment_score": round(avg_assessment, 4),
        "attendance_rate": round(attendance_rate, 4),
        "avg_discipline": round(avg_discipline, 4),
        "avg_commitment": round(avg_commitment, 4),
        "avg_willingness": round(avg_willingness, 4),
        "avg_teamwork": round(avg_teamwork, 4),
        "avg_time_management": round(avg_time_mgmt, 4),
        "avg_professional_conduct": round(avg_professional, 4),
        "eval_count": eval_count,
        "eval_trend": round(eval_trend, 6),
    }

    return feature_dict, missing
