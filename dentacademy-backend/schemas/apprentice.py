from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import date, datetime


class SubjectMark(BaseModel):
    subject: str
    mark: float

    @field_validator("mark")
    @classmethod
    def validate_mark(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("Mark must be between 0 and 100")
        return v


class EducationCreate(BaseModel):
    qualification_type: str
    institution_name: str
    subjects_json: Optional[List[SubjectMark]] = None

    @field_validator("qualification_type")
    @classmethod
    def validate_qualification(cls, v):
        if v not in {"NATED", "NCV", "NQF"}:
            raise ValueError("Qualification type must be NATED, NCV, or NQF")
        return v


class EducationOut(BaseModel):
    education_id: int
    apprentice_id: int
    qualification_type: str
    institution_name: str
    subjects_json: Optional[List[Any]] = None
    average_mark: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprenticeCreate(BaseModel):
    surname: str
    first_name: str
    id_number: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    user_id: Optional[int] = None

    @field_validator("id_number")
    @classmethod
    def validate_id_number(cls, v):
        if len(v) != 13 or not v.isdigit():
            raise ValueError("ID number must be exactly 13 digits")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v and v not in {"Male", "Female", "Other"}:
            raise ValueError("Gender must be Male, Female, or Other")
        return v


class ApprenticeUpdate(BaseModel):
    surname: Optional[str] = None
    first_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None


class ApprenticeOut(BaseModel):
    apprentice_id: int
    surname: str
    first_name: str
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    education: Optional[EducationOut] = None

    model_config = {"from_attributes": True}


class ApprenticeDetailOut(ApprenticeOut):
    """Full detail — includes sensitive fields, only for authorized single-record fetches."""
    id_number: str
    date_of_birth: Optional[date] = None
    address_line1: Optional[str] = None
    user_id: Optional[int] = None

    model_config = {"from_attributes": True}
