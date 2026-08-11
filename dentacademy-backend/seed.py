import os
import random
import bcrypt
from datetime import datetime, timedelta, date
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from faker import Faker
from dotenv import load_dotenv

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# ------------------------------------------------------------------
# Import Database
# ------------------------------------------------------------------

from database import Base

# ------------------------------------------------------------------
# Import ORM Models
# ------------------------------------------------------------------

from models import (
    User,
    Mentor,
    Apprentice,
    Education,
    EducationSubject,
    Module,
    ModuleProgress,
    MentorAssignment,
    Evaluation,
    Attendance,
    AIPrediction,
    AuditLog
)

# ------------------------------------------------------------------
# Environment
# ------------------------------------------------------------------

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root@localhost:3306/dentacademy_db"
)

def _tls_connect_args():
    if "tidbcloud" in DATABASE_URL or os.getenv("DB_SSL_REQUIRED") == "1":
        args = {
            "ssl_verify_cert": True,
            "ssl_verify_identity": True,
        }
        ca = os.getenv("DB_SSL_CA")
        if ca:
            args["ssl_ca"] = ca
        if os.getenv("DB_SSL_INSECURE") == "1":
            args["ssl_verify_cert"] = False
            args["ssl_verify_identity"] = False
        return args
    return {}


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=_tls_connect_args(),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def is_tidb(engine):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT @@tidb_version"))
            return True
    except Exception:
        return False


TIDB = is_tidb(engine)

# ------------------------------------------------------------------
# Reproducibility
# ------------------------------------------------------------------

SEED = 42

random.seed(SEED)
Faker.seed(SEED)

fake = Faker("zu_ZA")


# ------------------------------------------------------------------
# Audit-immutability triggers (recreated after cleanup)
# ------------------------------------------------------------------

def drop_audit_triggers(session):
    if TIDB:
        print("Skipping trigger drop (TiDB does not support triggers)")
        return
    session.execute(text("DROP TRIGGER IF EXISTS audit_log_no_update"))
    session.execute(text("DROP TRIGGER IF EXISTS audit_log_no_delete"))
    session.commit()


def create_audit_triggers(session):
    if TIDB:
        print("Skipping trigger creation (TiDB does not support triggers)")
        return
    session.execute(
        text(
            "CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log "
            "FOR EACH ROW SIGNAL SQLSTATE '45000' "
            "SET MESSAGE_TEXT = 'audit_log is INSERT-ONLY; updates are forbidden'"
        )
    )
    session.execute(
        text(
            "CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log "
            "FOR EACH ROW SIGNAL SQLSTATE '45000' "
            "SET MESSAGE_TEXT = 'audit_log is INSERT-ONLY; deletes are forbidden'"
        )
    )
    session.commit()

# ------------------------------------------------------------------
# Dataset Size
# ------------------------------------------------------------------

NUMBER_OF_APPRENTICES = 150

NUMBER_OF_MENTORS = 20

EVALUATIONS_PER_APPRENTICE = 5

ATTENDANCE_PERIODS = 6

# ------------------------------------------------------------------
# Default Passwords
# ------------------------------------------------------------------

ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123")

SUPERVISOR_PASSWORD = os.getenv("SEED_SUPERVISOR_PASSWORD", "Super@123")

MENTOR_PASSWORD = os.getenv("SEED_MENTOR_PASSWORD", "Mentor@123")

APPRENTICE_PASSWORD = os.getenv("SEED_APPRENTICE_PASSWORD", "Apprent@123")

# ------------------------------------------------------------------
# South African First Names
# ------------------------------------------------------------------

FIRST_NAMES = [

    "Thabo",
    "Sipho",
    "Tshepo",
    "Neo",
    "Tumelo",
    "Lerato",
    "Kgothatso",
    "Karabo",
    "Mpho",
    "Kagiso",

    "Refilwe",
    "Palesa",
    "Boitumelo",
    "Lesego",
    "Keletso",
    "Onthatile",
    "Katlego",
    "Kamohelo",
    "Ayanda",
    "Luyanda",

    "Sibusiso",
    "Bongani",
    "Mandla",
    "Andile",
    "Nkosinathi",
    "Siyabonga",
    "Lindokuhle",
    "Aphiwe",
    "Khanyisa",
    "Ntando",

    "Amahle",
    "Nomsa",
    "Zanele",
    "Nompumelelo",
    "Lungile",
    "Zinhle",
    "Banele",
    "Nokuthula",
    "Sanele",
    "Lethabo"

]

# ------------------------------------------------------------------
# South African Surnames
# ------------------------------------------------------------------

LAST_NAMES = [

    "Mokoena",
    "Nkosi",
    "Ndlovu",
    "Baloyi",
    "Chauke",

    "Khoza",
    "Mahlangu",
    "Mabena",
    "Maseko",
    "Molefe",

    "Molefi",
    "Dlamini",
    "Masuku",
    "Radebe",
    "Khumalo",

    "Mabunda",
    "Mashaba",
    "Mkhize",
    "Zulu",
    "Ngobeni",

    "Ramabulana",
    "Netshifhefhe",
    "Munyai",
    "Sithole",
    "Mathonsi",

    "Mthembu",
    "Mabaso",
    "Modise",
    "Mafela",
    "Mokoena"

]

# ------------------------------------------------------------------
# TVET Colleges
# ------------------------------------------------------------------

