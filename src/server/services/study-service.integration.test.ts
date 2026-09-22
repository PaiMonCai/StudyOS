import { afterAll, describe, expect, it } from "vitest";
import { ErrorType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import {
  createAgentQuestion,
  recordCurrentAttempt,
} from "@/server/services/learning-service";
import {
  finishStudySession,
  getStudySession,
  startReviewSession,
} from "@/server/services/study-service";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("study service review-session integration", () => {
  let userId = "";
  let subjectId = "";

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }

    if (subjectId) {
      await prisma.subject
        .delete({ where: { id: subjectId } })
        .catch(() => undefined);
    }
  });

  it("creates, reuses, practices, and finishes a concept-bound review session", async () => {
    const user = await prisma.user.create({
      data: {
        email: `review-integration-${suffix}@studyos.local`,
        name: "Review Integration Learner",
      },
    });
    userId = user.id;

    const subject = await prisma.subject.create({
      data: {
        name: `Review Subject ${suffix}`,
        slug: `review-subject-${suffix}`,
      },
    });
    subjectId = subject.id;

    const topic = await prisma.topic.create({
      data: {
        subjectId: subject.id,
        name: "Review Topic",
        slug: `review-topic-${suffix}`,
      },
    });

    const concept = await prisma.concept.create({
      data: {
        topicId: topic.id,
        name: "Review Concept",
        slug: `review-concept-${suffix}`,
        difficulty: 2,
      },
    });

    const reviewTask = await prisma.reviewTask.create({
      data: {
        userId: user.id,
        conceptId: concept.id,
        scheduledAt: new Date(Date.now() - 60_000),
        intervalDays: 3,
        priority: 88,
        source: "LOW_MASTERY",
      },
    });

    const first = await startReviewSession(user.id, reviewTask.id);
    const second = await startReviewSession(user.id, reviewTask.id);

    expect(first.id).toBe(second.id);
    expect(first.mode).toBe("REVIEW");
    expect(first.conceptId).toBe(concept.id);
    expect(first.reviewTaskId).toBe(reviewTask.id);
    expect(first.subjectId).toBe(subject.id);
    expect(first.topicId).toBe(topic.id);

    const loaded = await getStudySession(user.id, first.id);

    expect(loaded.concept?.id).toBe(concept.id);
    expect(loaded.concept?.name).toBe("Review Concept");
    expect(loaded.reviewTask?.id).toBe(reviewTask.id);
    expect(loaded.reviewTask?.priority).toBe(88);
    expect(loaded.stats.attemptCount).toBe(0);

    const openSessionsBeforePractice = await prisma.studySession.count({
      where: {
        userId: user.id,
        reviewTaskId: reviewTask.id,
        endedAt: null,
      },
    });

    expect(openSessionsBeforePractice).toBe(1);

    const question = await createAgentQuestion({
      userId: user.id,
      sessionId: first.id,
      conceptId: concept.id,
      stem: "State the central idea of this review concept.",
      answer: "A correct central idea.",
      type: "CONCEPT",
      difficulty: 2,
    });

    await recordCurrentAttempt({
      userId: user.id,
      sessionId: first.id,
      answer: "A correct central idea.",
      evaluation: {
        correctness: 1,
        reasoning: 0.9,
        independence: 1,
        errorType: ErrorType.NONE,
        misconceptions: [],
        feedback: "Correct and independently explained.",
      },
    });

    const finished = await finishStudySession({
      userId: user.id,
      sessionId: first.id,
    });

    expect(finished.endedAt).not.toBeNull();
    expect(finished.summary).toContain("1 次可评分作答");
    expect(finished.stats.attemptCount).toBe(1);
    expect(finished.stats.correctCount).toBe(1);
    expect(finished.stats.mistakeCount).toBe(0);
    expect(finished.stats.concepts).toContain("Review Concept");

    const finishedAgain = await finishStudySession({
      userId: user.id,
      sessionId: first.id,
    });

    expect(finishedAgain.endedAt?.getTime()).toBe(finished.endedAt?.getTime());
    expect(finishedAgain.summary).toBe(finished.summary);

    const [reviewAfter, persistedQuestion, openSessionsAfterFinish] =
      await Promise.all([
        prisma.reviewTask.findUniqueOrThrow({
          where: { id: reviewTask.id },
        }),
        prisma.question.findUniqueOrThrow({
          where: { id: question.id },
        }),
        prisma.studySession.count({
          where: {
            userId: user.id,
            reviewTaskId: reviewTask.id,
            endedAt: null,
          },
        }),
      ]);

    expect(reviewAfter.status).toBe("COMPLETED");
    expect(persistedQuestion.id).toBe(question.id);
    expect(openSessionsAfterFinish).toBe(0);
  });
});
