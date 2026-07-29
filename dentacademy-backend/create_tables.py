from database import Base, engine

# Import ALL models so SQLAlchemy registers them
from models.user import User
from models.apprentice import Apprentice, Education
from models.mentor import Mentor
from models.module import Module, ModuleProgress
from models.evaluation import Evaluation
from models.attendance import Attendance
from models.prediction import AIPrediction
from models.audit import AuditLog

print("Dropping existing tables...")
Base.metadata.drop_all(bind=engine)

print("Creating tables...")
Base.metadata.create_all(bind=engine)

print("Done!")