import logging
import os

logger = logging.getLogger("dentacademy.startup")


def run_startup():
    # Same-origin deploy on Render: password-reset / OpenRouter site URL
    # without requiring FRONTEND_URL to be set manually.
    if not os.getenv("FRONTEND_URL") and os.getenv("RENDER_EXTERNAL_URL"):
        os.environ["FRONTEND_URL"] = os.environ["RENDER_EXTERNAL_URL"].rstrip("/")

    from database import Base, engine

    # Import ALL models so SQLAlchemy registers them on Base.metadata
    from models.user import User
    from models.education import Education
    from models.mentor import Mentor
    from models.module import Module, ModuleProgress
    from models.evaluation import Evaluation
    from models.attendance import Attendance
    from models.prediction import AIPrediction
    from models.audit import AuditLog

    if os.getenv("AUTO_CREATE_TABLES", "1") == "1":
        logger.info("Ensuring database tables exist (create_all)...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables ensured.")

    if os.getenv("AUTO_SEED", "0") == "1":
        logger.info("AUTO_SEED enabled - seeding database with demo data...")
        from seed import seed

        seed()
        logger.info("AUTO_SEED complete.")
