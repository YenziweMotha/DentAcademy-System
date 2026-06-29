from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime


class ModuleCreate(BaseModel):
    module_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    pass_mark: Optional[float] = 50.0
    is_active: Optional[bool] = True


class ModuleOut(BaseModel):
    module_id: int
    module_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    pass_mark: float
    is_active: bool

    model_config = {"from_attributes": True}


class ModuleProgressUpdate(BaseModel):
    status: str
    assessment_score: Optional[float] = None
    completion_date: Optional[date] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        allowed = {"Not Started", "In Progress", "Completed"}
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v

    @field_validator("assessment_score")
    @classmethod
    def validate_score(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Assessment score must be between 0 and 100")
        return v

    @field_validator("completion_date")
    @classmethod
    def validate_completion_date(cls, v):
        if v is not None and v > date.today():
            raise ValueError("Completion date cannot be in the future")
        return v


class ModuleProgressOut(BaseModel):
    progress_id: int
    apprentice_id: int
    module_id: int
    status: str
    assessment_score: Optional[float] = None
    completion_date: Optional[date] = None
    updated_at: Optional[datetime] = None
    module: Optional[ModuleOut] = None

    model_config = {"from_attributes": True}
