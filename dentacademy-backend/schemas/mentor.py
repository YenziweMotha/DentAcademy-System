from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime


class MentorCreate(BaseModel):
    user_id: int
    name: str
    surname: str
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    specialisation: Optional[str] = None


class MentorUpdate(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    specialisation: Optional[str] = None


class MentorOut(BaseModel):
    mentor_id: int
    user_id: int
    name: str
    surname: str
    contact_number: Optional[str] = None
    email: Optional[str] = None
    specialisation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AssignmentCreate(BaseModel):
    apprentice_id: int
    assigned_date: Optional[date] = None


class AssignmentOut(BaseModel):
    assignment_id: int
    mentor_id: int
    apprentice_id: int
    assigned_date: date
    is_current: bool

    model_config = {"from_attributes": True}
