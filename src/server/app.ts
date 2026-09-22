import { Hono } from "hono";
import { z } from "zod";
import { SessionMode } from "@/generated/prisma/enums";
import { runStudyAgent } from "@/server/agent/study-agent";
import { getDefaultUser } from "@/server/db";
import {
  createStudySession,
  getDashboard,
  getDueReviews,
  getKnowledgeTree,
} from "@/server/services/study-service";

export const app = new Hono().basePath("/api");

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "studyos",
    version: "0.1.0",
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

app.get("/reviews/today", async (c) => {
  const user = await getDefaultUser();
  return c.json(await getDueReviews(user.id, 50));
});

const createSessionSchema = z.object({
  subjectId: z.string().optional(),
  topicId: z.string().optional(),
  goal: z.string().max(1000).optional(),
  mode: z
    .enum(["LEARN", "REVIEW", "QUIZ", "FREE_CHAT"])
    .default("LEARN"),
});

app.post("/sessions", async (c) => {
  const parsed = createSessionSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json(
      {
        error: "INVALID_REQUEST",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const user = await getDefaultUser();
  const session = await createStudySession({
    userId: user.id,
    subjectId: parsed.data.subjectId,
    topicId: parsed.data.topicId,
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
  if (!process.env.OPENAI_API_KEY) {
    return c.json(
      {
        error: "OPENAI_API_KEY_MISSING",
        message:
          "Set OPENAI_API_KEY before using the Study Agent.",
      },
      503,
    );
  }

  const parsed = agentMessageSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json(
      {
        error: "INVALID_REQUEST",
        details: parsed.error.flatten(),
      },
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
  console.error(error);

  const knownErrors = new Set([
    "CONCEPT_NOT_FOUND",
    "SESSION_NOT_FOUND",
    "NO_ACTIVE_QUESTION",
  ]);

  if (knownErrors.has(error.message)) {
    return c.json(
      {
        error: error.message,
      },
      404,
    );
  }

  return c.json(
    {
      error: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Unexpected server error.",
    },
    500,
  );
});
