from pydantic import BaseModel, field_validator, model_validator, EmailStr
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
    subjects: Optional[List[SubjectMark]] = None

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
    subjects: Optional[List[SubjectMark]] = None
    average_mark: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprenticeCreate(BaseModel):
    first_name: str
    surname: str
    id_number: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None

    @field_validator("first_name", "surname")
    @classmethod
    def validate_required_names(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name fields cannot be blank")
        return v

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

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, v):
        if v and (not v.isdigit() or len(v) not in (10, 11, 12)):
            raise ValueError("Contact number must be 10-12 digits")
        return v


class ApprenticeRegister(BaseModel):
    """Completes a placeholder apprentice created with a login account.

    The national ID is already on the record, so it is not re-captured.
    """
    first_name: str
    surname: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    education: Optional[EducationCreate] = None

    @field_validator("first_name", "surname")
    @classmethod
    def validate_required_names(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name fields cannot be blank")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v and v not in {"Male", "Female", "Other"}:
            raise ValueError("Gender must be Male, Female, or Other")
        return v

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, v):
        if v and (not v.isdigit() or len(v) not in (10, 11, 12)):
            raise ValueError("Contact number must be 10-12 digits")
        return v


class ApprenticeUpdate(BaseModel):
    first_name: Optional[str] = None
    surname: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None

    @field_validator("first_name", "surname")
    @classmethod
    def validate_required_names(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name fields cannot be blank")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v):
        if v is not None and v not in {"Male", "Female", "Other"}:
            raise ValueError("Gender must be Male, Female, or Other")
        return v

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, v):
        if v and (not v.isdigit() or len(v) not in (10, 11, 12)):
            raise ValueError("Contact number must be 10-12 digits")
        return v


class ApprenticeOut(BaseModel):
    apprentice_id: int
    surname: str
    first_name: str
    id_number: Optional[str] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    qualification_type: Optional[str] = None
    institution: Optional[str] = None
    completion_pct: Optional[float] = None
    registered_at: Optional[datetime] = None
    is_registered: bool = True

    model_config = {"from_attributes": True}

    @field_validator("id_number", mode="before")
    @classmethod
    def mask_id_number(cls, v):
        if v and isinstance(v, str) and len(v) == 13:
            return v[:6] + "***" + v[-4:]
        return v


class ApprenticeDetailOut(BaseModel):
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
    id_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    address_line1: Optional[str] = None
    email: Optional[str] = None
    user_id: Optional[int] = None
    qualification_type: Optional[str] = None
    institution: Optional[str] = None
    completion_pct: Optional[float] = None
    module_count: Optional[int] = None
    completed_modules: Optional[int] = None
    latest_evaluation: Optional[dict] = None
    registered_at: Optional[datetime] = None
    is_registered: bool = True

    model_config = {"from_attributes": True}

    @field_validator("id_number", mode="before")
    @classmethod
    def mask_id_number(cls, v):
        if v and isinstance(v, str) and len(v) == 13:
            return v[:6] + "***" + v[-4:]
        return v


class ApprenticePaginatedOut(BaseModel):
    items: List[ApprenticeOut]
    total: int
    skip: int
    limit: int


class ApprenticeCreatedOut(ApprenticeDetailOut):
    account_credentials: Optional[dict] = None