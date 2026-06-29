from .user import User
from .apprentice import Apprentice, Education
from .mentor import Mentor, MentorAssignment
from .module import Module, ModuleProgress
from .evaluation import Evaluation
from .attendance import Attendance
from .prediction import AIPrediction
from .audit import AuditLog
from database import Base

__all__ = [
    "User",
    "Apprentice",
    "Education",
    "Mentor",
    "MentorAssignment",
    "Module",
    "ModuleProgress",
    "Evaluation",
    "Attendance",
    "AIPrediction",
    "AuditLog",
    "Base",
]
