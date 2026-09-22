-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subject` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subject_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Topic` (
    `id` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Topic_subjectId_sortOrder_idx`(`subjectId`, `sortOrder`),
    UNIQUE INDEX `Topic_subjectId_slug_key`(`subjectId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Concept` (
    `id` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `difficulty` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Concept_topicId_status_idx`(`topicId`, `status`),
    UNIQUE INDEX `Concept_topicId_slug_key`(`topicId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConceptRelation` (
    `id` VARCHAR(191) NOT NULL,
    `fromConceptId` VARCHAR(191) NOT NULL,
    `toConceptId` VARCHAR(191) NOT NULL,
    `relationType` ENUM('PREREQUISITE', 'RELATED') NOT NULL,
    `strength` DOUBLE NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ConceptRelation_toConceptId_relationType_idx`(`toConceptId`, `relationType`),
    UNIQUE INDEX `ConceptRelation_fromConceptId_toConceptId_relationType_key`(`fromConceptId`, `toConceptId`, `relationType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LearningState` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `conceptId` VARCHAR(191) NOT NULL,
    `mastery` DOUBLE NOT NULL DEFAULT 0.3,
    `confidence` DOUBLE NOT NULL DEFAULT 0.3,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `correctCount` INTEGER NOT NULL DEFAULT 0,
    `lastStudiedAt` DATETIME(3) NULL,
    `lastReviewedAt` DATETIME(3) NULL,
    `nextReviewAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LearningState_userId_nextReviewAt_idx`(`userId`, `nextReviewAt`),
    INDEX `LearningState_userId_mastery_idx`(`userId`, `mastery`),
    UNIQUE INDEX `LearningState_userId_conceptId_key`(`userId`, `conceptId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(191) NOT NULL,
    `conceptId` VARCHAR(191) NOT NULL,
    `type` ENUM('CONCEPT', 'CALCULATION', 'DERIVATION', 'COMPARISON', 'APPLICATION') NOT NULL,
    `difficulty` INTEGER NOT NULL DEFAULT 1,
    `stem` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `explanation` TEXT NULL,
    `source` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Question_conceptId_difficulty_idx`(`conceptId`, `difficulty`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudySession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NULL,
    `topicId` VARCHAR(191) NULL,
    `currentQuestionId` VARCHAR(191) NULL,
    `goal` TEXT NULL,
    `mode` ENUM('LEARN', 'REVIEW', 'QUIZ', 'FREE_CHAT') NOT NULL DEFAULT 'LEARN',
    `summary` TEXT NULL,
    `traceId` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StudySession_userId_startedAt_idx`(`userId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attempt` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `answer` TEXT NOT NULL,
    `score` DOUBLE NOT NULL,
    `result` ENUM('CORRECT', 'PARTIAL', 'INCORRECT') NOT NULL,
    `evaluation` JSON NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Attempt_userId_submittedAt_idx`(`userId`, `submittedAt`),
    INDEX `Attempt_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mistake` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NULL,
    `conceptId` VARCHAR(191) NOT NULL,
    `errorType` ENUM('NONE', 'CONCEPTUAL', 'CALCULATION', 'REASONING', 'MEMORY', 'CONDITION', 'MISREAD', 'CARELESS', 'UNKNOWN') NOT NULL,
    `severity` DOUBLE NOT NULL DEFAULT 0.5,
    `misconception` TEXT NULL,
    `diagnosis` TEXT NULL,
    `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `Mistake_userId_conceptId_status_idx`(`userId`, `conceptId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewTask` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `conceptId` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `intervalDays` INTEGER NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 50,
    `status` ENUM('PENDING', 'COMPLETED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `source` ENUM('MISTAKE', 'LOW_MASTERY', 'SCHEDULED_REVIEW', 'MANUAL') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReviewTask_userId_status_scheduledAt_idx`(`userId`, `status`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LearningEvent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `conceptId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `type` ENUM('CONCEPT_EXPLAINED', 'QUESTION_CREATED', 'QUESTION_ANSWERED', 'HINT_USED', 'MISTAKE_CREATED', 'REVIEW_SCHEDULED', 'REVIEW_COMPLETED', 'CONCEPT_RECALLED', 'CONCEPT_FORGOTTEN') NOT NULL,
    `score` DOUBLE NULL,
    `confidence` DOUBLE NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LearningEvent_userId_conceptId_createdAt_idx`(`userId`, `conceptId`, `createdAt`),
    INDEX `LearningEvent_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Topic` ADD CONSTRAINT `Topic_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Concept` ADD CONSTRAINT `Concept_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConceptRelation` ADD CONSTRAINT `ConceptRelation_fromConceptId_fkey` FOREIGN KEY (`fromConceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConceptRelation` ADD CONSTRAINT `ConceptRelation_toConceptId_fkey` FOREIGN KEY (`toConceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningState` ADD CONSTRAINT `LearningState_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningState` ADD CONSTRAINT `LearningState_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession` ADD CONSTRAINT `StudySession_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `StudySession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mistake` ADD CONSTRAINT `Mistake_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mistake` ADD CONSTRAINT `Mistake_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mistake` ADD CONSTRAINT `Mistake_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewTask` ADD CONSTRAINT `ReviewTask_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewTask` ADD CONSTRAINT `ReviewTask_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningEvent` ADD CONSTRAINT `LearningEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningEvent` ADD CONSTRAINT `LearningEvent_conceptId_fkey` FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningEvent` ADD CONSTRAINT `LearningEvent_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `StudySession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
