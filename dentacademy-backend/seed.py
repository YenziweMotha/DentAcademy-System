import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import bcrypt
from datetime import datetime
from faker import Faker
import random

# We will load from .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root@localhost:3306/dentacademy_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
fake = Faker("en_ZA")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10)).decode('utf-8')

def seed():
    session = SessionLocal()
    try:
        # Note: In a real environment, we'd import models here, but for a standalone seed
        # we can execute raw SQL to ensure exact compliance with the DB structure without
        # depending on SQLAlchemy model state.
        
        # Disable foreign key checks for seeding
        if "sqlite" in DATABASE_URL:
            session.execute("PRAGMA foreign_keys=OFF")
        else:
            session.execute("SET FOREIGN_KEY_CHECKS = 0")
            
        # Clean existing data
        tables = [
            "audit_log", "ai_predictions", "mentor_assignments", 
            "evaluations", "module_progress", "modules", 
            "education", "mentors", "apprentices", "users"
        ]
        for table in tables:
            session.execute(f"DELETE FROM {table}")
            
        admin_pass = hash_password("Admin@1234")
        super_pass = hash_password("Super@1234")
        mentor_pass = hash_password("Mentor@1234")
        apprent_pass = hash_password("Apprent@1234")

        # 1. Users
        users_data = [
            (1, 'admin', admin_pass, 'System Administrator', 'admin@dentacademy.co.za', 'Administrator'),
            (2, 'supervisor', super_pass, 'Main Supervisor', 'supervisor@dentacademy.co.za', 'Supervisor'),
            (3, 'mentor1', mentor_pass, 'Mentor One', 'mentor1@dentacademy.co.za', 'Mentor'),
            (4, 'mentor2', mentor_pass, 'Mentor Two', 'mentor2@dentacademy.co.za', 'Mentor'),
            (5, 'apprentice1', apprent_pass, 'Thabo Mokoena', 'apprentice1@dentacademy.co.za', 'Apprentice'),
            (6, 'apprentice2', apprent_pass, 'Lerato Ndlovu', 'apprentice2@dentacademy.co.za', 'Apprentice'),
            (7, 'apprentice3', apprent_pass, 'Sipho Nkosi', 'apprentice3@dentacademy.co.za', 'Apprentice'),
            (8, 'apprentice4', apprent_pass, 'Kgothatso Baloyi', 'apprentice4@dentacademy.co.za', 'Apprentice'),
            (9, 'apprentice5', apprent_pass, 'Tshepo Chauke', 'apprentice5@dentacademy.co.za', 'Apprentice'),
        ]
        
        for u in users_data:
            session.execute(
                "INSERT INTO users (user_id, username, password_hash, full_name, email, role) VALUES (:1, :2, :3, :4, :5, :6)",
                {"1": u[0], "2": u[1], "3": u[2], "4": u[3], "5": u[4], "6": u[5]}
            )
            
        # 2. Mentors
        mentors_data = [
            (1, 3, 'Automotive Repair'),
            (2, 4, 'Electrical Systems'),
        ]
        for m in mentors_data:
            session.execute(
                "INSERT INTO mentors (mentor_id, user_id, specialisation) VALUES (:1, :2, :3)",
                {"1": m[0], "2": m[1], "3": m[2]}
            )

        # 3. Apprentices
        apprentices_data = [
            (1, 5, 'Thabo', 'Mokoena', '0101015000080', 'Male', 'NCV', 'Capricorn TVET College'),
            (2, 6, 'Lerato', 'Ndlovu', '0202020000080', 'Female', 'NATED', 'Capricorn TVET College'),
            (3, 7, 'Sipho', 'Nkosi', '9903035000080', 'Male', 'NCV', 'Capricorn TVET College'),
            (4, 8, 'Kgothatso', 'Baloyi', '0004040000080', 'Female', 'NATED', 'Capricorn TVET College'),
            (5, 9, 'Tshepo', 'Chauke', '9805055000080', 'Male', 'NQF', 'Capricorn TVET College'),
        ]
        for a in apprentices_data:
            session.execute(
                "INSERT INTO apprentices (apprentice_id, user_id, first_name, last_name, id_number, gender, qualification_type, institution, address_province) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, 'Limpopo')",
                {"1": a[0], "2": a[1], "3": a[2], "4": a[3], "5": a[4], "6": a[5], "7": a[6], "8": a[7]}
            )

        # 4. Mentor Assignments
        assignments_data = [
            (1, 1, 1, '2026-01-10'),
            (2, 1, 2, '2026-01-10'),
            (3, 1, 3, '2026-01-10'),
            (4, 2, 4, '2026-01-10'),
            (5, 2, 5, '2026-01-10'),
        ]
        for ma in assignments_data:
            session.execute(
                "INSERT INTO mentor_assignments (assignment_id, mentor_id, apprentice_id, assigned_date) VALUES (:1, :2, :3, :4)",
                {"1": ma[0], "2": ma[1], "3": ma[2], "4": ma[3]}
            )

        # 5. Modules
        modules_data = [
            (1, 'Engine Overhaul Level 1', 'Mechanical'),
            (2, 'Engine Overhaul Level 2', 'Mechanical'),
            (3, 'Electrical Diagnostics Basic', 'Electrical'),
            (4, 'Electrical Diagnostics Advanced', 'Electrical'),
            (5, 'Panel Beating Level 1', 'Body'),
            (6, 'Panel Beating Advanced', 'Body'),
            (7, 'Workplace Safety', 'Safety'),
            (8, 'Customer Service Fundamentals', 'Soft Skills'),
        ]
        for m in modules_data:
            session.execute(
                "INSERT INTO modules (module_id, module_name, category) VALUES (:1, :2, :3)",
                {"1": m[0], "2": m[1], "3": m[2]}
            )

        # 6. Module Progress (Mix of Completed, In Progress, Not Started)
        # We will insert a few for apprentice 1
        progress_data = [
            (1, 1, 1, 3, 'Completed', 85, '2026-02-15'),
            (2, 1, 2, 3, 'In Progress', None, None),
            (3, 1, 7, 3, 'Completed', 90, '2026-01-20'),
            (4, 2, 3, 3, 'Completed', 78, '2026-03-10'),
            (5, 2, 4, 3, 'In Progress', None, None),
        ]
        for p in progress_data:
            session.execute(
                "INSERT INTO module_progress (progress_id, apprentice_id, module_id, updated_by, status, assessment_score, completion_date) VALUES (:1, :2, :3, :4, :5, :6, :7)",
                {"1": p[0], "2": p[1], "3": p[2], "4": p[3], "5": p[4], "6": p[5], "7": p[6]}
            )

        # 7. Evaluations
        evaluations_data = [
            (1, 1, 3, 4, 5, 4, 5, 4, 4, 4.33, 'Doing well', '2026-03-01', True, 2),
            (2, 1, 3, 5, 5, 5, 5, 5, 5, 5.00, 'Excellent', '2026-04-01', False, None),
            (3, 2, 3, 3, 4, 3, 4, 3, 4, 3.50, 'Needs improvement in time management', '2026-03-15', True, 2),
        ]
        for e in evaluations_data:
            session.execute(
                "INSERT INTO evaluations (evaluation_id, apprentice_id, mentor_id, discipline, commitment, willingness, teamwork, time_management, professional_conduct, overall_score, comments, submitted_at, approved, approved_by) VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13, :14)",
                {"1": e[0], "2": e[1], "3": e[2], "4": e[3], "5": e[4], "6": e[5], "7": e[6], "8": e[7], "9": e[8], "10": e[9], "11": e[10], "12": e[11], "13": e[12], "14": e[13]}
            )

        if "sqlite" in DATABASE_URL:
            session.execute("PRAGMA foreign_keys=ON")
        else:
            session.execute("SET FOREIGN_KEY_CHECKS = 1")
            
        session.commit()
        print("Database seeded successfully.")

    except Exception as e:
        session.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed()