TVET_COLLEGES = [

    "Capricorn TVET College",
    "Orbit TVET College",
    "Majuba TVET College",
    "Coastal TVET College",
    "Tshwane South TVET College",
    "Ekurhuleni East TVET College",
    "Buffalo City TVET College",
    "West Coast TVET College",
    "Flavius Mareka TVET College",
    "King Sabata Dalindyebo TVET College"

]

# ------------------------------------------------------------------
# Provinces
# ------------------------------------------------------------------

PROVINCES = {

    "Limpopo":[
        "Polokwane",
        "Tzaneen",
        "Mokopane",
        "Thohoyandou"
    ],

    "Mpumalanga":[
        "Mbombela",
        "Middelburg",
        "Secunda",
        "Emalahleni"
    ],

    "Gauteng":[
        "Johannesburg",
        "Pretoria",
        "Benoni",
        "Soweto"
    ],

    "Free State":[
        "Bloemfontein",
        "Welkom",
        "Bethlehem"
    ],

    "North West":[
        "Mahikeng",
        "Rustenburg",
        "Klerksdorp"
    ],

    "KwaZulu-Natal":[
        "Durban",
        "Pietermaritzburg",
        "Newcastle"
    ],

    "Eastern Cape":[
        "Gqeberha",
        "Mthatha",
        "East London"
    ],

    "Western Cape":[
        "Cape Town",
        "George",
        "Paarl"
    ],

    "Northern Cape":[
        "Kimberley",
        "Kuruman",
        "Upington"
    ]

}

# ------------------------------------------------------------------
# Qualification Types
# ------------------------------------------------------------------

QUALIFICATIONS = [

    "NCV",
    "NATED",
    "NQF"

]

QUALIFICATION_WEIGHTS = [

    0.50,
    0.35,
    0.15

]

# ------------------------------------------------------------------
# Mentor Specialisations
# ------------------------------------------------------------------

SPECIALISATIONS = [

    "Automotive Repair",
    "Motor Mechanics",
    "Diesel Mechanics",
    "Vehicle Diagnostics",
    "Auto Electrical",
    "Electrical Systems",
    "Engine Rebuilding",
    "Panel Beating",
    "Spray Painting",
    "Workshop Management"

]

# ------------------------------------------------------------------
# Training Modules
# ------------------------------------------------------------------

