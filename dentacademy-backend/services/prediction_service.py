from sqlalchemy.orm import Session
from models.apprentice import Apprentice, Education
from models.module import ModuleProgress, Module
from models.evaluation import Evaluation
from models.prediction import AIPrediction
from ai.model import PredictionModel


def generate_prediction(apprentice_id: int, db: Session, generated_by: int = None):
    apprentice = (
        db.query(Apprentice)
        .filter(Apprentice.apprentice_id == apprentice_id)
        .first()
    )
    if not apprentice:
        raise ValueError("Apprentice not found")

    edu_records = (
        db.query(Education).filter(Education.apprentice_id == apprentice_id).all()
    )
    avg_mark = (
        sum(float(e.average_mark) for e in edu_records if e.average_mark is not None)
        / len(edu_records)
        if edu_records
        else None
    )

    total_modules = db.query(Module).count()
    completed_modules = (
        db.query(ModuleProgress)
        .filter(
            ModuleProgress.apprentice_id == apprentice_id,
            ModuleProgress.status == "Completed",
        )
        .count()
    )
    completion_pct = (
        (completed_modules / total_modules * 100) if total_modules > 0 else None
    )

    progress_records = (
        db.query(ModuleProgress)
        .filter(
            ModuleProgress.apprentice_id == apprentice_id,
            ModuleProgress.assessment_score != None,
        )
        .all()
    )
    avg_assessment = (
        sum(float(p.assessment_score) for p in progress_records)
        / len(progress_records)
        if progress_records
        else None
    )

    evals = (
        db.query(Evaluation)
        .filter(
            Evaluation.apprentice_id == apprentice_id, Evaluation.approved == True
        )
        .all()
    )
    avg_discipline = (
        sum(float(e.discipline) for e in evals) / len(evals) if evals else None
    )
    avg_commitment = (
        sum(float(e.commitment) for e in evals) / len(evals) if evals else None
    )
    avg_willingness = (
        sum(float(e.willingness) for e in evals) / len(evals) if evals else None
    )
    avg_teamwork = (
        sum(float(e.teamwork) for e in evals) / len(evals) if evals else None
    )
    avg_time_management = (
        sum(float(e.time_management) for e in evals) / len(evals) if evals else None
    )
    avg_professional_conduct = (
        sum(float(e.professional_conduct) for e in evals) / len(evals)
        if evals
        else None
    )

    features = {
        "academic_avg_mark": avg_mark,
        "module_completion_pct": completion_pct,
        "avg_assessment_score": avg_assessment,
        "avg_discipline": avg_discipline,
        "avg_commitment": avg_commitment,
        "avg_willingness": avg_willingness,
        "avg_teamwork": avg_teamwork,
        "avg_time_management": avg_time_management,
        "avg_professional_conduct": avg_professional_conduct,
    }

    missing_features = []
    if avg_discipline is None:
        missing_features.append("avg_discipline")
    if avg_commitment is None:
        missing_features.append("avg_commitment")
    if avg_willingness is None:
        missing_features.append("avg_willingness")
    if avg_teamwork is None:
        missing_features.append("avg_teamwork")
    if avg_time_management is None:
        missing_features.append("avg_time_management")
    if avg_professional_conduct is None:
        missing_features.append("avg_professional_conduct")
    if avg_mark is None:
        missing_features.append("academic_avg_mark")
    if completion_pct is None:
        missing_features.append("module_completion_pct")
    if avg_assessment is None:
        missing_features.append("avg_assessment_score")

    ai_model = PredictionModel()

    if missing_features:
        return {
            "prediction": None,
            "missing_features": missing_features,
            "message": "Insufficient data for prediction. Please ensure all evaluation scores, education data, and module progress are available.",
        }

    result = ai_model.predict(features)
    pred = AIPrediction(
        apprentice_id=apprentice_id,
        generated_by=generated_by,
        completion_likelihood=result["completion_likelihood"],
        dropout_risk=result["dropout_risk"],
        employment_readiness=result["employment_readiness"],
        confidence_score=result["confidence_score"],
        feature_snapshot_json=features,
        missing_features=[],
        predictable=True,
    )

    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred
