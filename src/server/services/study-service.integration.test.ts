import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
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

  it("creates one open StudySession bound to the due review and concept", async () => {
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

    const openSessions = await prisma.studySession.count({
      where: {
        userId: user.id,
        reviewTaskId: reviewTask.id,
        endedAt: null,
      },
    });

    expect(openSessions).toBe(1);
  });
});
