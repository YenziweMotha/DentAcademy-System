from fastapi import APIRouter, Depends
from services.notification_service import get_user_notifications, mark_as_read
from middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def fetch_notifications(current_user=Depends(get_current_user)):
    # Admin can see all notifications; others see their own
    if getattr(current_user, 'role', None) == 'Admin':
        from sqlalchemy import text
        from database import engine
        query = text(
            """
            SELECT id, user_id, message, type, is_read, created_at, link
            FROM notifications
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        with engine.begin() as conn:
            result = conn.execute(query)
            return [dict(row._mapping) for row in result]

    return get_user_notifications(current_user.user_id)


@router.post("/read/{notification_id}")
def read_notification(notification_id: int):
    mark_as_read(notification_id)
    return {"message": "Notification marked as read"}
