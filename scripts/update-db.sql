-- Add course to students table
ALTER TABLE students ADD COLUMN course VARCHAR(50) DEFAULT 'IT' AFTER year;

-- Modify feedback_forms to store form data directly (not via foreign keys)
-- Drop existing foreign key constraints first
ALTER TABLE feedback_forms DROP FOREIGN KEY feedback_forms_ibfk_1;
ALTER TABLE feedback_forms DROP FOREIGN KEY feedback_forms_ibfk_2;

-- Modify columns
ALTER TABLE feedback_forms 
  CHANGE subject_id subject_name VARCHAR(150) NOT NULL,
  CHANGE faculty_id faculty_email VARCHAR(150) NOT NULL,
  ADD COLUMN subject_code VARCHAR(50) AFTER subject_name,
  ADD COLUMN faculty_name VARCHAR(100) NOT NULL AFTER subject_code,
  ADD COLUMN year ENUM('1','2','3','4') NOT NULL AFTER division,
  ADD COLUMN course VARCHAR(50) DEFAULT 'IT' AFTER year;

-- Update students to add course field
UPDATE students SET course = 'IT' WHERE course IS NULL;
