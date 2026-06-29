from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class EvaluationCreate(BaseModel):
    apprentice_id: int
    discipline: int
    commitment: int
    willingness: int
    teamwork: int
    time_management: int
    professional_conduct: int
    comments: Optional[str] = None

    @field_validator(
        "discipline", "commitment", "willingness",
        "teamwork", "time_management", "professional_conduct"
    )
    @classmethod
    def validate_score(cls, v, info):
        if not (1 <= v <= 5):
            raise ValueError(f"{info.field_name} must be between 1 and 5")
        return v


class EvaluationOut(BaseModel):
    evaluation_id: int
    apprentice_id: int
    mentor_id: int
    discipline: int
    commitment: int
    willingness: int
    teamwork: int
    time_management: int
    professional_conduct: int
    overall_score: float
    comments: Optional[str] = None
    submitted_at: datetime
    approved: bool
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
