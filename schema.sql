-- Faculty Feedback System Database Schema
-- MySQL database schema for deployment
-- Generated from Prisma migrations, includes FK constraints for data integrity

-- departments table
CREATE TABLE `departments` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- faculty table
CREATE TABLE `faculty` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `department_id` VARCHAR(50) NOT NULL,
    `faculty_code` VARCHAR(50) NULL,
    `user_id` VARCHAR(50) NULL,
    UNIQUE INDEX `email`(`email`),
    INDEX `department_id`(`department_id`),
    INDEX `faculty_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- students table
CREATE TABLE `students` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `department_id` VARCHAR(50) NOT NULL,
    `semester` TINYINT NOT NULL,
    `course` VARCHAR(50) NOT NULL DEFAULT 'IT',
    `division` VARCHAR(10) NOT NULL,
    `batch` VARCHAR(10) NULL,
    `user_id` VARCHAR(50) NULL,
    UNIQUE INDEX `email`(`email`),
    INDEX `department_id`(`department_id`),
    INDEX `students_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- users table (authentication)
CREATE TABLE `users` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `role` ENUM('student', 'faculty', 'admin') NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- subjects table
CREATE TABLE `subjects` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `department_id` VARCHAR(50) NOT NULL,
    INDEX `department_id`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- feedback_forms table (stores generated feedback forms)
CREATE TABLE `feedback_forms` (
    `id` VARCHAR(50) NOT NULL,
    `subject_name` VARCHAR(150) NOT NULL,
    `subject_code` VARCHAR(50) NULL,
    `faculty_name` VARCHAR(100) NOT NULL,
    `faculty_email` VARCHAR(150) NOT NULL,
    `division` VARCHAR(10) NOT NULL,
    `batch` VARCHAR(10) NULL,
    `semester` TINYINT NOT NULL,
    `course` VARCHAR(50) NOT NULL DEFAULT 'IT',
    `academic_year` VARCHAR(10) NOT NULL DEFAULT '2025-26',
    `status` ENUM('active', 'closed') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    INDEX `idx_student_forms`(`semester`, `course`, `division`, `status`),
    INDEX `idx_faculty_email`(`faculty_email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- form_questions table (snapshot of questions for each form)
CREATE TABLE `form_questions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `form_id` VARCHAR(50) NOT NULL,
    `original_param_id` VARCHAR(50) NOT NULL,
    `question_text` VARCHAR(255) NOT NULL,
    `position` INTEGER NOT NULL,
    `question_type` VARCHAR(30) NOT NULL DEFAULT 'scale_1_10',
    INDEX `form_id`(`form_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- feedback_parameters table (template questions)
CREATE TABLE `feedback_parameters` (
    `id` VARCHAR(50) NOT NULL,
    `text` VARCHAR(255) NOT NULL,
    `position` INTEGER NOT NULL,
    `form_type` VARCHAR(20) NOT NULL DEFAULT 'theory',
    `question_type` VARCHAR(30) NOT NULL DEFAULT 'scale_1_10',
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- feedback_responses table (student submissions)
CREATE TABLE `feedback_responses` (
    `id` VARCHAR(50) NOT NULL,
    `form_id` VARCHAR(50) NOT NULL,
    `student_id` VARCHAR(50) NOT NULL,
    `comment` TEXT NULL,
    `submitted_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    INDEX `form_id`(`form_id`),
    INDEX `student_id`(`student_id`),
    UNIQUE INDEX `unique_form_student`(`form_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- feedback_response_items table (individual question ratings)
CREATE TABLE `feedback_response_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `response_id` VARCHAR(50) NOT NULL,
    `parameter_id` VARCHAR(50) NOT NULL,
    `rating` TINYINT NOT NULL,
    `question_text` VARCHAR(255) NULL,
    `question_type` VARCHAR(30) NULL,
    INDEX `parameter_id`(`parameter_id`),
    INDEX `response_id`(`response_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- admin_users table
CREATE TABLE `admin_users` (
    `id` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- timetable table (faculty-subject-class mappings)
CREATE TABLE `timetable` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `subject_name` VARCHAR(150) NOT NULL,
    `faculty_email` VARCHAR(150) NOT NULL,
    `semester` TINYINT NOT NULL,
    `course` VARCHAR(50) NOT NULL,
    `division` VARCHAR(10) NOT NULL,
    `batch` VARCHAR(10) NULL,
    `academic_year` VARCHAR(10) NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    INDEX `idx_timetable_class`(`semester`, `course`, `division`),
    INDEX `idx_timetable_faculty`(`faculty_email`),
    INDEX `idx_timetable_year`(`academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign key constraints
-- Note: Prisma uses relationMode="prisma" so it doesn't create FKs automatically,
-- but we're adding them here for better data integrity

ALTER TABLE `faculty` 
ADD CONSTRAINT `faculty_ibfk_1` 
FOREIGN KEY (`department_id`) 
REFERENCES `departments`(`id`) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

ALTER TABLE `faculty` 
ADD CONSTRAINT `faculty_user_fk` 
FOREIGN KEY (`user_id`) 
REFERENCES `users`(`id`) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

ALTER TABLE `students` 
ADD CONSTRAINT `students_ibfk_1` 
FOREIGN KEY (`department_id`) 
REFERENCES `departments`(`id`) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

ALTER TABLE `students` 
ADD CONSTRAINT `students_user_fk` 
FOREIGN KEY (`user_id`) 
REFERENCES `users`(`id`) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

ALTER TABLE `subjects` 
ADD CONSTRAINT `subjects_ibfk_1` 
FOREIGN KEY (`department_id`) 
REFERENCES `departments`(`id`) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

ALTER TABLE `form_questions` 
ADD CONSTRAINT `form_questions_ibfk_1` 
FOREIGN KEY (`form_id`) 
REFERENCES `feedback_forms`(`id`) 
ON DELETE CASCADE
ON UPDATE NO ACTION;

ALTER TABLE `feedback_responses` 
ADD CONSTRAINT `feedback_responses_ibfk_1` 
FOREIGN KEY (`form_id`) 
REFERENCES `feedback_forms`(`id`) 
ON DELETE CASCADE 
ON UPDATE NO ACTION;

ALTER TABLE `feedback_responses` 
ADD CONSTRAINT `feedback_responses_ibfk_2` 
FOREIGN KEY (`student_id`) 
REFERENCES `students`(`id`) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;

ALTER TABLE `feedback_response_items` 
ADD CONSTRAINT `feedback_response_items_ibfk_1` 
FOREIGN KEY (`response_id`) 
REFERENCES `feedback_responses`(`id`) 
ON DELETE NO ACTION 
ON UPDATE NO ACTION;
