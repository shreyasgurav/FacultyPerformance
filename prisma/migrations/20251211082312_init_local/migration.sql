-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faculty` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `department_id` VARCHAR(50) NOT NULL,
    `faculty_code` VARCHAR(50) NULL,

    UNIQUE INDEX `email`(`email`),
    INDEX `department_id`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `feedback_parameters` (
    `id` VARCHAR(50) NOT NULL,
    `text` VARCHAR(255) NOT NULL,
    `position` INTEGER NOT NULL,
    `form_type` VARCHAR(20) NOT NULL DEFAULT 'theory',
    `question_type` VARCHAR(30) NOT NULL DEFAULT 'scale_1_10',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `students` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `department_id` VARCHAR(50) NOT NULL,
    `semester` TINYINT NOT NULL,
    `course` VARCHAR(50) NOT NULL DEFAULT 'IT',
    `division` VARCHAR(10) NOT NULL,
    `batch` VARCHAR(10) NULL,

    UNIQUE INDEX `email`(`email`),
    INDEX `department_id`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjects` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `department_id` VARCHAR(50) NOT NULL,

    INDEX `department_id`(`department_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `role` ENUM('student', 'faculty', 'admin') NOT NULL,
    `student_id` VARCHAR(50) NULL,
    `faculty_id` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    INDEX `faculty_id`(`faculty_id`),
    INDEX `student_id`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
