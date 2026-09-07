from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import date, datetime


class AttendanceCreate(BaseModel):
    apprentice_id: int
    period_start: date
    period_end: date
    days_expected: int
    days_present: int

    @field_validator("days_present")
    @classmethod
    def validate_days(cls, v, info):
        data = info.data
        if "days_expected" in data and v > data["days_expected"]:
            raise ValueError("Days present cannot exceed days expected")
        if v < 0:
            raise ValueError("Days present cannot be negative")
        return v

    @field_validator("days_expected")
    @classmethod
    def validate_days_expected(cls, v):
        if v <= 0:
            raise ValueError("Days expected must be positive")
        return v


class AttendanceOut(BaseModel):
    attendance_id: int
    apprentice_id: int
    period_start: date
    period_end: date
    days_expected: int
    days_present: int
    attendance_rate: float
    created_at: datetime

    model_config = {"from_attributes": True}


class PredictionOut(BaseModel):
    prediction_id: int
    apprentice_id: int
    completion_likelihood: Optional[float] = None
    employment_readiness: Optional[float] = None
    confidence_score: Optional[float] = None
    predictable: bool
    missing_fields: Optional[List[str]] = None
    generated_at: datetime
    disclaimer_text: str = (
        "This is a decision-support estimate from the DentAcademy prediction model, "
        "not a forecast of who will drop out. Interpret it alongside professional judgement."
    )
    # dropout_risk intentionally excluded here — Apprentice-role serialisation uses this schema

    model_config = {"from_attributes": True}


class PredictionDetailOut(PredictionOut):
    """Admin/Supervisor/Mentor view — includes dropout_risk."""
    dropout_risk: Optional[float] = None
    feature_snapshot_json: Optional[Any] = None
    model_version: Optional[str] = None

    model_config = {"from_attributes": True}
