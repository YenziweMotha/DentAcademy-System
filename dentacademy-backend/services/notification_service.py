from sqlalchemy import text
from database import engine


def get_user_notifications(user_id: int):
    query = text(
        """
        SELECT id, user_id, message, type, is_read, created_at, link
        FROM notifications
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        """
    )
    with engine.begin() as conn:
        result = conn.execute(query, {"user_id": user_id})
        return [dict(row._mapping) for row in result]


def mark_as_read(notification_id: int):
    query = text(
        """
        UPDATE notifications
        SET is_read = true
        WHERE id = :id
        """
    )
    with engine.begin() as conn:
        conn.execute(query, {"id": notification_id})


def create_notification(user_id: int, message: str, type: str = "warning", link: str = None):
    query = text(
        """
        INSERT INTO notifications (user_id, message, type, is_read, created_at, link)
        VALUES (:user_id, :message, :type, false, NOW(), :link)
        """
    )
    with engine.begin() as conn:
        conn.execute(query, {
            "user_id": user_id,
            "message": message,
            "type": type,
            "link": link
        })