MODULES = [

    ("Engine Overhaul Level 1","Mechanical"),
    ("Engine Overhaul Level 2","Mechanical"),
    ("Electrical Diagnostics Basic","Electrical"),
    ("Electrical Diagnostics Advanced","Electrical"),
    ("Panel Beating Level 1","Body"),
    ("Panel Beating Advanced","Body"),
    ("Workplace Safety","Safety"),
    ("Customer Service Fundamentals","Soft Skills"),
    ("Hybrid Vehicle Fundamentals","Electrical"),
    ("Workshop Quality Assurance","Management"),
    ("Engine Management Systems","Mechanical")

]
# ======================================================================
# HELPER FUNCTIONS
# ======================================================================

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    """
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=10)
    ).decode("utf-8")


# ----------------------------------------------------------------------
# RANDOM DATES
# ----------------------------------------------------------------------

def random_birth_date(min_age=18, max_age=35):
    """
    Generate a realistic apprentice birth date.
    """
    today = date.today()

    start = today - timedelta(days=max_age * 365)

    end = today - timedelta(days=min_age * 365)

    return fake.date_between(start_date=start, end_date=end)


def random_recent_date(days_back=730):

    return fake.date_between(
        start_date=f"-{days_back}d",
        end_date="today"
    )


# ----------------------------------------------------------------------
# SOUTH AFRICAN PHONE NUMBERS
# ----------------------------------------------------------------------

def generate_phone_number():

    prefixes = [

        "060","061","062","063","064",

        "065","066","067","068",

        "071","072","073","074",

        "076","078","079",

        "081","082","083","084"

    ]

    return random.choice(prefixes) + "".join(
        random.choices("0123456789", k=7)
    )

# ----------------------------------------------------------------------
# SOUTH AFRICAN ID NUMBER GENERATOR
# ----------------------------------------------------------------------

def luhn_checksum(number: str) -> int:
    """
    Calculate the Luhn check digit.
    """

    digits = [int(d) for d in number]

    odd_sum = sum(digits[::2])

    even_digits = ""

    for d in digits[1::2]:
        even_digits += str(d * 2)

    even_sum = sum(int(x) for x in even_digits)

    total = odd_sum + even_sum

    return (10 - (total % 10)) % 10


def generate_sa_id(date_of_birth, gender):
    """
    Generate a valid South African ID number.
    """

    yy = date_of_birth.strftime("%y")
    mm = date_of_birth.strftime("%m")
    dd = date_of_birth.strftime("%d")

    # ---------------------------------------------------------
    # Gender digits
    # ---------------------------------------------------------

    if gender == "Male":

        gender_digits = random.randint(5000, 9999)

    elif gender == "Female":

        gender_digits = random.randint(0, 4999)

    else:

        gender_digits = random.randint(4500, 5500)

    gender_digits = f"{gender_digits:04d}"

    # ---------------------------------------------------------
    # Citizenship
    # ---------------------------------------------------------

    citizenship = random.choices(

        ["0", "1"],

        weights=[97, 3],

        k=1

    )[0]

    # ---------------------------------------------------------
    # Race digit
    # Always 8 for modern SA IDs
    # ---------------------------------------------------------

    race = "8"

    first12 = (

        yy +

        mm +

        dd +

        gender_digits +

        citizenship +

        race

    )

    checksum = str(

        luhn_checksum(first12)

    )

    return first12 + checksum

# ----------------------------------------------------------------------
# NAME GENERATION
# ----------------------------------------------------------------------

def generate_name():

    first = random.choice(FIRST_NAMES)

    last = random.choice(LAST_NAMES)

    return first,last


# ----------------------------------------------------------------------
# USERNAME
# ----------------------------------------------------------------------

def generate_username(first,last,number):

    return (
        first.lower()
        + "."
        + last.lower()
        + str(number)
    )


# ----------------------------------------------------------------------
# EMAIL
# ----------------------------------------------------------------------

def generate_email(username):

    domains = [

        "dentacademy.co.za",

        "student.dentacademy.co.za"

    ]

    return username + "@" + random.choice(domains)


# ----------------------------------------------------------------------
# LOCATION
# ----------------------------------------------------------------------

def generate_location():

    province = random.choice(list(PROVINCES.keys()))

    city = random.choice(PROVINCES[province])

    address = (
        f"{random.randint(1,999)} "
        f"{fake.street_name()}"
    )

    return address,city,province


# ----------------------------------------------------------------------
# QUALIFICATION
# ----------------------------------------------------------------------

def generate_qualification():

    return random.choices(

        QUALIFICATIONS,

        weights=QUALIFICATION_WEIGHTS,

        k=1

    )[0]


# ----------------------------------------------------------------------
# TVET COLLEGE
# ----------------------------------------------------------------------

def generate_college():

    return random.choice(TVET_COLLEGES)


# ----------------------------------------------------------------------
# EDUCATION SUBJECTS
# ----------------------------------------------------------------------

SUBJECT_POOL = [

    "Engineering Mathematics",

    "Engineering Science",

    "Motor Trade Theory",

    "Workshop Practice",

    "Vehicle Electronics",

    "Engineering Drawing",

    "Occupational Safety",

    "Electrical Principles",

    "Automotive Systems",

    "Workshop Processes"

]


def generate_subject_marks(ability):

    records = []

    total = 0

    chosen = random.sample(SUBJECT_POOL,4)

    for subject in chosen:

        base = ability * 100

        score = int(

            random.gauss(

                base,

                8

            )

        )

        score = max(40,min(score,95))

        total += score

        records.append({

            "subject":subject,

            "mark":score

        })

    average = round(total/4,2)

    return records,average

# ==========================================================
# CREATE USERS
# ==========================================================

def create_users(session):
    """
    Creates the two staff accounts:
        - 1 Administrator (admin / Admin@123)
        - 1 Supervisor (supervisor / Super@123)
    Bulk mentor/apprentice user accounts are created alongside their
    profiles in create_mentors / create_apprentices (no orphan accounts).

    Returns:
        users (list)
        supervisor (User)
    """

    print("Creating users...")

    users = []

    # ------------------------------------------------------
    # Administrator
    # ------------------------------------------------------

    admin = User(
        username="admin",
        email="admin@dentacademy.co.za",
        password_hash=hash_password("Admin@123"),
        full_name="System Administrator",
        role="Administrator",
        is_active=True,
    )

    session.add(admin)
    users.append(admin)

    # ------------------------------------------------------
    # Supervisor
    # ------------------------------------------------------

    supervisor = User(
        username="supervisor",
        email="supervisor@dentacademy.co.za",
        password_hash=hash_password("Super@123"),
        full_name="Main Supervisor",
        role="Supervisor",
        is_active=True,
    )

    session.add(supervisor)
    users.append(supervisor)

    session.commit()

    print(f"✓ Created {len(users):,} staff users.")

    return users, supervisor
# ----------------------------------------------------------------------
# APPRENTICE PROFILE
# ----------------------------------------------------------------------

def generate_profile():

    profile = {

        "technical_skill":random.uniform(0.30,0.98),

        "discipline":random.uniform(0.30,0.98),

        "motivation":random.uniform(0.30,0.98),

        "communication":random.uniform(0.30,0.98),

        "attendance":random.uniform(0.30,0.99),

        "teamwork":random.uniform(0.30,0.98)

    }

    profile["ability"] = round(

        sum(profile.values())/

        len(profile),

        3

    )

    return profile


# ----------------------------------------------------------------------
# SCORE CALCULATOR
# -------------------------------------------Su---------------------------

def score_from_profile(value):

    score = int(

        random.gauss(

            value * 100,

            6

        )

    )

    return max(40,min(score,100))


# ----------------------------------------------------------------------
# EVALUATION CALCULATOR
# ----------------------------------------------------------------------

def evaluation_score(value):

    score = round(

        random.gauss(

            1 + (value * 4),

            0.40

        ),

        2

    )

    return max(1,min(score,5))


# ----------------------------------------------------------------------
# RANDOM COMMENT
# ----------------------------------------------------------------------

GOOD_COMMENTS = [

    "Excellent workshop performance.",

    "Shows initiative during practical sessions.",

    "Highly motivated apprentice.",

    "Consistently demonstrates professional conduct.",

    "Excellent technical understanding."

]

AVERAGE_COMMENTS = [

    "Progressing steadily.",

    "Needs more practical experience.",

    "Attendance could improve.",

    "Shows potential with guidance.",

    "Learning at an acceptable pace."

]

POOR_COMMENTS = [

    "Requires close supervision.",

    "Needs improvement in technical skills.",

    "Attendance is inconsistent.",

    "Must improve workplace discipline.",

    "Requires additional mentoring."

]


def generate_comment(overall):

    if overall >= 4.2:

        return random.choice(GOOD_COMMENTS)

    elif overall >= 3:

        return random.choice(AVERAGE_COMMENTS)

    else:

        return random.choice(POOR_COMMENTS)


# ----------------------------------------------------------------------
# BATCH COMMIT
# ----------------------------------------------------------------------

def commit_batch(session,count,size=500):

    if count % size == 0:

        session.commit()

        print(f"Committed {count:,} records...")
# ======================================================================
# ADMINISTRATOR
# ======================================================================

def create_admin(session):

    admin = User(
        username="admin",
        password_hash=hash_password(ADMIN_PASSWORD),
        full_name="System Administrator",
        email="admin@dentacademy.co.za",
        role="Administrator",
        is_active=True
    )

    session.add(admin)
    session.flush()

    print("✓ Administrator created")

    return admin


# ======================================================================
# SUPERVISOR
# ======================================================================

def create_supervisor(session):

    supervisor = User(
        username="supervisor",
        password_hash=hash_password(SUPERVISOR_PASSWORD),
        full_name="Main Supervisor",
        email="supervisor@dentacademy.co.za",
        role="Supervisor",
        is_active=True
    )

    session.add(supervisor)
    session.flush()

    print("✓ Supervisor created")

    return supervisor


# ======================================================================
# MENTORS
# ======================================================================

def create_mentors(session):

    mentors = []

    mentor_users = []

    print(f"\nCreating {NUMBER_OF_MENTORS} mentors...")

    for i in range(1, NUMBER_OF_MENTORS + 1):

        first, last = generate_name()

        username = f"mentor{i:03}"

        user = User(

            username=username,

            password_hash=hash_password(MENTOR_PASSWORD),

            full_name=f"{first} {last}",

            email=generate_email(username),

            role="Mentor",

            is_active=True

        )

        session.add(user)

        mentor_users.append(user)

        if i % 100 == 0:

            session.flush()

    session.flush()

    print("✓ Mentor user accounts created")

    for index, user in enumerate(mentor_users, start=1):
        # Split the full name from the User record
     first_name, surname = user.full_name.split(" ", 1)

     mentor = Mentor(
        user_id=user.user_id,
        name=first_name,
        surname=surname,
        contact_number=generate_phone_number(),
        email=user.email,
        specialisation=random.choice(SPECIALISATIONS))

     session.add(mentor)

     mentors.append(mentor)

     if index % 250 == 0:
        session.flush()

    session.flush()

    session.commit()

    print(f"✓ {len(mentors):,} mentors created")

    return mentors

# ======================================================================
# CREATE APPRENTICES
# ======================================================================

def create_apprentices(session, mentors):

    print(f"\nCreating {NUMBER_OF_APPRENTICES:,} apprentices...")

    apprentices = []
    apprentice_users = []
    apprentice_profiles = {}

    mentor_cycle = 0

    for i in range(1, NUMBER_OF_APPRENTICES + 1):

        # ----------------------------------------------------------
        # Basic Personal Information
        # ----------------------------------------------------------

        first_name, last_name = generate_name()

        gender = random.choices(
            ["Male", "Female", "Other"],
            weights=[75, 24, 1],
            k=1
        )[0]

        dob = random_birth_date()

        username = f"apprentice{i:05}"

        email = generate_email(username)

        phone = generate_phone_number()

        sa_id = generate_sa_id(
            dob,
            gender
        )

        address, city, province = generate_location()

        # ----------------------------------------------------------
        # Hidden ML profile
        # ----------------------------------------------------------

        profile = generate_profile()

        # ----------------------------------------------------------
        # User Account
        # ----------------------------------------------------------

        user = User(

            username=username,

            email=email,

            password_hash=hash_password(
                APPRENTICE_PASSWORD
            ),

            full_name=f"{first_name} {last_name}",

            role="Apprentice",

            is_active=True

        )

        session.add(user)

        session.flush()

        apprentice_users.append(user)

        # ----------------------------------------------------------
        # Apprentice Record
        # ----------------------------------------------------------

        apprentice = Apprentice(

            user_id=user.user_id,

            surname=last_name,

            first_name=first_name,

            date_of_birth=dob,

            gender=gender,

            id_number=sa_id,

            contact_number=phone,

            address_line1=address,

            city=city,

            province=province,

            status="ACTIVE",

            is_synthetic=True

        )

        session.add(apprentice)

        session.flush()

        apprentices.append(apprentice)

        apprentice_profiles[
            apprentice.apprentice_id
        ] = profile

  
        # ----------------------------------------------------------
        # Batch Commit
        # ----------------------------------------------------------

        if i % 250 == 0:

            session.commit()

            print(
                f"Created {i:,}/{NUMBER_OF_APPRENTICES:,} apprentices..."
            )

    session.commit()

    print(
        f"\n✓ {len(apprentices):,} apprentices created."
    )

    return (

        apprentices,

        apprentice_profiles

    )
# ======================================================================
# PART 2B - EDUCATION + MENTOR ASSIGNMENTS
# ======================================================================

def create_education_records(
        session,
        apprentices,
        apprentice_profiles,
        mentors):

    print("\nCreating education records...")

    mentor_count = len(mentors)

    assignment_counter = 1

    for index, apprentice in enumerate(apprentices):

        profile = apprentice_profiles[apprentice.apprentice_id]

        # ----------------------------------------------------------
        # Qualification
        # ----------------------------------------------------------

        qualification = generate_qualification()

        institution = generate_college()

        subjects, average_mark = generate_subject_marks(
            profile["ability"]
        )

        education = Education(

            apprentice_id=apprentice.apprentice_id,

            qualification_type=qualification,

            institution_name=institution,

            subjects=[
                EducationSubject(subject_name=s["subject"], mark=s["mark"])
                for s in subjects
            ],

            average_mark=average_mark

        )

        session.add(education)

        # ----------------------------------------------------------
        # Mentor Assignment
        # ----------------------------------------------------------

        mentor = mentors[index % mentor_count]

        assignment = MentorAssignment(

            mentor_id=mentor.mentor_id,

            apprentice_id=apprentice.apprentice_id,

            assigned_date=random_recent_date(540)

        )

        session.add(assignment)

        if assignment_counter % 500 == 0:

            session.commit()

            print(

                f"Education records: "
                f"{assignment_counter:,}/{len(apprentices):,}"

            )


        assignment_counter += 1

    session.commit()

    print(

        f"✓ {len(apprentices):,} education records created."

    )

    print(

        f"✓ {len(apprentices):,} mentor assignments created."

    )

# =====================================================================
# PART 3A - ATTENDANCE RECORDS
# =====================================================================

def create_attendance_records(
        session,
        apprentices,
        apprentice_profiles,
        supervisor):

    print("\nCreating attendance records...")

    attendance_counter = 0

    for apprentice in apprentices:

        profile = apprentice_profiles[apprentice.apprentice_id]

        # Hidden attendance tendency
        attendance_ability = profile["attendance"]

        # Six monthly attendance records
        period_end = date.today().replace(day=1) - timedelta(days=1)

        for month in range(6):

            month_end = period_end - relativedelta(months=month)

            month_start = month_end.replace(day=1)

            days_expected = random.randint(20, 23)

            attendance_rate = max(
                55,
                min(
                    100,
                    random.gauss(
                        attendance_ability * 100,
                        5
                    )
                )
            )

            days_present = round(
                days_expected *
                attendance_rate /
                100
            )

            attendance = Attendance(

                apprentice_id=apprentice.apprentice_id,

                period_start=month_start,

                period_end=month_end,

                days_expected=days_expected,

                days_present=days_present,

                attendance_rate=round(attendance_rate, 2),

                recorded_by=supervisor.user_id

            )

            session.add(attendance)

            attendance_counter += 1

        # Commit every 500 apprentices
        if apprentice.apprentice_id % 500 == 0:

            session.commit()

            print(
                f"{apprentice.apprentice_id:,} apprentices processed..."
            )

    session.commit()

    print(
        f"\n✓ {attendance_counter:,} attendance records created."
    )

# =====================================================================
# PART 3B - MODULE PROGRESS
# =====================================================================
def create_modules(session):
    """
    Creates all training modules used by the apprenticeship programme.
    Returns a list of Module ORM objects.
    """

    print("\nCreating training modules...")

    module_data = [

        # Mechanical
        ("Workshop Safety", "Safety"),
        ("Hand Tools and Equipment", "Mechanical"),
        ("Engine Rebuilding", "Mechanical"),
        ("Engine Diagnostics", "Mechanical"),
        ("Transmission Systems", "Mechanical"),
        ("Suspension and Steering", "Mechanical"),

        # Electrical
        ("Automotive Electrical Systems", "Electrical"),
        ("Electronic Diagnostics", "Electrical"),
        ("Battery and Charging Systems", "Electrical"),

        # Body Repair
        ("Panel Beating Fundamentals", "Body"),
        ("Vehicle Spray Painting", "Body"),

        # Workplace Skills
        ("Customer Service", "Soft Skills"),
        ("Workplace Communication", "Soft Skills"),
        ("Technical Report Writing", "Soft Skills"),
        ("Problem Solving", "Soft Skills"),
        ("Teamwork in the Workshop", "Soft Skills"),

        # Advanced
        ("Diesel Engine Technology", "Mechanical"),
        ("Hybrid Vehicle Systems", "Electrical"),
        ("Air Conditioning Systems", "Mechanical"),
        ("Brake Systems", "Mechanical")
    ]

    modules = []

    for name, category in module_data:

        module = Module(
            module_name=name,
            category=category
        )

        session.add(module)
        modules.append(module)

    session.commit()

    print(f"✓ {len(modules)} modules created")

    return modules


def create_module_progress(
        session,
        apprentices,
        apprentice_profiles,
        mentors):

    print("\nCreating module progress...")

    modules = session.query(Module).order_by(
        Module.module_id
    ).all()

    if not modules:
        raise Exception(
            "No modules found. Seed modules before generating progress."
        )

    mentor_ids = [m.user_id for m in mentors]

    progress_counter = 0

    statuses = [
        "Completed",
        "In Progress",
        "Not Started"
    ]

    for apprentice in apprentices:

        profile = apprentice_profiles[
            apprentice.apprentice_id
        ]

        ability = profile["ability"]

        for module in modules:

            # --------------------------------------------------------
            # Progress Status
            # --------------------------------------------------------

            probability = random.random()

            if probability < 0.75:

                status = "Completed"

            elif probability < 0.95:

                status = "In Progress"

            else:

                status = "Not Started"

            # --------------------------------------------------------
            # Assessment Score
            # --------------------------------------------------------

            if status == "Completed":

                assessment_score = score_from_profile(
                    ability
                )

                completion_date = random_recent_date(540)

            else:

                assessment_score = None

                completion_date = None

            # --------------------------------------------------------
            # Mentor responsible
            # --------------------------------------------------------

            updated_by = random.choice(
                mentor_ids
            )

            progress = ModuleProgress(

                apprentice_id=apprentice.apprentice_id,

                module_id=module.module_id,

                updated_by=updated_by,

                status=status,

                assessment_score=assessment_score,

                completion_date=completion_date

            )

            session.add(progress)

            progress_counter += 1

        # ------------------------------------------------------------
        # Batch Commit
        # ------------------------------------------------------------

        if apprentice.apprentice_id % 250 == 0:

            session.commit()

            print(

                f"{apprentice.apprentice_id:,} apprentices processed..."

            )

    session.commit()

    print(

        f"\n✓ {progress_counter:,} module progress records created."

    )

# =====================================================================
# PART 3C - EVALUATIONS
# =====================================================================

def create_evaluations(
        session,
        apprentices,
        apprentice_profiles,
        mentors,
        supervisor):

    print("\nCreating evaluations...")

    mentor_lookup = {}

    assignments = session.query(MentorAssignment).all()

    for assignment in assignments:
        mentor_lookup[
            assignment.apprentice_id
        ] = assignment.mentor_id

    evaluation_counter = 0

    for apprentice in apprentices:

        profile = apprentice_profiles[
            apprentice.apprentice_id
        ]

        mentor_id = mentor_lookup.get(
            apprentice.apprentice_id
        )

        if mentor_id is None:
            continue

        # ----------------------------------------------------------
        # Generate three quarterly evaluations
        # ----------------------------------------------------------

        for quarter in range(3):

            discipline = evaluation_score(
                profile["discipline"]
            )

            commitment = evaluation_score(
                profile["motivation"]
            )

            willingness = evaluation_score(
                profile["motivation"]
            )

            teamwork = evaluation_score(
                profile["teamwork"]
            )

            time_management = evaluation_score(
                profile["attendance"]
            )

            professional_conduct = evaluation_score(
                (
                    profile["discipline"] +
                    profile["communication"]
                ) / 2
            )

            overall = round(

                (

                    discipline +

                    commitment +

                    willingness +

                    teamwork +

                    time_management +

                    professional_conduct

                ) / 6,

                2

            )

            approved = random.random() < 0.95

            submitted_date = random_recent_date(540)

            if approved:

                approved_by = supervisor.user_id

                approved_at = datetime.combine(

                    submitted_date,

                    datetime.min.time()

                ) + timedelta(

                    days=random.randint(1, 14)

                )

            else:

                approved_by = None

                approved_at = None

            evaluation = Evaluation(

                apprentice_id=apprentice.apprentice_id,

                mentor_id=mentor_id,

                discipline=discipline,

                commitment=commitment,

                willingness=willingness,

                teamwork=teamwork,

                time_management=time_management,

                professional_conduct=professional_conduct,

                overall_score=overall,

                comments=generate_comment(overall),

                submitted_at=datetime.combine(

                    submitted_date,

                    datetime.min.time()

                ),

                approved=approved,

                approved_by=approved_by,

                approved_at=approved_at

            )

            session.add(evaluation)

            evaluation_counter += 1

        # ----------------------------------------------------------
        # Batch Commit
        # ----------------------------------------------------------

        if apprentice.apprentice_id % 250 == 0:

            session.commit()

            print(

                f"{apprentice.apprentice_id:,} apprentices processed..."

            )

    session.commit()

    print(

        f"\n✓ {evaluation_counter:,} evaluations created."

    )

# =====================================================================
# PART 3D - AI PREDICTIONS
# =====================================================================

def create_ai_predictions(
        session,
        apprentices,
        apprentice_profiles,
        supervisor):

    print("\nCreating AI predictions...")

    prediction_counter = 0

    # Cache attendance
    attendance_lookup = {}

    attendance_rows = session.query(Attendance).all()

    for row in attendance_rows:

        attendance_lookup.setdefault(
            row.apprentice_id,
            []
        ).append(float(row.attendance_rate))

    # Cache module scores
    module_lookup = {}

    module_rows = session.query(ModuleProgress).all()

    for row in module_rows:

        if row.assessment_score is not None:

            module_lookup.setdefault(
                row.apprentice_id,
                []
            ).append(float(row.assessment_score))

    # Cache evaluation scores
    evaluation_lookup = {}

    evaluation_rows = session.query(Evaluation).all()

    for row in evaluation_rows:

        evaluation_lookup.setdefault(
            row.apprentice_id,
            []
        ).append(float(row.overall_score))

    for apprentice in apprentices:

        profile = apprentice_profiles[
            apprentice.apprentice_id
        ]

        attendance = attendance_lookup.get(
            apprentice.apprentice_id,
            []
        )

        module_scores = module_lookup.get(
            apprentice.apprentice_id,
            []
        )

        evaluations = evaluation_lookup.get(
            apprentice.apprentice_id,
            []
        )

        # ----------------------------------------------------------
        # Feature Engineering
        # ----------------------------------------------------------

        average_attendance = (
            round(sum(attendance) / len(attendance), 2)
            if attendance else None
        )

        average_module = (
            round(sum(module_scores) / len(module_scores), 2)
            if module_scores else None
        )

        average_evaluation = (
            round(sum(evaluations) / len(evaluations), 2)
            if evaluations else None
        )

        missing_fields = []

        if average_attendance is None:
            missing_fields.append("attendance")

        if average_module is None:
            missing_fields.append("module_progress")

        if average_evaluation is None:
            missing_fields.append("evaluations")

        predictable = len(missing_fields) == 0

        # ----------------------------------------------------------
        # Prediction Logic
        # ----------------------------------------------------------

        if predictable:

            completion = round(

                0.40 * average_module +

                0.35 * (average_evaluation * 20) +

                0.25 * average_attendance,

                2

            )

            completion = max(
                0,
                min(completion, 100)
            )

            dropout = round(

                100 - completion +

                random.uniform(-5, 5),

                2

            )

            dropout = max(
                0,
                min(dropout, 100)
            )

            employment = round(

                completion * 0.75 +

                random.uniform(5, 15),

                2

            )

            employment = max(
                0,
                min(employment, 100)
            )

            confidence = round(

                random.uniform(
                    85,
                    99
                ),

                2

            )

        else:

            completion = None
            dropout = None
            employment = None
            confidence = None

        # ----------------------------------------------------------
        # Snapshot used by the ML model
        # ----------------------------------------------------------

        snapshot = {

            "ability": profile["ability"],

            "technical_skill": profile["technical_skill"],

            "discipline": profile["discipline"],

            "motivation": profile["motivation"],

            "communication": profile["communication"],

            "teamwork": profile["teamwork"],

            "attendance_average": average_attendance,

            "module_average": average_module,

            "evaluation_average": average_evaluation

        }

        prediction = AIPrediction(

            apprentice_id=apprentice.apprentice_id,

            generated_by=supervisor.user_id,

            completion_likelihood=completion,

            dropout_risk=dropout,

            employment_readiness=employment,

            confidence_score=confidence,

            feature_snapshot_json=snapshot,

            missing_fields=missing_fields,

            predictable=predictable

        )

        session.add(prediction)

        prediction_counter += 1

        # ----------------------------------------------------------
        # Batch Commit
        # ----------------------------------------------------------

        if prediction_counter % 500 == 0:

            session.commit()

            print(

                f"{prediction_counter:,} predictions generated..."

            )

    session.commit()

    print(

        f"\n✓ {prediction_counter:,} AI predictions created."

    )

# =====================================================================
# PART 3E - AUDIT LOGS
# =====================================================================

def create_audit_logs(
        session,
        apprentices,
        mentors,
        supervisor):

    print("\nCreating audit logs...")

    log_counter = 0

    # -------------------------------------------------------------
    # LOGIN EVENTS
    # -------------------------------------------------------------

    users = session.query(User).all()

    for user in users:

        login_date = fake.date_time_between(
            start_date="-180d",
            end_date="now"
        )

        session.add(

            AuditLog(

                user_id=user.user_id,

                action_type="LOGIN",

                entity_type="User",

                record_id=user.user_id,

                ip_address=fake.ipv4_public(),

                timestamp=login_date

            )

        )

        log_counter += 1

    session.commit()

    print("✓ Login logs created")

    # -------------------------------------------------------------
    # APPRENTICE RECORD CREATION
    # -------------------------------------------------------------

    for apprentice in apprentices:

        session.add(

            AuditLog(

                user_id=supervisor.user_id,

                action_type="CREATE",

                entity_type="Apprentice",

                record_id=apprentice.apprentice_id,

                new_value_json={

                    "status": "ACTIVE",

                    "synthetic": True

                },

                ip_address=fake.ipv4_public(),

                timestamp=fake.date_time_between(

                    start_date="-365d",

                    end_date="-180d"

                )

            )

        )

        log_counter += 1

        if log_counter % 500 == 0:

            session.commit()

    session.commit()

    print("✓ Apprentice creation logs created")

    # -------------------------------------------------------------
    # EVALUATION APPROVALS
    # -------------------------------------------------------------

    evaluations = session.query(Evaluation).all()

    for evaluation in evaluations:

        if evaluation.approved:

            session.add(

                AuditLog(

                    user_id=supervisor.user_id,

                    action_type="EVALUATION_APPROVED",

                    entity_type="Evaluation",

                    record_id=evaluation.evaluation_id,

                    ip_address=fake.ipv4_public(),

                    timestamp=evaluation.approved_at

                )

            )

            log_counter += 1

    session.commit()

    print("✓ Evaluation approval logs created")

    # -------------------------------------------------------------
    # AI PREDICTIONS
    # -------------------------------------------------------------

    predictions = session.query(AIPrediction).all()

    for prediction in predictions:

        session.add(

            AuditLog(

                user_id=supervisor.user_id,

                action_type="PREDICTION_GENERATED",

                entity_type="AIPrediction",

                record_id=prediction.prediction_id,

                ip_address=fake.ipv4_public(),

                timestamp=prediction.generated_at

            )

        )

        log_counter += 1

        if log_counter % 500 == 0:

            session.commit()

    session.commit()

    print("✓ Prediction logs created")

    # -------------------------------------------------------------
    # REPORT GENERATION
    # -------------------------------------------------------------

    for _ in range(250):

        session.add(

            AuditLog(

                user_id=supervisor.user_id,

                action_type="REPORT_GENERATED",

                entity_type="Dashboard",

                record_id=None,

                ip_address=fake.ipv4_public(),

                timestamp=fake.date_time_between(

                    start_date="-120d",

                    end_date="now"

                )

            )

        )

        log_counter += 1

    session.commit()

    print("✓ Report generation logs created")

    # -------------------------------------------------------------
    # FAILED LOGIN ATTEMPTS
    # -------------------------------------------------------------

    for _ in range(150):

        random_user = random.choice(users)

        session.add(

            AuditLog(

                user_id=random_user.user_id,

                action_type="LOGIN_FAILED",

                entity_type="User",

                record_id=random_user.user_id,

                ip_address=fake.ipv4_public(),

                timestamp=fake.date_time_between(

                    start_date="-90d",

                    end_date="now"

                )

            )

        )

        log_counter += 1

    session.commit()

    print("✓ Failed login logs created")

    print(f"\n✓ {log_counter:,} audit log records created.")
    
# =====================================================================
# PART 3F - MAIN SEED FUNCTION
# =====================================================================

def seed():

    session = SessionLocal()

    try:

        print("=" * 70)
        print("DENT ACADEMY DATABASE SEEDER")
        print("=" * 70)

        # -------------------------------------------------------------
        # Disable FK Checks
        # -------------------------------------------------------------

        if "sqlite" in DATABASE_URL:

            session.execute(next("PRAGMA foreign_keys=OFF"))

        else:

            session.execute(text("SET FOREIGN_KEY_CHECKS=0"))

        # -------------------------------------------------------------
        # Delete Existing Data
        # -------------------------------------------------------------

        print("\nCleaning database...")

        drop_audit_triggers(session)

        try:

            session.query(AuditLog).delete()
            session.query(AIPrediction).delete()
            session.query(Attendance).delete()
            session.query(Evaluation).delete()
            session.query(ModuleProgress).delete()
            session.query(MentorAssignment).delete()
            session.query(EducationSubject).delete()
            session.query(Education).delete()
            session.query(Apprentice).delete()
            session.query(Mentor).delete()
            session.query(Module).delete()
            session.query(User).delete()

            session.commit()

        finally:

            create_audit_triggers(session)

        print("Database cleaned.")

        # -------------------------------------------------------------
        # Enable FK Checks
        # -------------------------------------------------------------

        if "sqlite" in DATABASE_URL:

            session.execute(text("PRAGMA foreign_keys=ON"))

        else:

            session.execute(text("SET FOREIGN_KEY_CHECKS=1"))

        # -------------------------------------------------------------
        # PART 1
        # -------------------------------------------------------------

        print("\n==============================")
        print("PART 1")
        print("==============================")

        users, supervisor = create_users(session)

        mentors = create_mentors(session)

        modules = create_modules(session)

        # -------------------------------------------------------------
        # PART 2
        # -------------------------------------------------------------

        print("\n==============================")
        print("PART 2")
        print("==============================")

        apprentices, apprentice_profiles = create_apprentices(session, mentors)

        create_education_records(
         session,
         apprentices,
          apprentice_profiles,
         mentors
)

     #   create_mentor_assignments(
     #       session,
       #     apprentices,
      #      mentors
      #  )

        # -------------------------------------------------------------
        # PART 3
        # -------------------------------------------------------------

        print("\n==============================")
        print("PART 3")
        print("==============================")

        create_attendance_records(
            session,
            apprentices,
            apprentice_profiles,
            supervisor
        )

        create_module_progress(
            session,
            apprentices,
            apprentice_profiles,
            mentors
        )

        create_evaluations(
            session,
            apprentices,
            apprentice_profiles,
            mentors,
            supervisor
        )

        create_ai_predictions(
            session,
            apprentices,
            apprentice_profiles,
            supervisor
        )

        create_audit_logs(
            session,
            apprentices,
            mentors,
            supervisor
        )

        # -------------------------------------------------------------
        # Finish
        # -------------------------------------------------------------

        session.commit()

        print("\n" + "=" * 70)
        print("DATABASE SEEDED SUCCESSFULLY")
        print("=" * 70)

        print(f"Users:               {session.query(User).count():,}")
        print(f"Mentors:             {session.query(Mentor).count():,}")
        print(f"Apprentices:         {session.query(Apprentice).count():,}")
        print(f"Education:           {session.query(Education).count():,}")
        print(f"Assignments:         {session.query(MentorAssignment).count():,}")
        print(f"Modules:             {session.query(Module).count():,}")
        print(f"Attendance:          {session.query(Attendance).count():,}")
        print(f"Module Progress:     {session.query(ModuleProgress).count():,}")
        print(f"Evaluations:         {session.query(Evaluation).count():,}")
        print(f"AI Predictions:      {session.query(AIPrediction).count():,}")
        print(f"Audit Logs:          {session.query(AuditLog).count():,}")

        print("=" * 70)

    except Exception as e:

        session.rollback()

        print("\nSEED FAILED")
        print(e)

        raise

    finally:

        session.close()


# =====================================================================
# ENTRY POINT
# =====================================================================

if __name__ == "__main__":

    seed()