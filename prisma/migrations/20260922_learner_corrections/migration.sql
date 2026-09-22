-- Extend LearningEvent for explicit learner correction audit events
ALTER TABLE `LearningEvent`
  MODIFY `type` ENUM(
    'CONCEPT_EXPLAINED',
    'QUESTION_CREATED',
    'QUESTION_ANSWERED',
    'HINT_USED',
    'MISTAKE_CREATED',
    'REVIEW_SCHEDULED',
    'REVIEW_COMPLETED',
    'CONCEPT_RECALLED',
    'CONCEPT_FORGOTTEN',
    'EVALUATION_CORRECTED',
    'MISTAKE_DIAGNOSIS_CORRECTED'
  ) NOT NULL;

-- CreateTable
CREATE TABLE `AttemptCorrection` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `correctness` DOUBLE NOT NULL,
    `reasoning` DOUBLE NOT NULL,
    `independence` DOUBLE NOT NULL,
    `errorType` ENUM('NONE', 'CONCEPTUAL', 'CALCULATION', 'REASONING', 'MEMORY', 'CONDITION', 'MISREAD', 'CARELESS', 'UNKNOWN') NOT NULL,
    `misconceptions` JSON NOT NULL,
    `feedback` TEXT NOT NULL,
    `note` TEXT NULL,
    `score` DOUBLE NOT NULL,
    `result` ENUM('CORRECT', 'PARTIAL', 'INCORRECT') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttemptCorrection_attemptId_createdAt_idx`(`attemptId`, `createdAt`),
    INDEX `AttemptCorrection_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MistakeRevision` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `mistakeId` VARCHAR(191) NOT NULL,
    `before` JSON NOT NULL,
    `after` JSON NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MistakeRevision_mistakeId_createdAt_idx`(`mistakeId`, `createdAt`),
    INDEX `MistakeRevision_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AttemptCorrection`
  ADD CONSTRAINT `AttemptCorrection_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttemptCorrection`
  ADD CONSTRAINT `AttemptCorrection_attemptId_fkey`
  FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MistakeRevision`
  ADD CONSTRAINT `MistakeRevision_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MistakeRevision`
  ADD CONSTRAINT `MistakeRevision_mistakeId_fkey`
  FOREIGN KEY (`mistakeId`) REFERENCES `Mistake`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
