from sqlalchemy import (
    Column, Integer, String, Date, DateTime,
    Enum, ForeignKey, Numeric, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Education(Base):
    """One Education record per Apprentice (one-to-one via apprentice_id unique)."""
    __tablename__ = "education"

    education_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    apprentice_id = Column(
        Integer, ForeignKey("apprentices.apprentice_id", ondelete="RESTRICT"),
        unique=True, nullable=False
    )
    qualification_type = Column(
        Enum("NATED", "NCV", "NQF", name="qualification_enum"), nullable=False
    )
    institution_name = Column(String(200), nullable=False)
    # Denormalized academic average = sum(subject marks) / number of subjects
    average_mark = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    apprentice = relationship("Apprentice", back_populates="education")
    subjects = relationship(
        "EducationSubject", back_populates="education",
        cascade="all, delete-orphan"
    )


class EducationSubject(Base):
    """Normalized subject + mark rows for an education record (SRS §9/§10)."""
    __tablename__ = "education_subjects"

    __table_args__ = (
        UniqueConstraint("education_id", "subject_name", name="uq_education_subject"),
        CheckConstraint("mark >= 0 AND mark <= 100", name="ck_education_subject_mark"),
    )

    subject_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    education_id = Column(
        Integer, ForeignKey("education.education_id", ondelete="CASCADE"),
        nullable=False
    )
    subject_name = Column(String(150), nullable=False)
    mark = Column(Numeric(5, 2), nullable=False)

    education = relationship("Education", back_populates="subjects")