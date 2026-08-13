from sqlalchemy import (
    Column, Integer, String, Date, Boolean, DateTime, Enum, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Apprentice(Base):
    __tablename__ = "apprentices"

    apprentice_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="SET NULL"),
        unique=True, nullable=True
    )
    surname = Column(String(100), nullable=False)
    first_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(Enum("Male", "Female", "Other", name="gender_enum"), nullable=True)
    id_number = Column(String(13), unique=True, nullable=False, index=True)
    contact_number = Column(String(20), nullable=True)
    address_line1 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    photo_url = Column(String(500), nullable=True)
    status = Column(
        Enum("ACTIVE", "INACTIVE", name="apprentice_status_enum"),
        default="ACTIVE", nullable=False
    )
    is_synthetic = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    education = relationship(
        "Education", back_populates="apprentice",
        uselist=False, cascade="all, delete-orphan"
    )
    module_progress = relationship("ModuleProgress", back_populates="apprentice")
    evaluations = relationship("Evaluation", back_populates="apprentice")
    predictions = relationship("AIPrediction", back_populates="apprentice")
    mentor_assignments = relationship("MentorAssignment", back_populates="apprentice")
    attendance_records = relationship("Attendance", back_populates="apprentice")
