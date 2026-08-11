import logging
import os

logger = logging.getLogger("dentacademy.startup")


def run_startup():
    from database import Base, engine

    if os.getenv("AUTO_CREATE_TABLES", "1") == "1":
        logger.info("Ensuring database tables exist (create_all)...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables ensured.")

    if os.getenv("AUTO_SEED", "0") == "1":
        logger.info("AUTO_SEED enabled - seeding database with demo data...")
        from seed import seed

        seed()
        logger.info("AUTO_SEED complete.")
