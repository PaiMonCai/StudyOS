-- AlterTable
ALTER TABLE `StudySession`
    ADD COLUMN `conceptId` VARCHAR(191) NULL,
    ADD COLUMN `reviewTaskId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `StudySession_userId_conceptId_startedAt_idx`
    ON `StudySession`(`userId`, `conceptId`, `startedAt`);

-- CreateIndex
CREATE INDEX `StudySession_reviewTaskId_idx`
    ON `StudySession`(`reviewTaskId`);

-- AddForeignKey
ALTER TABLE `StudySession`
    ADD CONSTRAINT `StudySession_conceptId_fkey`
    FOREIGN KEY (`conceptId`) REFERENCES `Concept`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudySession`
    ADD CONSTRAINT `StudySession_reviewTaskId_fkey`
    FOREIGN KEY (`reviewTaskId`) REFERENCES `ReviewTask`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
