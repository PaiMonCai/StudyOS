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
import type { AnswerEvaluation } from "@/server/services/learning-service";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function metadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function readEvaluation(value: unknown): AnswerEvaluation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      correctness: 0,
      reasoning: 0,
      independence: 0,
      errorType: ErrorType.UNKNOWN,
      misconceptions: [],
      feedback: "",
    };
  }

  const object = value as Record<string, unknown>;
  const errorType =
    typeof object.errorType === "string" &&
    Object.values(ErrorType).includes(object.errorType as ErrorType)
      ? (object.errorType as ErrorType)
      : ErrorType.UNKNOWN;

  return {
    correctness:
      typeof object.correctness === "number" ? object.correctness : 0,
    reasoning: typeof object.reasoning === "number" ? object.reasoning : 0,
    independence:
      typeof object.independence === "number" ? object.independence : 0,
    errorType,
    misconceptions: Array.isArray(object.misconceptions)
      ? object.misconceptions.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    feedback: typeof object.feedback === "string" ? object.feedback : "",
  };
}

function correctionToEvaluation(correction: {
  correctness: number;
  reasoning: number;
  independence: number;
  errorType: ErrorType;
  misconceptions: unknown;
  feedback: string;
}): AnswerEvaluation {
  return {
    correctness: correction.correctness,
    reasoning: correction.reasoning,
    independence: correction.independence,
    errorType: correction.errorType,
    misconceptions: Array.isArray(correction.misconceptions)
      ? correction.misconceptions.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    feedback: correction.feedback,
  };
}

