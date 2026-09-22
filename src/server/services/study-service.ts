import { SessionMode } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";

const sessionContextInclude = {
  subject: true,
  topic: true,
  concept: {
    include: {
      topic: {
        include: {
          subject: true,
        },
      },
    },
  },
  reviewTask: true,
} as const;

type SessionStats = {
  attemptCount: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  mistakeCount: number;
  concepts: string[];
  masteryDelta: number;
};

function readMetadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

async function getSessionStats(
  userId: string,
  sessionId: string,
): Promise<SessionStats> {
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      sessionId,
    },
    include: {
      question: {
        include: {
          concept: true,
        },
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
  });

  const attemptIds = attempts.map((attempt) => attempt.id);

  const [mistakeCount, answerEvents] = await Promise.all([
    attemptIds.length
      ? prisma.mistake.count({
          where: {
            userId,
            attemptId: {
              in: attemptIds,
            },
          },
        })
      : Promise.resolve(0),
    prisma.learningEvent.findMany({
      where: {
        userId,
        sessionId,
        type: "QUESTION_ANSWERED",
      },
      select: {
        metadata: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const concepts = Array.from(
    new Set(attempts.map((attempt) => attempt.question.concept.name)),
  );

  const masteryDelta = answerEvents.reduce((sum, event) => {
    const oldMastery = readMetadataNumber(event.metadata, "oldMastery");
    const newMastery = readMetadataNumber(event.metadata, "newMastery");

    if (oldMastery === null || newMastery === null) {
      return sum;
    }

    return sum + (newMastery - oldMastery);
  }, 0);

  return {
    attemptCount: attempts.length,
    correctCount: attempts.filter((attempt) => attempt.result === "CORRECT").length,
    partialCount: attempts.filter((attempt) => attempt.result === "PARTIAL").length,
    incorrectCount: attempts.filter((attempt) => attempt.result === "INCORRECT").length,
    mistakeCount,
    concepts,
    masteryDelta,
  };
}

function buildDeterministicSummary(stats: SessionStats) {
  if (stats.attemptCount === 0) {
    return "本次 Session 已结束，尚未记录可评分作答。";
  }

  const conceptText =
    stats.concepts.length > 0 ? stats.concepts.join("、") : "未标记知识点";
  const masteryPoints = Math.round(stats.masteryDelta * 100);
  const masteryText =
    masteryPoints === 0
      ? "本次记录的掌握度没有净变化"
      : `本次记录的掌握度累计变化 ${masteryPoints > 0 ? "+" : ""}${masteryPoints} 个百分点`;

  return [
    `本次完成 ${stats.attemptCount} 次可评分作答（正确 ${stats.correctCount}、部分正确 ${stats.partialCount}、错误 ${stats.incorrectCount}）。`,
    `记录 ${stats.mistakeCount} 个错误诊断。`,
    `练习知识点：${conceptText}。`,
    `${masteryText}。`,
  ].join("");
}

export async function createStudySession(input: {
  userId: string;
  subjectId?: string;
  topicId?: string;
  conceptId?: string;
  reviewTaskId?: string;
  goal?: string;
  mode?: SessionMode;
}) {
  let subjectId = input.subjectId;
  let topicId = input.topicId;

  if (input.conceptId) {
    const concept = await prisma.concept.findUnique({
      where: { id: input.conceptId },
      include: {
        topic: true,
      },
    });

    if (!concept) {
      throw new Error("CONCEPT_NOT_FOUND");
    }

    // Concept is the source of truth for its curriculum context.
    // Never persist mismatched subject/topic IDs supplied by a caller.
    topicId = concept.topicId;
    subjectId = concept.topic.subjectId;
  }

  return prisma.studySession.create({
    data: {
      userId: input.userId,
      subjectId,
      topicId,
      conceptId: input.conceptId,
      reviewTaskId: input.reviewTaskId,
      goal: input.goal,
      mode: input.mode ?? SessionMode.LEARN,
    },
    include: sessionContextInclude,
  });
}

export async function getStudySession(userId: string, sessionId: string) {
  const session = await prisma.studySession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    include: sessionContextInclude,
  });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const [stats, learningState] = await Promise.all([
    getSessionStats(userId, sessionId),
    session.conceptId
      ? prisma.learningState.findUnique({
          where: {
            userId_conceptId: {
              userId,
              conceptId: session.conceptId,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    ...session,
    stats,
    learningState,
  };
}

export async function startReviewSession(
  userId: string,
  reviewTaskId: string,
) {
  const reviewTask = await prisma.reviewTask.findFirst({
    where: {
      id: reviewTaskId,
      userId,
      status: "PENDING",
      scheduledAt: {
        lte: new Date(),
      },
    },
    include: {
      concept: {
        include: {
          topic: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
  });

  if (!reviewTask) {
    throw new Error("REVIEW_TASK_NOT_FOUND");
  }

  const existing = await prisma.studySession.findFirst({
    where: {
      userId,
      reviewTaskId,
      endedAt: null,
    },
    include: sessionContextInclude,
    orderBy: {
      startedAt: "desc",
    },
  });

  if (existing) {
    return existing;
  }

  return createStudySession({
    userId,
    subjectId: reviewTask.concept.topic.subjectId,
    topicId: reviewTask.concept.topicId,
    conceptId: reviewTask.conceptId,
    reviewTaskId: reviewTask.id,
    goal: `Review ${reviewTask.concept.name}`,
    mode: SessionMode.REVIEW,
  });
}

export async function finishStudySession(input: {
  userId: string;
  sessionId: string;
  summary?: string;
}) {
  const session = await prisma.studySession.findFirst({
    where: {
      id: input.sessionId,
      userId: input.userId,
    },
  });

  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  if (session.endedAt) {
    return getStudySession(input.userId, input.sessionId);
  }

  const stats = await getSessionStats(input.userId, input.sessionId);
  const summary =
    input.summary?.trim() || buildDeterministicSummary(stats);

  await prisma.studySession.update({
    where: { id: input.sessionId },
    data: {
      summary,
      endedAt: new Date(),
      currentQuestionId: null,
    },
  });

  return getStudySession(input.userId, input.sessionId);
}

export async function listStudySessions(
  userId: string,
  limit = 50,
) {
  return prisma.studySession.findMany({
    where: {
      userId,
    },
    include: {
      subject: true,
      topic: true,
      concept: true,
      reviewTask: true,
      _count: {
        select: {
          attempts: true,
          learningEvents: true,
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    take: Math.max(1, Math.min(100, limit)),
  });
}

export async function searchConcepts(query: string, limit = 8) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.concept.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: trimmed } },
        { slug: { contains: trimmed } },
        { description: { contains: trimmed } },
      ],
    },
    include: {
      topic: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: [
      { difficulty: "asc" },
      { name: "asc" },
    ],
    take: limit,
  });
}

export async function getDueReviews(userId: string, limit = 10) {
  return prisma.reviewTask.findMany({
    where: {
      userId,
      status: "PENDING",
      scheduledAt: {
        lte: new Date(),
      },
    },
    include: {
      concept: {
        include: {
          topic: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
    orderBy: [
      { priority: "desc" },
      { scheduledAt: "asc" },
    ],
    take: limit,
  });
}

export type ReviewScope = "DUE" | "UPCOMING" | "COMPLETED" | "ALL";

export async function listReviewTasks(input: {
  userId: string;
  scope?: ReviewScope;
  limit?: number;
}) {
  const scope = input.scope ?? "DUE";
  const now = new Date();

  const where =
    scope === "DUE"
      ? {
          userId: input.userId,
          status: "PENDING" as const,
          scheduledAt: { lte: now },
        }
      : scope === "UPCOMING"
        ? {
            userId: input.userId,
            status: "PENDING" as const,
            scheduledAt: { gt: now },
          }
        : scope === "COMPLETED"
          ? {
              userId: input.userId,
              status: "COMPLETED" as const,
            }
          : {
              userId: input.userId,
            };

  return prisma.reviewTask.findMany({
    where,
    include: {
      concept: {
        include: {
          topic: {
            include: {
              subject: true,
            },
          },
        },
      },
    },
    orderBy:
      scope === "COMPLETED"
        ? [{ completedAt: "desc" }, { scheduledAt: "desc" }]
        : [{ scheduledAt: "asc" }, { priority: "desc" }],
    take: Math.max(1, Math.min(200, input.limit ?? 100)),
  });
}

export async function getKnowledgeTree(userId: string) {
  const subjects = await prisma.subject.findMany({
    include: {
      topics: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          concepts: {
            where: {
              status: "ACTIVE",
            },
            orderBy: [
              { difficulty: "asc" },
              { name: "asc" },
            ],
            include: {
              learningStates: {
                where: {
                  userId,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    slug: subject.slug,
    topics: subject.topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      concepts: topic.concepts.map((concept) => ({
        id: concept.id,
        name: concept.name,
        slug: concept.slug,
        difficulty: concept.difficulty,
        mastery: concept.learningStates[0]?.mastery ?? 0.3,
        confidence: concept.learningStates[0]?.confidence ?? 0.3,
        nextReviewAt:
          concept.learningStates[0]?.nextReviewAt ?? null,
      })),
    })),
  }));
}

export async function getDashboard(userId: string) {
  const [dueReviews, weakStates, recentSessions, counts] =
    await Promise.all([
      getDueReviews(userId, 5),
      prisma.learningState.findMany({
        where: {
          userId,
          mastery: {
            lt: 0.6,
          },
        },
        include: {
          concept: {
            include: {
              topic: {
                include: {
                  subject: true,
                },
              },
            },
          },
        },
        orderBy: {
          mastery: "asc",
        },
        take: 6,
      }),
      prisma.studySession.findMany({
        where: {
          userId,
        },
        orderBy: {
          startedAt: "desc",
        },
        take: 5,
        include: {
          subject: true,
          topic: true,
          concept: true,
        },
      }),
      prisma.learningState.aggregate({
        where: { userId },
        _avg: { mastery: true },
        _count: true,
      }),
    ]);

  return {
    masteryAverage: counts._avg.mastery ?? 0,
    trackedConcepts: counts._count,
    dueReviews: dueReviews.length,
    dueReviewItems: dueReviews,
    weakConcepts: weakStates,
    recentSessions,
  };
}
