-- Migration: Flip FK direction from users->students/faculty to students/faculty->users
-- This migration:
-- 1. Adds user_id column to students and faculty tables
-- 2. Migrates existing data by linking students/faculty to their corresponding users
-- 3. Drops the old columns (student_id, faculty_id) from users table

-- Step 1: Add user_id columns to students and faculty
ALTER TABLE `students` ADD COLUMN `user_id` VARCHAR(50) NULL;
ALTER TABLE `faculty` ADD COLUMN `user_id` VARCHAR(50) NULL;

-- Step 2: Create indexes for the new columns
CREATE INDEX `students_user_id` ON `students`(`user_id`);
CREATE INDEX `faculty_user_id` ON `faculty`(`user_id`);

-- Step 3: Migrate existing data - link students to their users
UPDATE `students` s
INNER JOIN `users` u ON u.`student_id` = s.`id`
SET s.`user_id` = u.`id`;

-- Step 4: Migrate existing data - link faculty to their users
UPDATE `faculty` f
INNER JOIN `users` u ON u.`faculty_id` = f.`id`
SET f.`user_id` = u.`id`;

-- Step 5: Drop old indexes from users table
DROP INDEX `faculty_id` ON `users`;
DROP INDEX `student_id` ON `users`;

-- Step 6: Drop old columns from users table
ALTER TABLE `users` DROP COLUMN `student_id`;
ALTER TABLE `users` DROP COLUMN `faculty_id`;

