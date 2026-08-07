CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    contact_number VARCHAR(20),
    reset_token VARCHAR(255) NULL,
    reset_token_expiry DATETIME NULL,
    role ENUM('Administrator','Supervisor','Mentor','Apprentice') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    failed_attempts INT DEFAULT 0,
    locked_until DATETIME
);

CREATE TABLE apprentices (
    apprentice_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    id_number VARCHAR(13) UNIQUE NOT NULL,
    date_of_birth DATE,
    gender ENUM('Male','Female','Other'),
    contact_number VARCHAR(20),
    address_street VARCHAR(200),
    address_city VARCHAR(100),
    address_province VARCHAR(100),
    address_postal VARCHAR(10),
    photo_url VARCHAR(500),
    qualification_type ENUM('NCV','NATED','NQF'),
    institution VARCHAR(150),
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE mentors (
    mentor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    specialisation VARCHAR(150),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE education (
    education_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    subject_name VARCHAR(150) NOT NULL,
    mark INT CHECK (mark BETWEEN 0 AND 100),
    year_completed INT,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE CASCADE
);

CREATE TABLE modules (
    module_id INT AUTO_INCREMENT PRIMARY KEY,
    module_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    pass_mark INT DEFAULT 50
);

CREATE TABLE module_progress (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    module_id INT NOT NULL,
    updated_by INT NOT NULL,
    status ENUM('Not Started','In Progress','Completed') DEFAULT 'Not Started',
    assessment_score INT CHECK (assessment_score BETWEEN 0 AND 100),
    completion_date DATE,
    UNIQUE KEY uq_apprentice_module (apprentice_id, module_id),
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id),
    FOREIGN KEY (module_id) REFERENCES modules(module_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE evaluations (
    evaluation_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    mentor_id INT NOT NULL,
    discipline INT NOT NULL CHECK (discipline BETWEEN 1 AND 5),
    commitment INT NOT NULL CHECK (commitment BETWEEN 1 AND 5),
    willingness INT NOT NULL CHECK (willingness BETWEEN 1 AND 5),
    teamwork INT NOT NULL CHECK (teamwork BETWEEN 1 AND 5),
    time_management INT NOT NULL CHECK (time_management BETWEEN 1 AND 5),
    professional_conduct INT NOT NULL CHECK (professional_conduct BETWEEN 1 AND 5),
    overall_score DECIMAL(4,2) NOT NULL,
    comments TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE,
    approved_by INT,
    approved_at DATETIME,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id),
    FOREIGN KEY (mentor_id) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

CREATE TABLE mentor_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    mentor_id INT NOT NULL,
    apprentice_id INT NOT NULL,
    assigned_date DATE NOT NULL,
    UNIQUE KEY uq_mentor_apprentice (mentor_id, apprentice_id),
    FOREIGN KEY (mentor_id) REFERENCES mentors(mentor_id),
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id)
);

CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    days_expected INT NOT NULL,
    days_present INT NOT NULL,
    attendance_rate DECIMAL(5,2) NOT NULL,
    recorded_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE ai_predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    apprentice_id INT NOT NULL,
    completion_likelihood DECIMAL(5,2),
    dropout_risk DECIMAL(5,2),
    employment_readiness DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    feature_snapshot JSON,
    missing_features JSON,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apprentice_id) REFERENCES apprentices(apprentice_id)
);

CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action_type ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT',
                   'LOGIN_FAILED','ACCOUNT_LOCKED','PREDICTION_GENERATED',
                   'EVALUATION_APPROVED','REPORT_GENERATED') NOT NULL,
    entity_type VARCHAR(100),
    record_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);
