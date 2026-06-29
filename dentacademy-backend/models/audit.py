from sqlalchemy import (
    Column, BigInteger, Integer, String, Enum, JSON,
    DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class AuditLog(Base):
    """
    INSERT-ONLY table. No application code path may UPDATE or DELETE this table.
    The DB user has INSERT-only grant on this table.
    """
    __tablename__ = "audit_log"

    log_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    action_type = Column(
        Enum(
            "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT",
            "ACCESS", "LOGIN_FAILED", "ACCOUNT_LOCKED",
            "PASSWORD_RESET_REQUEST", "PASSWORD_RESET_DONE",
            "PREDICTION_GENERATED", "EVALUATION_APPROVED",
            "REPORT_GENERATED", "PHOTO_UPLOADED",
            name="audit_action_enum"
        ),
        nullable=False
    )
    entity_type = Column(String(100), nullable=True)
    record_id = Column(Integer, nullable=True)
    old_value_json = Column(JSON, nullable=True)
    new_value_json = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="audit_logs")
