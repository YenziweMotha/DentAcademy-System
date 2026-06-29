from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Mentor(Base):
    __tablename__ = "mentors"

    mentor_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="RESTRICT"),
        unique=True, nullable=False
    )
    name = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    contact_number = Column(String(20), nullable=True)
    email = Column(String(150), nullable=True)
    specialisation = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    assignments = relationship("MentorAssignment", back_populates="mentor")
    evaluations = relationship("Evaluation", back_populates="mentor_profile")


class MentorAssignment(Base):
    __tablename__ = "mentor_assignments"

    assignment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    mentor_id = Column(
        Integer, ForeignKey("mentors.mentor_id", ondelete="RESTRICT"), nullable=False
    )
    apprentice_id = Column(
        Integer, ForeignKey("apprentices.apprentice_id", ondelete="RESTRICT"), nullable=False
    )
    assigned_date = Column(Date, nullable=False, default=datetime.utcnow)
    is_current = Column(Boolean, default=True, nullable=False)

    mentor = relationship("Mentor", back_populates="assignments")
    apprentice = relationship("Apprentice", back_populates="mentor_assignments")
