
DROP TABLE IF EXISTS `ai_predictions`;
CREATE TABLE `ai_predictions` (
  `prediction_id` int(11) NOT NULL AUTO_INCREMENT,
  `apprentice_id` int(11) NOT NULL,
  `generated_by` int(11) DEFAULT NULL,
  `model_version` varchar(50) DEFAULT NULL,
  `completion_likelihood` decimal(5,2) DEFAULT NULL,
  `dropout_risk` decimal(5,2) DEFAULT NULL,
  `employment_readiness` decimal(5,2) DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `feature_snapshot_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`feature_snapshot_json`)),
  `missing_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`missing_fields`)),
  `predictable` tinyint(1) DEFAULT NULL,
  `generated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`prediction_id`),
  KEY `apprentice_id` (`apprentice_id`),
  KEY `generated_by` (`generated_by`),
  KEY `ix_ai_predictions_prediction_id` (`prediction_id`),
  CONSTRAINT `1` FOREIGN KEY (`apprentice_id`) REFERENCES `apprentices` (`apprentice_id`),
  CONSTRAINT `2` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `alembic_version`;
CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `apprentices`;
CREATE TABLE `apprentices` (
  `apprentice_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `surname` varchar(100) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `id_number` varchar(13) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address_line1` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL,
  `is_synthetic` tinyint(1) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`apprentice_id`),
  UNIQUE KEY `ix_apprentices_id_number` (`id_number`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_apprentices_apprentice_id` (`apprentice_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL AUTO_INCREMENT,
  `apprentice_id` int(11) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `days_expected` int(11) NOT NULL,
  `days_present` int(11) NOT NULL,
  `attendance_rate` decimal(5,2) NOT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  KEY `apprentice_id` (`apprentice_id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `ix_attendance_attendance_id` (`attendance_id`),
  CONSTRAINT `1` FOREIGN KEY (`apprentice_id`) REFERENCES `apprentices` (`apprentice_id`),
  CONSTRAINT `2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `ck_attendance_present_range` CHECK (`days_present` >= 0 and `days_present` <= `days_expected`),
  CONSTRAINT `ck_attendance_rate_range` CHECK (`attendance_rate` >= 0 and `attendance_rate` <= 100)
) ENGINE=InnoDB AUTO_INCREMENT=901 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE `audit_log` (
  `log_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action_type` enum('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','ACCESS','LOGIN_FAILED','ACCOUNT_LOCKED','PASSWORD_RESET_REQUEST','PASSWORD_RESET_DONE','PREDICTION_GENERATED','EVALUATION_APPROVED','REPORT_GENERATED','PHOTO_UPLOADED') NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_value_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value_json`)),
  `new_value_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value_json`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  KEY `ix_audit_log_log_id` (`log_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1297 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DELIMITER ;;
*/;;
DELIMITER ;
DELIMITER ;;
*/;;
DELIMITER ;
DROP TABLE IF EXISTS `education`;
CREATE TABLE `education` (
  `education_id` int(11) NOT NULL AUTO_INCREMENT,
  `apprentice_id` int(11) NOT NULL,
  `qualification_type` enum('NATED','NCV','NQF') NOT NULL,
  `institution_name` varchar(200) NOT NULL,
  `average_mark` decimal(5,2) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`education_id`),
  UNIQUE KEY `apprentice_id` (`apprentice_id`),
  KEY `ix_education_education_id` (`education_id`),
  CONSTRAINT `1` FOREIGN KEY (`apprentice_id`) REFERENCES `apprentices` (`apprentice_id`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `education_subjects`;
CREATE TABLE `education_subjects` (
  `subject_id` int(11) NOT NULL AUTO_INCREMENT,
  `education_id` int(11) NOT NULL,
  `subject_name` varchar(150) NOT NULL,
  `mark` decimal(5,2) NOT NULL,
  PRIMARY KEY (`subject_id`),
  UNIQUE KEY `uq_education_subject` (`education_id`,`subject_name`),
  KEY `ix_education_subjects_subject_id` (`subject_id`),
  CONSTRAINT `1` FOREIGN KEY (`education_id`) REFERENCES `education` (`education_id`) ON DELETE CASCADE,
  CONSTRAINT `ck_education_subject_mark` CHECK (`mark` >= 0 and `mark` <= 100)
) ENGINE=InnoDB AUTO_INCREMENT=601 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `evaluations`;
CREATE TABLE `evaluations` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `apprentice_id` int(11) NOT NULL,
  `mentor_id` int(11) NOT NULL,
  `discipline` smallint(6) NOT NULL,
  `commitment` smallint(6) NOT NULL,
  `willingness` smallint(6) NOT NULL,
  `teamwork` smallint(6) NOT NULL,
  `time_management` smallint(6) NOT NULL,
  `professional_conduct` smallint(6) NOT NULL,
  `overall_score` decimal(4,2) NOT NULL,
  `comments` text DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `approved` tinyint(1) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`evaluation_id`),
  KEY `apprentice_id` (`apprentice_id`),
  KEY `mentor_id` (`mentor_id`),
  KEY `approved_by` (`approved_by`),
  KEY `ix_evaluations_evaluation_id` (`evaluation_id`),
  CONSTRAINT `1` FOREIGN KEY (`apprentice_id`) REFERENCES `apprentices` (`apprentice_id`),
  CONSTRAINT `2` FOREIGN KEY (`mentor_id`) REFERENCES `mentors` (`mentor_id`),
  CONSTRAINT `3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `ck_eval_discipline` CHECK (`discipline` between 1 and 5),
  CONSTRAINT `ck_eval_commitment` CHECK (`commitment` between 1 and 5),
  CONSTRAINT `ck_eval_willingness` CHECK (`willingness` between 1 and 5),
  CONSTRAINT `ck_eval_teamwork` CHECK (`teamwork` between 1 and 5),
  CONSTRAINT `ck_eval_time_management` CHECK (`time_management` between 1 and 5),
  CONSTRAINT `ck_eval_professional_conduct` CHECK (`professional_conduct` between 1 and 5),
  CONSTRAINT `ck_eval_overall_score` CHECK (`overall_score` between 1 and 5)
) ENGINE=InnoDB AUTO_INCREMENT=451 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `mentor_assignments`;
CREATE TABLE `mentor_assignments` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `mentor_id` int(11) NOT NULL,
  `apprentice_id` int(11) NOT NULL,
  `assigned_date` date NOT NULL,
  `is_current` tinyint(1) NOT NULL,
  PRIMARY KEY (`assignment_id`),
  KEY `mentor_id` (`mentor_id`),
  KEY `apprentice_id` (`apprentice_id`),
  KEY `ix_mentor_assignments_assignment_id` (`assignment_id`),
  CONSTRAINT `1` FOREIGN KEY (`mentor_id`) REFERENCES `mentors` (`mentor_id`),
  CONSTRAINT `2` FOREIGN KEY (`apprentice_id`) REFERENCES `apprentices` (`apprentice_id`)
) ENGINE=InnoDB AUTO_INCREMENT=151 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `mentors`;
CREATE TABLE `mentors` (
  `mentor_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `surname` varchar(100) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `specialisation` varchar(150) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`mentor_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_mentors_mentor_id` (`mentor_id`),
  CONSTRAINT `1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `module_progress`;
CREATE TABLE `module_progress` (
  `progress_id` int(11) NOT NULL AUTO_INCREMENT,
  `apprentice_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `status` enum('Not Started','In Progress','Completed') NOT NULL,
  `assessment_score` decimal(5,2) DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`progress_id`),
  UNIQUE KEY `uq_apprentice_module` (`apprentice_id`,`module_id`),
  KEY `module_id` (`module_id`),
  KEY `updated_by` (`updated_by`),
  KEY `ix_module_progress_progress_id` (`progress_id`),
  CONSTRAINT `1` FOREIGN KEY (`apprentice_id`) REFERENCES `apprentices` (`apprentice_id`),
  CONSTRAINT `2` FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`),
  CONSTRAINT `3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `modules`;
CREATE TABLE `modules` (
  `module_id` int(11) NOT NULL AUTO_INCREMENT,
  `module_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `pass_mark` decimal(5,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`module_id`),
  UNIQUE KEY `module_name` (`module_name`),
  KEY `ix_modules_module_id` (`module_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `key` varchar(100) NOT NULL,
  `value` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(200) NOT NULL,
  `role` enum('Administrator','Supervisor','Mentor','Apprentice') NOT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `failed_attempts` int(11) DEFAULT NULL,
  `locked_until` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `ix_users_email` (`email`),
  UNIQUE KEY `ix_users_username` (`username`),
  KEY `ix_users_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=173 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

