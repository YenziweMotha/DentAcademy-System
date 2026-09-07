from sqlalchemy.orm import Session

from ai.features import build_feature_vector
from ai.model import get_prediction_model
from models.apprentice import Apprentice
from models.prediction import AIPrediction


def generate_prediction(apprentice_id: int, db: Session, generated_by: int = None):
    apprentice = (
        db.query(Apprentice)
        .filter(Apprentice.apprentice_id == apprentice_id)
        .first()
    )
    if not apprentice:
        raise ValueError("Apprentice not found")

    features, missing_fields = build_feature_vector(apprentice_id, db)

    if missing_fields:
        return {
            "prediction": None,
            "missing_features": missing_fields,
            "message": (
                "Insufficient data for prediction. Please ensure education records, "
                "attendance, module progress, and at least two approved evaluations "
                "are available."
            ),
        }

    result = get_prediction_model().predict(features)
    pred = AIPrediction(
        apprentice_id=apprentice_id,
        generated_by=generated_by,
        model_version=result.get("model_version"),
        completion_likelihood=result["completion_likelihood"],
        dropout_risk=result["dropout_risk"],
        employment_readiness=result["employment_readiness"],
        confidence_score=result["confidence_score"],
        feature_snapshot_json=features,
        missing_fields=[],
        predictable=True,
    )

    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred
