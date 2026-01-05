-- CreateTable: Timetable for storing faculty-subject-class mappings
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



