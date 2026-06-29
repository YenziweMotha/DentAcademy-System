from sqlalchemy import (
    Column, Integer, SmallInteger, Text, Numeric, Boolean,
    DateTime, ForeignKey, CheckConstraint
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Evaluation(Base):
    __tablename__ = "evaluations"

    evaluation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    apprentice_id = Column(
        Integer, ForeignKey("apprentices.apprentice_id", ondelete="RESTRICT"), nullable=False
    )
    mentor_id = Column(
        Integer, ForeignKey("mentors.mentor_id", ondelete="RESTRICT"), nullable=False
    )
    # Six mandatory 1–5 dimensions
    discipline = Column(SmallInteger, nullable=False)
    commitment = Column(SmallInteger, nullable=False)
    willingness = Column(SmallInteger, nullable=False)
    teamwork = Column(SmallInteger, nullable=False)
    time_management = Column(SmallInteger, nullable=False)
    professional_conduct = Column(SmallInteger, nullable=False)
    # Computed: arithmetic mean of the six
    overall_score = Column(Numeric(4, 2), nullable=False)
    comments = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    # Supervisor approval
    approved = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    apprentice = relationship("Apprentice", back_populates="evaluations")
    mentor_profile = relationship("Mentor", back_populates="evaluations", foreign_keys=[mentor_id])
    approver = relationship("User", foreign_keys=[approved_by])
