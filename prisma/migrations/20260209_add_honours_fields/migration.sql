-- Add honours course and batch fields to students table
ALTER TABLE `students` ADD COLUMN `honours_course` VARCHAR(50) NULL;
ALTER TABLE `students` ADD COLUMN `honours_batch` VARCHAR(10) NULL;
