import { afterAll, describe, expect, it } from "vitest";
import { ErrorType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import {
  createAgentQuestion,
  getConceptDetail,
  recordCurrentAttempt,
} from "@/server/services/learning-service";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("learning service integration", () => {
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

  it("records one learning attempt as an atomic learner-model update", async () => {
    const user = await prisma.user.create({
      data: {
        email: `integration-${suffix}@studyos.local`,
        name: "Integration Learner",
      },
    });
    userId = user.id;

    const subject = await prisma.subject.create({
      data: {
        name: `Integration Subject ${suffix}`,
        slug: `integration-subject-${suffix}`,
      },
    });
    subjectId = subject.id;

    const topic = await prisma.topic.create({
      data: {
        subjectId: subject.id,
        name: "Integration Topic",
        slug: `integration-topic-${suffix}`,
      },
    });

    const prerequisite = await prisma.concept.create({
      data: {
        topicId: topic.id,
        name: "Integration Prerequisite",
        slug: `integration-prerequisite-${suffix}`,
        difficulty: 1,
      },
    });

    const concept = await prisma.concept.create({
      data: {
        topicId: topic.id,
        name: "Integration Concept",
        slug: `integration-concept-${suffix}`,
        difficulty: 2,
      },
    });

    await prisma.conceptRelation.create({
      data: {
        fromConceptId: prerequisite.id,
        toConceptId: concept.id,
        relationType: "PREREQUISITE",
        strength: 1,
      },
    });

    await prisma.learningState.create({
      data: {
        userId: user.id,
        conceptId: prerequisite.id,
        mastery: 0.75,
        confidence: 0.7,
      },
    });

    await prisma.learningState.create({
      data: {
        userId: user.id,
        conceptId: concept.id,
        mastery: 0.4,
        confidence: 0.4,
      },
    });

    const oldReview = await prisma.reviewTask.create({
      data: {
        userId: user.id,
        conceptId: concept.id,
        scheduledAt: new Date(Date.now() - 60_000),
        intervalDays: 1,
        priority: 90,
        source: "LOW_MASTERY",
      },
    });

    const session = await prisma.studySession.create({
      data: {
        userId: user.id,
        subjectId: subject.id,
        topicId: topic.id,
        goal: "Integration test session",
      },
    });

    const question = await createAgentQuestion({
      userId: user.id,
      sessionId: session.id,
      conceptId: concept.id,
      stem: "Explain the integration concept.",
      answer: "A sufficiently correct answer.",
      type: "CONCEPT",
      difficulty: 2,
    });

    const result = await recordCurrentAttempt({
      userId: user.id,
      sessionId: session.id,
      answer: "Partly correct but conceptually incomplete.",
      evaluation: {
        correctness: 0.55,
        reasoning: 0.45,
        independence: 0.9,
        errorType: ErrorType.CONCEPTUAL,
        misconceptions: ["misses the central distinction"],
        feedback: "Repair the central distinction before advancing.",
      },
    });

    expect(result.attempt.questionId).toBe(question.id);
    expect(result.completedReviewCount).toBe(1);
    expect(result.newMastery).not.toBe(0.4);
    expect(result.mistake?.errorType).toBe(ErrorType.CONCEPTUAL);
    expect(result.review.status).toBe("PENDING");

    const [oldReviewAfter, state, activeSession, events, attempts, mistakes] =
      await Promise.all([
        prisma.reviewTask.findUniqueOrThrow({ where: { id: oldReview.id } }),
        prisma.learningState.findUniqueOrThrow({
          where: {
            userId_conceptId: {
              userId: user.id,
              conceptId: concept.id,
            },
          },
        }),
        prisma.studySession.findUniqueOrThrow({ where: { id: session.id } }),
        prisma.learningEvent.findMany({
          where: {
            userId: user.id,
            conceptId: concept.id,
          },
        }),
        prisma.attempt.findMany({
          where: {
            userId: user.id,
            questionId: question.id,
          },
        }),
        prisma.mistake.findMany({
          where: {
            userId: user.id,
            conceptId: concept.id,
          },
        }),
      ]);

    expect(oldReviewAfter.status).toBe("COMPLETED");
    expect(oldReviewAfter.completedAt).not.toBeNull();
    expect(state.attemptCount).toBe(1);
    expect(state.lastReviewedAt).not.toBeNull();
    expect(state.nextReviewAt).not.toBeNull();
    expect(activeSession.currentQuestionId).toBeNull();
    expect(attempts).toHaveLength(1);
    expect(mistakes).toHaveLength(1);

    const eventTypes = new Set(events.map((event) => event.type));
    expect(eventTypes.has("QUESTION_CREATED")).toBe(true);
    expect(eventTypes.has("QUESTION_ANSWERED")).toBe(true);
    expect(eventTypes.has("MISTAKE_CREATED")).toBe(true);
    expect(eventTypes.has("REVIEW_COMPLETED")).toBe(true);
    expect(eventTypes.has("REVIEW_SCHEDULED")).toBe(true);

    const detail = await getConceptDetail(user.id, concept.id);

    expect(detail.concept.id).toBe(concept.id);
    expect(detail.state.attemptCount).toBe(1);
    expect(detail.prerequisites).toHaveLength(1);
    expect(detail.prerequisites[0]?.conceptId).toBe(prerequisite.id);
    expect(detail.prerequisites[0]?.mastery).toBeCloseTo(0.75);
    expect(detail.attempts).toHaveLength(1);
    expect(detail.attempts[0]?.question.id).toBe(question.id);
    expect(detail.mistakes).toHaveLength(1);
    expect(detail.masteryHistory).toHaveLength(1);
    expect(detail.masteryHistory[0]?.oldMastery).toBeCloseTo(0.4);
    expect(detail.masteryHistory[0]?.newMastery).toBeCloseTo(result.newMastery);
    expect(detail.reviewTasks.length).toBeGreaterThanOrEqual(2);
    expect(detail.events.length).toBeGreaterThanOrEqual(5);
  });
});
