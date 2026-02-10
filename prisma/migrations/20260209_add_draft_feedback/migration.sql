-- CreateTable: draft_feedback for saving student progress
CREATE TABLE `draft_feedback` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `student_id` VARCHAR(50) NOT NULL,
    `form_data` TEXT NOT NULL,
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `draft_feedback_student_id_key`(`student_id`),
    INDEX `idx_draft_student`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
