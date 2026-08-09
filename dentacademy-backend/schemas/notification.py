from pydantic import BaseModel
from datetime import datetime


class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    type: str
    is_read: bool
    created_at: datetime
    link: str | None = None
