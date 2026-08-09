from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Any
from datetime import date, datetime
from typing import List

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
    last_name: str
    first_name: str
    id_number: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_province: Optional[str] = None
    address_postal: Optional[str] = None
    qualification_type: Optional[str] = None
    institution: Optional[str] = None
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

    @field_validator("qualification_type")
    @classmethod
    def validate_qualification(cls, v):
        if v and v not in {"NATED", "NCV", "NQF"}:
            raise ValueError("Qualification type must be NATED, NCV, or NQF")
        return v

    def to_model_dict(self) -> dict:
        return {
            "surname": self.last_name,
            "first_name": self.first_name,
            "id_number": self.id_number,
            "date_of_birth": self.date_of_birth,
            "gender": self.gender,
            "contact_number": self.contact_number,
            "address_line1": self.address_street,
            "city": self.address_city,
            "province": self.address_province,
            "user_id": self.user_id,
        }


class ApprenticeUpdate(BaseModel):
    last_name: Optional[str] = None
    first_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_province: Optional[str] = None
    address_postal: Optional[str] = None

    def to_model_dict(self) -> dict:
        data = {}
        if self.last_name is not None:
            data["surname"] = self.last_name
        if self.first_name is not None:
            data["first_name"] = self.first_name
        if self.date_of_birth is not None:
            data["date_of_birth"] = self.date_of_birth
        if self.gender is not None:
            data["gender"] = self.gender
        if self.contact_number is not None:
            data["contact_number"] = self.contact_number
        if self.address_street is not None:
            data["address_line1"] = self.address_street
        if self.address_city is not None:
            data["city"] = self.address_city
        if self.address_province is not None:
            data["province"] = self.address_province
        return data


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
    user_id: Optional[int] = None
    qualification_type: Optional[str] = None
    institution: Optional[str] = None
    completion_pct: Optional[float] = None
    module_count: Optional[int] = None
    completed_modules: Optional[int] = None
    latest_evaluation: Optional[dict] = None

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