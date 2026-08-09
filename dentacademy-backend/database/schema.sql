-- ============================================================
-- DentAcademy Schema
-- Regenerated to match the SQLAlchemy models in `models/`
-- (user.py, apprentice.py, mentor.py, module.py, evaluation.py,
--  attendance.py, prediction.py, audit.py)
-- ============================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role ENUM('Admin','Supervisor','Mentor','Apprentice') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    failed_attempts INT DEFAULT 0,
    locked_until DATETIME NULL,
    last_login DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255) NULL,
    reset_token_expiry DATETIME NULL
);

CREATE TABLE apprentices (
    apprentice_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NULL,
    surname VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,
    gender ENUM('Male','Female','Other') NULL,
    id_number VARCHAR(13) UNIQUE NOT NULL,
    contact_number VARCHAR(20) NULL,
    address_line1 VARCHAR(200) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    photo_url VARCHAR(500) NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    is_synthetic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE mentors (
    mentor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    specialisation VARCHAR(150) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

-- One-to-one with apprentices (unique apprentice_id), subjects stored as JSON
CREATE TABLE education (
    education_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT UNIQUE NOT NULL,
    qualification_type ENUM('NATED','NCV','NQF') NOT NULL,
    institution_name VARCHAR(200) NOT NULL,
    subjects_json JSON NULL,
    average_mark DECIMAL(5,2) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE RESTRICT
);

CREATE TABLE modules (
    module_id INT AUTO_INCREMENT PRIMARY KEY,
    module_name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT NULL,
    category VARCHAR(100) NULL,
    pass_mark DECIMAL(5,2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE module_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    module_id INT NOT NULL,
    updated_by INT NULL,
    status ENUM('Not Started','In Progress','Completed') NOT NULL DEFAULT 'Not Started',
    assessment_score DECIMAL(5,2) NULL,
    completion_date DATE NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_apprentice_module (apprentice_id, module_id),
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE RESTRICT,
    FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE mentor_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    mentor_id INT NOT NULL,
    apprentice_id INT NOT NULL,
    assigned_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_mentor_apprentice (mentor_id, apprentice_id),
    FOREIGN KEY (mentor_id) REFERENCES mentors(mentor_id) ON DELETE RESTRICT,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE RESTRICT
);

-- NOTE: mentor_id references mentors(mentor_id), NOT users(user_id).
-- A mentor's mentor_id and user_id are different values.
CREATE TABLE evaluations (
    evaluation_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    mentor_id INT NOT NULL,
    discipline SMALLINT NOT NULL CHECK (discipline BETWEEN 1 AND 5),
    commitment SMALLINT NOT NULL CHECK (commitment BETWEEN 1 AND 5),
    willingness SMALLINT NOT NULL CHECK (willingness BETWEEN 1 AND 5),
    teamwork SMALLINT NOT NULL CHECK (teamwork BETWEEN 1 AND 5),
    time_management SMALLINT NOT NULL CHECK (time_management BETWEEN 1 AND 5),
    professional_conduct SMALLINT NOT NULL CHECK (professional_conduct BETWEEN 1 AND 5),
    overall_score DECIMAL(4,2) NOT NULL,
    comments TEXT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    approved_by INT NULL,
    approved_at DATETIME NULL,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE RESTRICT,
    FOREIGN KEY (mentor_id) REFERENCES mentors(mentor_id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    days_expected INT NOT NULL,
    days_present INT NOT NULL,
    attendance_rate DECIMAL(5,2) NOT NULL,
    recorded_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE ai_predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    generated_by INT NULL,
    completion_likelihood DECIMAL(5,2) NULL,
    dropout_risk DECIMAL(5,2) NULL,
    employment_readiness DECIMAL(5,2) NULL,
    confidence_score DECIMAL(5,2) NULL,
    feature_snapshot_json JSON NULL,
    missing_fields JSON NULL,
    predictable BOOLEAN DEFAULT TRUE,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE RESTRICT,
    FOREIGN KEY (generated_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

-- Notifications table (for alerts & in-app messages)
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'warning',
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    link VARCHAR(255) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- INSERT-ONLY table (see triggers.sql: UPDATE/DELETE are blocked at the DB level)
CREATE TABLE audit_log (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action_type ENUM(
        'CREATE','UPDATE','DELETE','LOGIN','LOGOUT',
        'ACCESS','LOGIN_FAILED','ACCOUNT_LOCKED',
        'PASSWORD_RESET_REQUEST','PASSWORD_RESET_DONE',
        'PREDICTION_GENERATED','EVALUATION_APPROVED',
        'REPORT_GENERATED','PHOTO_UPLOADED'
    ) NOT NULL,
    entity_type VARCHAR(100) NULL,
    record_id INT NULL,
    old_value_json JSON NULL,
    new_value_json JSON NULL,
    ip_address VARCHAR(45) NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);
