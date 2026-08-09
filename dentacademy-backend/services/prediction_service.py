from sqlalchemy.orm import Session
from models.apprentice import Apprentice, Education
from models.module import ModuleProgress, Module
from models.evaluation import Evaluation
from models.prediction import AIPrediction
from ai.model import PredictionModel
from services.notification_service import create_notification
from models.user import User

def generate_prediction(apprentice_id: int, db: Session):
    apprentice = db.query(Apprentice).filter(Apprentice.apprentice_id == apprentice_id).first()
    if not apprentice:
        raise ValueError("Apprentice not found")
        
    edu_records = db.query(Education).filter(Education.apprentice_id == apprentice_id).all()
    avg_mark = sum(e.mark for e in edu_records if e.mark is not None) / len(edu_records) if edu_records else 0

    total_modules = db.query(Module).count()
    completed_modules = db.query(ModuleProgress).filter(
        ModuleProgress.apprentice_id == apprentice_id, 
        ModuleProgress.status == 'Completed'
    ).count()
    completion_pct = (completed_modules / total_modules * 100) if total_modules > 0 else 0
    
    progress_records = db.query(ModuleProgress).filter(ModuleProgress.apprentice_id == apprentice_id, ModuleProgress.assessment_score != None).all()
    avg_assessment = sum(p.assessment_score for p in progress_records) / len(progress_records) if progress_records else 0

    evals = db.query(Evaluation).filter(Evaluation.apprentice_id == apprentice_id, Evaluation.approved == True).all()
    avg_discipline = sum(e.discipline for e in evals) / len(evals) if evals else 0
    avg_commitment = sum(e.commitment for e in evals) / len(evals) if evals else 0
    avg_willingness = sum(e.willingness for e in evals) / len(evals) if evals else 0
    avg_teamwork = sum(e.teamwork for e in evals) / len(evals) if evals else 0
    avg_time_management = sum(e.time_management for e in evals) / len(evals) if evals else 0
    avg_professional_conduct = sum(e.professional_conduct for e in evals) / len(evals) if evals else 0

    features = {
        'academic_avg_mark': avg_mark,
        'module_completion_pct': completion_pct,
        'avg_assessment_score': avg_assessment,
        'avg_discipline': avg_discipline,
        'avg_commitment': avg_commitment,
        'avg_willingness': avg_willingness,
        'avg_teamwork': avg_teamwork,
        'avg_time_management': avg_time_management,
        'avg_professional_conduct': avg_professional_conduct,
    }
    
    missing_features = []
    if len(evals) == 0:
        missing_features.append("evaluations")
    if len(edu_records) == 0:
        missing_features.append("education_records")
    
    ai_model = PredictionModel()
    
    if missing_features:
        pred = AIPrediction(
            apprentice_id=apprentice_id,
            feature_snapshot=features,
            missing_features=missing_features
        )
    else:
        result = ai_model.predict(features)
        pred = AIPrediction(
            apprentice_id=apprentice_id,
            completion_likelihood=result['completion_likelihood'],
            dropout_risk=result['dropout_risk'],
            employment_readiness=result['employment_readiness'],
            confidence_score=result['confidence_score'],
            feature_snapshot=features,
            missing_features=[]
        )

        # ✅ Prediction alerts (high dropout risk)
        try:
            # assuming dropout_risk is percentage (0-100)
            if result.get('dropout_risk', 0) >= 70:
                # notify apprentice (if linked to user)
                if apprentice.user_id:
                    create_notification(
                        user_id=apprentice.user_id,
                        message="High dropout risk detected. Please consult your supervisor.",
                        type="warning",
                        link=f"/predictions?apprentice_id={apprentice_id}",
                    )

                # notify all supervisors
                supervisors = db.query(User).filter(User.role == "Supervisor").all()
                for sup in supervisors:
                    create_notification(
                        user_id=sup.user_id,
                        message=f"High dropout risk: {apprentice.first_name} {apprentice.surname}",
                        type="warning",
                        link=f"/predictions?apprentice_id={apprentice_id}",
                    )
        except Exception:
            pass
        
    db.add(pred)
    db.commit()
    db.refresh(pred)
    return pred
