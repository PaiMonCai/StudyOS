import {
  ErrorType,
  LearningEventType,
  ReviewSource,
} from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import {
  addDays,
  attemptResult,
  calculatePerformanceScore,
  masteryToReviewIntervalDays,
  reviewPriority,
  updateMastery,
} from "@/server/learning/engine";

export type AnswerEvaluation = {
  correctness: number;
  reasoning: number;
  independence: number;
  errorType: ErrorType;
  misconceptions: string[];
  feedback: string;
};

export async function getLearningState(
  userId: string,
  conceptId: string,
) {
  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
    include: {
      topic: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!concept) {
    throw new Error("CONCEPT_NOT_FOUND");
  }

  const state = await prisma.learningState.findUnique({
    where: {
      userId_conceptId: {
        userId,
        conceptId,
      },
    },
  });

  return {
    concept,
    state: state ?? {
      mastery: 0.3,
      confidence: 0.3,
      attemptCount: 0,
      correctCount: 0,
      lastStudiedAt: null,
      nextReviewAt: null,
    },
  };
}

export async function getPrerequisites(
  userId: string,
  conceptId: string,
) {
  const relations = await prisma.conceptRelation.findMany({
    where: {
      toConceptId: conceptId,
      relationType: "PREREQUISITE",
    },
    include: {
      fromConcept: true,
    },
  });

  const states = await prisma.learningState.findMany({
    where: {
      userId,
      conceptId: {
        in: relations.map((relation) => relation.fromConceptId),
      },
    },
  });

  const stateMap = new Map(
    states.map((state) => [state.conceptId, state]),
  );

  return relations.map((relation) => ({
    conceptId: relation.fromConceptId,
    name: relation.fromConcept.name,
    mastery: stateMap.get(relation.fromConceptId)?.mastery ?? 0.3,
    strength: relation.strength,
  }));
}