export async function correctAttemptEvaluation(input: {
  userId: string;
  attemptId: string;
  evaluation: AnswerEvaluation;
  note?: string;
}) {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: input.attemptId,
      userId: input.userId,
    },
    include: {
      question: true,
      session: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  const correctedScore = calculatePerformanceScore({
    correctness: input.evaluation.correctness,
    reasoning: input.evaluation.reasoning,
    independence: input.evaluation.independence,
  });
  const correctedResult = attemptResult(correctedScore);
  const conceptId = attempt.question.conceptId;
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const oldState = await tx.learningState.findUnique({
      where: {
        userId_conceptId: {
          userId: input.userId,
          conceptId,
        },
      },
    });

    const correction = await tx.attemptCorrection.create({
      data: {
        userId: input.userId,
        attemptId: input.attemptId,
        correctness: clamp01(input.evaluation.correctness),
        reasoning: clamp01(input.evaluation.reasoning),
        independence: clamp01(input.evaluation.independence),
        errorType: input.evaluation.errorType,
        misconceptions: input.evaluation.misconceptions,
        feedback: input.evaluation.feedback,
        note: input.note?.trim() || null,
        score: correctedScore,
        result: correctedResult,
      },
    });

    const [attempts, answerEvents, latestReviewEvent, pendingReviews] =
      await Promise.all([
        tx.attempt.findMany({
          where: {
            userId: input.userId,
            question: {
              conceptId,
            },
          },
          include: {
            corrections: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
          orderBy: {
            submittedAt: "asc",
          },
        }),
        tx.learningEvent.findMany({
          where: {
            userId: input.userId,
            conceptId,
            type: LearningEventType.QUESTION_ANSWERED,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
        tx.learningEvent.findFirst({
          where: {
            userId: input.userId,
            conceptId,
            type: LearningEventType.REVIEW_COMPLETED,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        tx.reviewTask.findMany({
          where: {
            userId: input.userId,
            conceptId,
            status: "PENDING",
          },
          orderBy: {
            scheduledAt: "asc",
          },
        }),
      ]);

    const eventByAttemptId = new Map(
      answerEvents
        .map((event) => [
          metadataString(event.metadata, "attemptId"),
          event,
        ] as const)
        .filter(
          (
            pair,
          ): pair is readonly [
            string,
            (typeof answerEvents)[number],
          ] => pair[0] !== null,
        ),
    );

    const firstAttempt = attempts[0];
    const firstEvent = firstAttempt
      ? eventByAttemptId.get(firstAttempt.id) ?? null
      : null;

    let mastery =
      metadataNumber(firstEvent?.metadata, "oldMastery") ??
      oldState?.mastery ??
      0.3;

    const firstOriginalEvaluation = firstAttempt
      ? readEvaluation(firstAttempt.evaluation)
      : null;

    let confidence =
      firstEvent?.confidence !== null &&
      firstEvent?.confidence !== undefined &&
      firstOriginalEvaluation
        ? clamp01(
            (firstEvent.confidence -
              firstOriginalEvaluation.independence * 0.25) /
              0.75,
          )
        : oldState?.confidence ?? 0.3;

    let correctCount = 0;
    let lastScore = 0.3;

    for (const item of attempts) {
      const latestCorrection = item.corrections[0];
      const evaluation = latestCorrection
        ? correctionToEvaluation(latestCorrection)
        : readEvaluation(item.evaluation);

      const score = calculatePerformanceScore(evaluation);
      const result = attemptResult(score);

      mastery = updateMastery(mastery, score);
      confidence = clamp01(
        confidence * 0.75 + clamp01(evaluation.independence) * 0.25,
      );
      lastScore = score;

      if (result === "CORRECT") {
        correctCount += 1;
      }
    }

    const dueReviews = pendingReviews.filter(
      (review) => review.scheduledAt.getTime() <= now.getTime(),
    );

    let nextReviewAt: Date | null = null;
    let replacementReview = null;

    if (dueReviews.length > 0) {
      nextReviewAt = dueReviews[0]?.scheduledAt ?? null;
    } else if (attempts.length > 0) {
      const futureIds = pendingReviews.map((review) => review.id);

      if (futureIds.length > 0) {
        await tx.reviewTask.updateMany({
          where: {
            id: {
              in: futureIds,
            },
          },
          data: {
            status: "SKIPPED",
          },
        });
      }

      const intervalDays = masteryToReviewIntervalDays(mastery, lastScore);
      const scheduledAt = addDays(now, intervalDays);
      const priority = reviewPriority(mastery, lastScore);

      replacementReview = await tx.reviewTask.create({
        data: {
          userId: input.userId,
          conceptId,
          scheduledAt,
          intervalDays,
          priority,
          source: ReviewSource.MANUAL,
        },
      });
      nextReviewAt = scheduledAt;

      await tx.learningEvent.create({
        data: {
          userId: input.userId,
          conceptId,
          sessionId: attempt.sessionId,
          type: LearningEventType.REVIEW_SCHEDULED,
          score: lastScore,
          metadata: {
            reviewTaskId: replacementReview.id,
            intervalDays,
            scheduledAt: scheduledAt.toISOString(),
            reason: "EVALUATION_CORRECTION",
          },
        },
      });
    }

    const lastAttempt = attempts.at(-1);

    const state = await tx.learningState.upsert({
      where: {
        userId_conceptId: {
          userId: input.userId,
          conceptId,
        },
      },
      update: {
        mastery,
        confidence,
        attemptCount: attempts.length,
        correctCount,
        lastStudiedAt: lastAttempt?.submittedAt ?? oldState?.lastStudiedAt,
        lastReviewedAt:
          latestReviewEvent?.createdAt ?? oldState?.lastReviewedAt ?? null,
        nextReviewAt,
      },
      create: {
        userId: input.userId,
        conceptId,
        mastery,
        confidence,
        attemptCount: attempts.length,
        correctCount,
        lastStudiedAt: lastAttempt?.submittedAt ?? null,
        lastReviewedAt: latestReviewEvent?.createdAt ?? null,
        nextReviewAt,
      },
    });

    await tx.learningEvent.create({
      data: {
        userId: input.userId,
        conceptId,
        sessionId: attempt.sessionId,
        type: LearningEventType.EVALUATION_CORRECTED,
        score: correctedScore,
        confidence,
        metadata: {
          attemptId: attempt.id,
          correctionId: correction.id,
          oldMastery: oldState?.mastery ?? 0.3,
          newMastery: mastery,
          correctedResult,
          errorType: input.evaluation.errorType,
          note: input.note?.trim() || null,
        },
      },
    });

    return {
      correction,
      state,
      replacementReview,
      oldMastery: oldState?.mastery ?? 0.3,
      newMastery: mastery,
      correctedScore,
      correctedResult,
    };
  });
}

export async function correctMistakeDiagnosis(input: {
  userId: string;
  mistakeId: string;
  errorType: ErrorType;
  misconception?: string;
  diagnosis?: string;
  note?: string;
}) {
  const mistake = await prisma.mistake.findFirst({
    where: {
      id: input.mistakeId,
      userId: input.userId,
    },
    include: {
      attempt: {
        select: {
          sessionId: true,
        },
      },
    },
  });

  if (!mistake) {
    throw new Error("MISTAKE_NOT_FOUND");
  }

  const before = {
    errorType: mistake.errorType,
    misconception: mistake.misconception,
    diagnosis: mistake.diagnosis,
  };
  const after = {
    errorType: input.errorType,
    misconception: input.misconception?.trim() || null,
    diagnosis: input.diagnosis?.trim() || null,
  };

  const revision = await prisma.$transaction(async (tx) => {
    const created = await tx.mistakeRevision.create({
      data: {
        userId: input.userId,
        mistakeId: input.mistakeId,
        before,
        after,
        note: input.note?.trim() || null,
      },
    });

    await tx.mistake.update({
      where: {
        id: input.mistakeId,
      },
      data: after,
    });

    await tx.learningEvent.create({
      data: {
        userId: input.userId,
        conceptId: mistake.conceptId,
        sessionId: mistake.attempt?.sessionId ?? null,
        type: LearningEventType.MISTAKE_DIAGNOSIS_CORRECTED,
        metadata: {
          mistakeId: input.mistakeId,
          revisionId: created.id,
          before,
          after,
          note: input.note?.trim() || null,
        },
      },
    });

    return created;
  });

  return {
    revision,
    mistake: await prisma.mistake.findUniqueOrThrow({
      where: {
        id: input.mistakeId,
      },
    }),
  };
}
