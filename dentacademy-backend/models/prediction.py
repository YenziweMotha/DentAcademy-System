from sqlalchemy import (
    Column, Integer, Numeric, JSON, DateTime, ForeignKey, Boolean, String
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    prediction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    apprentice_id = Column(
        Integer, ForeignKey("apprentices.apprentice_id", ondelete="RESTRICT"), nullable=False
    )
    generated_by = Column(
        Integer, ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True
    )
    # Model version that produced this prediction (historical comparison)
    model_version = Column(String(50), nullable=True)
    # Prediction scores (0–100)
    completion_likelihood = Column(Numeric(5, 2), nullable=True)
    dropout_risk = Column(Numeric(5, 2), nullable=True)
    employment_readiness = Column(Numeric(5, 2), nullable=True)
    confidence_score = Column(Numeric(5, 2), nullable=True)
    # Full input vector at prediction time (FR-30/FR-32)
    feature_snapshot_json = Column(JSON, nullable=True)
    # Fields missing at prediction time
    missing_fields = Column(JSON, nullable=True)
    # Was prediction possible?
    predictable = Column(Boolean, default=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    apprentice = relationship("Apprentice", back_populates="predictions")
    generator = relationship("User", foreign_keys=[generated_by])
