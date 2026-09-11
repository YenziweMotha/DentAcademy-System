"""Centralized resource access checks for apprentices and related data.

Never trust client-supplied roles or ownership fields — derive authorization
from the authenticated User row and database relationships.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.apprentice import Apprentice
from models.mentor import Mentor, MentorAssignment
from models.user import User


STAFF_ROLES = {"Administrator", "Supervisor"}


def require_apprentice_access(
    current_user: User,
    apprentice_id: int,
    db: Session,
    *,
    allow_mentor: bool = True,
    allow_apprentice_self: bool = True,
) -> Apprentice:
    """
    Load an apprentice and enforce role-based access.

    - Administrator / Supervisor: any apprentice
    - Mentor: only currently assigned apprentices (when allow_mentor)
    - Apprentice: only own linked profile (when allow_apprentice_self)
    """
    app = (
        db.query(Apprentice)
        .filter(Apprentice.apprentice_id == apprentice_id)
        .first()
    )
    if not app:
        raise HTTPException(404, "Apprentice not found")

    role = current_user.role
    if role in STAFF_ROLES:
        return app

    if role == "Apprentice":
        if not allow_apprentice_self or app.user_id != current_user.user_id:
            raise HTTPException(403, "Access denied")
        return app

    if role == "Mentor":
        if not allow_mentor:
            raise HTTPException(403, "Access denied")
        mentor = db.query(Mentor).filter(Mentor.user_id == current_user.user_id).first()
        if not mentor:
            raise HTTPException(403, "Mentor profile not found")
        assigned = (
            db.query(MentorAssignment)
            .filter(
                MentorAssignment.mentor_id == mentor.mentor_id,
                MentorAssignment.apprentice_id == apprentice_id,
                MentorAssignment.is_current == True,  # noqa: E712
            )
            .first()
        )
        if not assigned:
            raise HTTPException(403, "You are not assigned to this apprentice")
        return app

    raise HTTPException(403, "Access denied")


def require_staff(current_user: User) -> User:
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(403, "Access denied")
    return current_user
