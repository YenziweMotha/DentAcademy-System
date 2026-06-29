from sqlalchemy import (
    Column, Integer, Date, Numeric, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Attendance(Base):
    """Attendance periods per apprentice — required as AI input feature (FR-29)."""
    __tablename__ = "attendance"

    attendance_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    apprentice_id = Column(
        Integer, ForeignKey("apprentices.apprentice_id", ondelete="RESTRICT"), nullable=False
    )
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    days_expected = Column(Integer, nullable=False)
    days_present = Column(Integer, nullable=False)
    # Computed: days_present / days_expected * 100
    attendance_rate = Column(Numeric(5, 2), nullable=False)
    recorded_by = Column(
        Integer, ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    apprentice = relationship("Apprentice", back_populates="attendance_records")
    recorder = relationship("User", foreign_keys=[recorded_by])
