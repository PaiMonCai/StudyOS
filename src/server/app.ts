import { Hono, type Context } from "hono";
import { z } from "zod";
import { MistakeStatus, SessionMode } from "@/generated/prisma/enums";
import { runStudyAgent } from "@/server/agent/study-agent";
import {
  getConceptDetail,
  getMistakeDetail,
  listMistakes,
  setMistakeStatus,
} from "@/server/services/learning-service";
import { getDefaultUser } from "@/server/db";
import { env } from "@/server/env";
import {
  AppError,
  errorBody,
  normalizeError,
} from "@/server/errors";
import { logger } from "@/server/logger";
import {
  createStudySession,
  finishStudySession,
  getDashboard,
  getDueReviews,
  getKnowledgeTree,
  getStudySession,
  startReviewSession,
} from "@/server/services/study-service";

type AppEnv = {
  Variables: {
    requestId: string;
  };
};

export const app = new Hono<AppEnv>().basePath("/api");

app.use("*", async (c, next) => {
  const requestId =
    c.req.header("x-request-id")?.trim() || crypto.randomUUID();
  const startedAt = Date.now();

  c.set("requestId", requestId);

  try {
    await next();
  } finally {
    c.header("x-request-id", requestId);

    logger.info("http.request", {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    });
  }
});

async function readJson(c: Context<AppEnv>) {
  try {
    return await c.req.json();
  } catch {
    throw new AppError({
      code: "INVALID_REQUEST",
      message: "Request body must be valid JSON.",
      statusCode: 400,
    });
  }
}

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "studyos",
    version: "0.1.0",
    requestId: c.get("requestId"),
  }),
);

app.get("/dashboard", async (c) => {
  const user = await getDefaultUser();
  return c.json(await getDashboard(user.id));
});

app.get("/knowledge", async (c) => {
  const user = await getDefaultUser();
  return c.json(await getKnowledgeTree(user.id));
});

app.get("/concepts/:id", async (c) => {
  const user = await getDefaultUser();
  return c.json(await getConceptDetail(user.id, c.req.param("id")));
});

const mistakeStatusQuerySchema = z.enum(["OPEN", "RESOLVED"]).optional();

app.get("/mistakes", async (c) => {
  const parsedStatus = mistakeStatusQuerySchema.safeParse(c.req.query("status"));

  if (!parsedStatus.success) {
    return c.json(
      errorBody({
        code: "INVALID_REQUEST",
        message: "Invalid mistake status filter.",
        requestId: c.get("requestId"),
        details: parsedStatus.error.flatten(),
      }),
      400,
    );
  }

  const user = await getDefaultUser();
  return c.json(
    await listMistakes({
      userId: user.id,
      status: parsedStatus.data as MistakeStatus | undefined,
      limit: 100,
    }),
  );
});

app.get("/mistakes/:id", async (c) => {
  const user = await getDefaultUser();
  return c.json(await getMistakeDetail(user.id, c.req.param("id")));
});

app.post("/mistakes/:id/resolve", async (c) => {
  const user = await getDefaultUser();
  return c.json(
    await setMistakeStatus({
      userId: user.id,
      mistakeId: c.req.param("id"),
      status: MistakeStatus.RESOLVED,
    }),
  );
});

app.post("/mistakes/:id/reopen", async (c) => {
  const user = await getDefaultUser();
  return c.json(
    await setMistakeStatus({
      userId: user.id,
      mistakeId: c.req.param("id"),
      status: MistakeStatus.OPEN,
    }),
  );
});

app.get("/reviews/today", async (c) => {
  const user = await getDefaultUser();
  return c.json(await getDueReviews(user.id, 50));
});

app.post("/reviews/:id/start", async (c) => {
  const user = await getDefaultUser();
  const session = await startReviewSession(user.id, c.req.param("id"));
  return c.json(session);
});

app.get("/sessions/:id", async (c) => {
  const user = await getDefaultUser();
  return c.json(await getStudySession(user.id, c.req.param("id")));
});

const finishSessionSchema = z.object({
  summary: z.string().min(1).max(2000).optional(),
});

app.post("/sessions/:id/finish", async (c) => {
  const parsed = finishSessionSchema.safeParse(await readJson(c));

  if (!parsed.success) {
    return c.json(
      errorBody({
        code: "INVALID_REQUEST",
        message: "Invalid session finish request.",
        requestId: c.get("requestId"),
        details: parsed.error.flatten(),
      }),
      400,
    );
  }

  const user = await getDefaultUser();
  const session = await finishStudySession({
    userId: user.id,
    sessionId: c.req.param("id"),
    summary: parsed.data.summary,
  });

  return c.json(session);
});

const createSessionSchema = z.object({
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  conceptId: z.string().optional(),
  goal: z.string().max(1000).optional(),
  mode: z
    .enum(["LEARN", "REVIEW", "QUIZ", "FREE_CHAT"])
    .default("LEARN"),
});

app.post("/sessions", async (c) => {
  const parsed = createSessionSchema.safeParse(await readJson(c));

  if (!parsed.success) {
    return c.json(
      errorBody({
        code: "INVALID_REQUEST",
        message: "Invalid study session request.",
        requestId: c.get("requestId"),
        details: parsed.error.flatten(),
      }),
      400,
    );
  }

  const user = await getDefaultUser();
  const session = await createStudySession({
    userId: user.id,
    subjectId: parsed.data.subjectId,
    topicId: parsed.data.topicId,
    conceptId: parsed.data.conceptId,
    goal: parsed.data.goal,
    mode: parsed.data.mode as SessionMode,
  });

  return c.json(session, 201);
});

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12000),
});

const agentMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1).max(12000),
  history: z.array(historyItemSchema).max(30).default([]),
});

app.post("/agent/message", async (c) => {
  if (!env.OPENAI_API_KEY) {
    return c.json(
      errorBody({
        code: "OPENAI_API_KEY_MISSING",
        message: "Set OPENAI_API_KEY before using the Study Agent.",
        requestId: c.get("requestId"),
      }),
      503,
    );
  }

  const parsed = agentMessageSchema.safeParse(await readJson(c));

  if (!parsed.success) {
    return c.json(
      errorBody({
        code: "INVALID_REQUEST",
        message: "Invalid Study Agent request.",
        requestId: c.get("requestId"),
        details: parsed.error.flatten(),
      }),
      400,
    );
  }

  const user = await getDefaultUser();

  const result = await runStudyAgent({
    userId: user.id,
    sessionId: parsed.data.sessionId,
    message: parsed.data.message,
    history: parsed.data.history,
  });

  return c.json(result);
});

app.onError((error, c) => {
  const normalized = normalizeError(error);
  const requestId = c.get("requestId") || "unknown";

  logger.error("http.error", {
    requestId,
    code: normalized.code,
    statusCode: normalized.statusCode,
    message: error instanceof Error ? error.message : String(error),
    stack:
      env.NODE_ENV === "development" && error instanceof Error
        ? error.stack
        : undefined,
  });

  const body = errorBody({
    code: normalized.code,
    message:
      normalized.code === "INTERNAL_ERROR" && env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : normalized.message
        : normalized.message,
    requestId,
    details: normalized.details,
  });

  switch (normalized.statusCode) {
    case 400:
      return c.json(body, 400);
    case 404:
      return c.json(body, 404);
    case 409:
      return c.json(body, 409);
    case 503:
      return c.json(body, 503);
    default:
      return c.json(body, 500);
  }
});