export async function getRecentMistakes(
  userId: string,
  conceptId?: string,
) {
  return prisma.mistake.findMany({
    where: {
      userId,
      ...(conceptId ? { conceptId } : {}),
      status: "OPEN",
    },
    include: {
      concept: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });
}

export async function createAgentQuestion(input: {
  userId: string;
  sessionId: string;
  conceptId: string;
  stem: string;
  answer: string;
  explanation?: string;
  type:
    | "CONCEPT"
    | "CALCULATION"
    | "DERIVATION"
    | "COMPARISON"
    | "APPLICATION";
  difficulty: number;
}) {
  const session = await prisma.studySession.findFirst({
    where: {
      id: input.sessionId,
      userId: input.userId,
      endedAt: null,
    },
  });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const concept = await prisma.concept.findUnique({
    where: { id: input.conceptId },
  });

  if (!concept) {
    throw new Error("CONCEPT_NOT_FOUND");
  }

  const question = await prisma.question.create({
    data: {
      conceptId: input.conceptId,
      stem: input.stem,
      answer: input.answer,
      explanation: input.explanation,
      type: input.type,
      difficulty: Math.max(1, Math.min(5, input.difficulty)),
      source: "AGENT",
    },
  });

  await prisma.$transaction([
    prisma.studySession.update({
      where: { id: input.sessionId },
      data: { currentQuestionId: question.id },
    }),
    prisma.learningEvent.create({
      data: {
        userId: input.userId,
        conceptId: input.conceptId,
        sessionId: input.sessionId,
        type: LearningEventType.QUESTION_CREATED,
        metadata: {
          questionId: question.id,
          difficulty: question.difficulty,
          type: question.type,
        },
      },
    }),
  ]);

  return question;
}

export async function getCurrentQuestion(
  userId: string,
  sessionId: string,
) {
  const session = await prisma.studySession.findFirst({
    where: {
      id: sessionId,
      userId,
      endedAt: null,
    },
  });

  if (!session?.currentQuestionId) {
    return null;
  }

  return prisma.question.findUnique({
    where: { id: session.currentQuestionId },
    include: {
      concept: true,
    },
  });
}

export async function recordCurrentAttempt(input: {
  userId: string;
  sessionId: string;
  answer: string;
  evaluation: AnswerEvaluation;
}) {
  const currentQuestion = await getCurrentQuestion(
    input.userId,
    input.sessionId,
  );

  if (!currentQuestion) {
    throw new Error("NO_ACTIVE_QUESTION");
  }

  const oldState = await prisma.learningState.findUnique({
    where: {
      userId_conceptId: {
        userId: input.userId,
        conceptId: currentQuestion.conceptId,
      },
    },
  });

  const score = calculatePerformanceScore({
    correctness: input.evaluation.correctness,
    reasoning: input.evaluation.reasoning,
    independence: input.evaluation.independence,
  });

  const oldMastery = oldState?.mastery ?? 0.3;
  const mastery = updateMastery(oldMastery, score);
  const confidence = Math.min(
    1,
    Math.max(
      0,
      (oldState?.confidence ?? 0.3) * 0.75 +
        input.evaluation.independence * 0.25,
    ),
  );

  const intervalDays = masteryToReviewIntervalDays(mastery, score);
  const now = new Date();
  const scheduledAt = addDays(now, intervalDays);
  const priority = reviewPriority(mastery, score);
  const result = attemptResult(score);

  const shouldCreateMistake =
    input.evaluation.errorType !== ErrorType.NONE || score < 0.6;

  return prisma.$transaction(async (tx) => {
    const dueReviews = await tx.reviewTask.findMany({
      where: {
        userId: input.userId,
        conceptId: currentQuestion.conceptId,
        status: "PENDING",
        scheduledAt: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (dueReviews.length > 0) {
      await tx.reviewTask.updateMany({
        where: {
          id: {
            in: dueReviews.map((review) => review.id),
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: now,
        },
      });

      await tx.learningEvent.create({
        data: {
          userId: input.userId,
          conceptId: currentQuestion.conceptId,
          sessionId: input.sessionId,
          type: LearningEventType.REVIEW_COMPLETED,
          score,
          metadata: {
            completedReviewTaskIds: dueReviews.map((review) => review.id),
          },
        },
      });
    }

    const attempt = await tx.attempt.create({
      data: {
        userId: input.userId,
        questionId: currentQuestion.id,
        sessionId: input.sessionId,
        answer: input.answer,
        score,
        result,
        evaluation: input.evaluation,
      },
    });

    const state = await tx.learningState.upsert({
      where: {
        userId_conceptId: {
          userId: input.userId,
          conceptId: currentQuestion.conceptId,
        },
      },
      update: {
        mastery,
        confidence,
        attemptCount: { increment: 1 },
        correctCount:
          result === "CORRECT" ? { increment: 1 } : undefined,
        lastStudiedAt: now,
        lastReviewedAt:
          dueReviews.length > 0 ? now : oldState?.lastReviewedAt,
        nextReviewAt: scheduledAt,
      },
      create: {
        userId: input.userId,
        conceptId: currentQuestion.conceptId,
        mastery,
        confidence,
        attemptCount: 1,
        correctCount: result === "CORRECT" ? 1 : 0,
        lastStudiedAt: now,
        lastReviewedAt: dueReviews.length > 0 ? now : null,
        nextReviewAt: scheduledAt,
      },
    });

    await tx.learningEvent.create({
      data: {
        userId: input.userId,
        conceptId: currentQuestion.conceptId,
        sessionId: input.sessionId,
        type: LearningEventType.QUESTION_ANSWERED,
        score,
        confidence,
        metadata: {
          attemptId: attempt.id,
          oldMastery,
          newMastery: mastery,
          result,
          errorType: input.evaluation.errorType,
          misconceptions: input.evaluation.misconceptions,
        },
      },
    });

    let mistake = null;
    if (shouldCreateMistake) {
      mistake = await tx.mistake.create({
        data: {
          userId: input.userId,
          attemptId: attempt.id,
          conceptId: currentQuestion.conceptId,
          errorType: input.evaluation.errorType,
          severity: Math.min(1, Math.max(0.1, 1 - score)),
          misconception: input.evaluation.misconceptions.join("; ") || null,
          diagnosis: input.evaluation.feedback,
        },
      });

      await tx.learningEvent.create({
        data: {
          userId: input.userId,
          conceptId: currentQuestion.conceptId,
          sessionId: input.sessionId,
          type: LearningEventType.MISTAKE_CREATED,
          score,
          metadata: {
            mistakeId: mistake.id,
            errorType: input.evaluation.errorType,
          },
        },
      });
    }

    const review = await tx.reviewTask.create({
      data: {
        userId: input.userId,
        conceptId: currentQuestion.conceptId,
        scheduledAt,
        intervalDays,
        priority,
        source: shouldCreateMistake
          ? ReviewSource.MISTAKE
          : ReviewSource.SCHEDULED_REVIEW,
      },
    });

    await tx.learningEvent.create({
      data: {
        userId: input.userId,
        conceptId: currentQuestion.conceptId,
        sessionId: input.sessionId,
        type: LearningEventType.REVIEW_SCHEDULED,
        score,
        metadata: {
          reviewTaskId: review.id,
          intervalDays,
          scheduledAt: scheduledAt.toISOString(),
        },
      },
    });

    await tx.studySession.update({
      where: { id: input.sessionId },
      data: {
        currentQuestionId: null,
      },
    });

    return {
      attempt,
      state,
      mistake,
      review,
      completedReviewCount: dueReviews.length,
      oldMastery,
      newMastery: mastery,
    };
  });
}
