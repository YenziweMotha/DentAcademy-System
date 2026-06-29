from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    Enum, ForeignKey, Numeric, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Module(Base):
    __tablename__ = "modules"

    module_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_name = Column(String(150), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    pass_mark = Column(Numeric(5, 2), default=50.00)
    is_active = Column(Boolean, default=True)

    progress = relationship("ModuleProgress", back_populates="module")


class ModuleProgress(Base):
    __tablename__ = "module_progress"

    __table_args__ = (
        UniqueConstraint("apprentice_id", "module_id", name="uq_apprentice_module"),
    )

    progress_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    apprentice_id = Column(
        Integer, ForeignKey("apprentices.apprentice_id", ondelete="RESTRICT"), nullable=False
    )
    module_id = Column(
        Integer, ForeignKey("modules.module_id", ondelete="RESTRICT"), nullable=False
    )
    updated_by = Column(
        Integer, ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=True
    )
    status = Column(
        Enum("Not Started", "In Progress", "Completed", name="module_status_enum"),
        default="Not Started", nullable=False
    )
    assessment_score = Column(Numeric(5, 2), nullable=True)
    completion_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    apprentice = relationship("Apprentice", back_populates="module_progress")
    module = relationship("Module", back_populates="progress")
    updater = relationship("User")
