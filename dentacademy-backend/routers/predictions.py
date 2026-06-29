from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.prediction import AIPrediction
from models.apprentice import Apprentice
from models.user import User
from schemas.prediction import PredictionOut, PredictionSafeOut
from middleware.auth_middleware import get_current_user, require_supervisor, require_admin_or_supervisor
from middleware.audit_middleware import log_audit_action

router = APIRouter(prefix="/predictions", tags=["predictions"])

@router.post("/{apprentice_id}/generate", response_model=PredictionOut)
def generate_apprentice_prediction(apprentice_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_supervisor)):
    from services.prediction_service import generate_prediction
    prediction = generate_prediction(apprentice_id, db)
    log_audit_action(db, "PREDICTION_GENERATED", current_user.user_id, "AIPrediction", prediction.prediction_id)
    return prediction

@router.get("/{apprentice_id}")
def get_latest_prediction(apprentice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prediction = db.query(AIPrediction).filter(AIPrediction.apprentice_id == apprentice_id).order_by(AIPrediction.generated_at.desc()).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="No prediction found")
        
    if current_user.role == "Apprentice":
        apprentice = db.query(Apprentice).filter(Apprentice.apprentice_id == apprentice_id).first()
        if apprentice.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return PredictionSafeOut.from_orm(prediction)
    return PredictionOut.from_orm(prediction)

@router.get("/{apprentice_id}/history", response_model=List[PredictionOut])
def get_prediction_history(apprentice_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_supervisor)):
    return db.query(AIPrediction).filter(AIPrediction.apprentice_id == apprentice_id).order_by(AIPrediction.generated_at.desc()).all()

@router.get("/at-risk")
def get_at_risk_apprentices(db: Session = Depends(get_db), current_user: User = Depends(require_supervisor)):
    return []
