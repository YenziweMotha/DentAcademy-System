from .user import User
from .apprentice import Apprentice
from .education import Education, EducationSubject
from .mentor import Mentor, MentorAssignment
from .module import Module, ModuleProgress
from .evaluation import Evaluation
from .attendance import Attendance
from .prediction import AIPrediction
from .audit import AuditLog
from .settings import SystemSetting
from database import Base

__all__ = [
    "User",
    "Apprentice",
    "Education",
    "EducationSubject",
    "Mentor",
    "MentorAssignment",
    "Module",
    "ModuleProgress",
    "Evaluation",
    "Attendance",
    "AIPrediction",
    "AuditLog",
    "SystemSetting",
    "Base",
]