from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from database import get_db
from models.prediction import AIPrediction
from models.apprentice import Apprentice
from models.user import User
from schemas.prediction import PredictionOut, PredictionDetailOut
from schemas.apprentice import ApprenticeOut
from middleware.auth_middleware import (
    get_current_user,
    require_supervisor,
    require_admin_or_supervisor,
)
from middleware.audit_middleware import log_audit_action
from services.config_service import get_int_setting
from pydantic import BaseModel

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


class PredictionSafeOut(BaseModel):
    prediction_id: int
    apprentice_id: int
    completion_likelihood: Optional[float] = None
    employment_readiness: Optional[float] = None
    confidence_score: Optional[float] = None
    predictable: bool
    missing_fields: Optional[List[str]] = None
    generated_at: Any

    model_config = {"from_attributes": True}


class MissingFeaturesResponse(BaseModel):
    prediction: None
    missing_features: List[str]
    message: str





@router.post("/{apprentice_id}/generate")
def generate_apprentice_prediction(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    from services.prediction_service import generate_prediction

    result = generate_prediction(apprentice_id, db, current_user.user_id)

    if isinstance(result, dict) and "missing_features" in result and "prediction" in result:
        return result

    log_audit_action(
        db,
        "PREDICTION_GENERATED",
        current_user.user_id,
        "AIPrediction",
        result.prediction_id,
    )
    return PredictionDetailOut.model_validate(result, from_attributes=True)


@router.get("/at-risk")
def get_at_risk_apprentices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    """Apprentices whose latest dropout-risk prediction exceeds the configured threshold."""
    threshold = get_int_setting(db, "dropout_risk_threshold")
    at_risk_predictions = (
        db.query(AIPrediction)
        .filter(AIPrediction.dropout_risk > threshold)
        .order_by(AIPrediction.dropout_risk.desc())
        .all()
    )

    results = []
    seen = set()
    for pred in reversed(at_risk_predictions):
        if pred.apprentice_id in seen:
            continue
        seen.add(pred.apprentice_id)
        app = db.query(Apprentice).filter(
            Apprentice.apprentice_id == pred.apprentice_id
        ).first()
        if not app:
            continue
        masked = ApprenticeOut.model_validate(app, from_attributes=True)
        results.append({
            "apprentice_id": app.apprentice_id,
            "full_name": f"{app.first_name} {app.surname}",
            "id_number": masked.id_number,
            "contact_number": app.contact_number,
            "status": app.status,
            "dropout_risk": float(pred.dropout_risk) if pred.dropout_risk else None,
            "completion_likelihood": float(pred.completion_likelihood) if pred.completion_likelihood else None,
            "confidence_score": float(pred.confidence_score) if pred.confidence_score else None,
            "generated_at": pred.generated_at,
        })

    return list(reversed(results))


@router.get("/{apprentice_id}")
def get_latest_prediction(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from middleware.access_control import require_apprentice_access

    require_apprentice_access(current_user, apprentice_id, db)

    prediction = (
        db.query(AIPrediction)
        .filter(AIPrediction.apprentice_id == apprentice_id)
        .order_by(AIPrediction.generated_at.desc())
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="No prediction found")

    # Full feature snapshot / dropout risk only for staff; apprentices get safe view.
    if current_user.role in ("Administrator", "Supervisor"):
        return PredictionDetailOut.model_validate(prediction, from_attributes=True)
    return PredictionSafeOut.model_validate(prediction, from_attributes=True)


@router.get("/{apprentice_id}/history", response_model=List[PredictionDetailOut])
def get_prediction_history(
    apprentice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_supervisor),
):
    return (
        db.query(AIPrediction)
        .filter(AIPrediction.apprentice_id == apprentice_id)
        .order_by(AIPrediction.generated_at.desc())
        .all()
    )


