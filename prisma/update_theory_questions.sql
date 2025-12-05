-- SQL to update feedback_parameters table for new theory questions
-- Run this after adding the new columns to the table

-- Step 1: Add new columns to feedback_parameters table (if not exists)
ALTER TABLE feedback_parameters 
ADD COLUMN IF NOT EXISTS form_type VARCHAR(20) DEFAULT 'theory',
ADD COLUMN IF NOT EXISTS question_type VARCHAR(30) DEFAULT 'scale_1_10';

-- Step 2: Delete old parameters (optional - only if you want to replace them)
DELETE FROM feedback_parameters WHERE form_type = 'theory' OR form_type IS NULL;

-- Step 3: Insert new theory questions
-- Questions 1-6: 3-option scale (Need improvement, Satisfactory, Good)
-- Question 7: 1-10 scale

INSERT INTO feedback_parameters (id, text, position, form_type, question_type) VALUES
('theory_1', 'Interaction with students regarding the subject taught and query-handling during lectures', 1, 'theory', 'scale_3'),
('theory_2', 'Number of numerical problems solved/case studies and practical applications discussed', 2, 'theory', 'scale_3'),
('theory_3', 'Audibility and overall command on verbal communication', 3, 'theory', 'scale_3'),
('theory_4', 'Command on the subject taught', 4, 'theory', 'scale_3'),
('theory_5', 'Use of audio/visuals aids (e.g. OHP slides, LCD projector, PA system, charts, models etc.)', 5, 'theory', 'scale_3'),
('theory_6', 'Whether the test-syllabus was covered satisfactorily before the term tests?', 6, 'theory', 'scale_3'),
('theory_7', 'Evaluation of the faculty in the scale of 1-10', 7, 'theory', 'scale_1_10');

-- Note: Lab questions can be added later with form_type = 'lab'
-- Example:
-- INSERT INTO feedback_parameters (id, text, position, form_type, question_type) VALUES
-- ('lab_1', 'Lab question 1', 1, 'lab', 'scale_3'),
-- ('lab_2', 'Lab question 2', 2, 'lab', 'scale_1_10');
