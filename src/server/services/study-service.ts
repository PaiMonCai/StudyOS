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

export async function createStudySession(input: {
  userId: string;
  subjectId?: string;
  topicId?: string;
  conceptId?: string;
  reviewTaskId?: string;
  goal?: string;
  mode?: SessionMode;
}) {
  return prisma.studySession.create({
    data: {
      userId: input.userId,
      subjectId: input.subjectId,
      topicId: input.topicId,
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

  return session;
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
  summary: string;
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

  return prisma.studySession.update({
    where: { id: input.sessionId },
    data: {
      summary: input.summary,
      endedAt: session.endedAt ?? new Date(),
      currentQuestionId: null,
    },
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
