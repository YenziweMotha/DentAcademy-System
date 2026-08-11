from sqlalchemy import Column, String, DateTime, Text
from database import Base
from datetime import datetime


class SystemSetting(Base):
    """Key/value configuration store (SRS: configurable thresholds/periods)."""
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)