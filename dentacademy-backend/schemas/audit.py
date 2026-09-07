from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class AuditLogOut(BaseModel):
    log_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_username: Optional[str] = None
    user_role: Optional[str] = None
    action_type: str
    entity_type: Optional[str] = None
    record_id: Optional[int] = None
    old_value_json: Optional[Any] = None
    new_value_json: Optional[Any] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogListOut(BaseModel):
    items: List[AuditLogOut]
    total: int
    skip: int
    limit: int
    summary: dict = Field(default_factory=dict)


class AuditLogMetaOut(BaseModel):
    action_types: List[str]
    entity_types: List[str]
