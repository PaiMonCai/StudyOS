import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "@/server/app";
import { getDefaultUser, prisma } from "@/server/db";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("API contract integration", () => {
  let userId = "";
  let subjectId = "";
  let topicId = "";
  let conceptId = "";
  let dueReviewId = "";
  let upcomingReviewId = "";
  let completedReviewId = "";
  const sessionIds = new Set<string>();

  beforeAll(async () => {
    const user = await getDefaultUser();
    userId = user.id;

    const subject = await prisma.subject.create({
      data: {
        name: `API Contract Subject ${suffix}`,
        slug: `api-contract-subject-${suffix}`,
      },
    });
    subjectId = subject.id;

    const topic = await prisma.topic.create({
      data: {
        subjectId,
        name: "API Contract Topic",
        slug: `api-contract-topic-${suffix}`,
      },
    });
    topicId = topic.id;

    const concept = await prisma.concept.create({
      data: {
        topicId,
        name: "API Contract Concept",
        slug: `api-contract-concept-${suffix}`,
        difficulty: 2,
      },
    });
    conceptId = concept.id;

    const [due, upcoming, completed] = await Promise.all([
      prisma.reviewTask.create({
        data: {
          userId,
          conceptId,
          scheduledAt: new Date(Date.now() - 60_000),
          intervalDays: 1,
          priority: 91,
          source: "LOW_MASTERY",
        },
      }),
      prisma.reviewTask.create({
        data: {
          userId,
          conceptId,
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          intervalDays: 7,
          priority: 40,
          source: "SCHEDULED_REVIEW",
        },
      }),
      prisma.reviewTask.create({
        data: {
          userId,
          conceptId,
          scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          intervalDays: 3,
          priority: 50,
          source: "SCHEDULED_REVIEW",
          status: "COMPLETED",
        },
      }),
    ]);

    dueReviewId = due.id;
    upcomingReviewId = upcoming.id;
    completedReviewId = completed.id;
  });

  afterAll(async () => {
    await prisma.studySession.deleteMany({
      where: {
        userId,
        OR: [
          { conceptId },
          { subjectId },
          { topicId },
          { id: { in: Array.from(sessionIds) } },
        ],
      },
    });

    if (subjectId) {
      await prisma.subject
        .delete({ where: { id: subjectId } })
        .catch(() => undefined);
    }
  });

  it("01 health returns service metadata", async () => {
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("studyos");
    expect(body.requestId).toBeTruthy();
  });

  it("02 health preserves an inbound request id", async () => {
    const response = await app.request("/api/health", {
      headers: {
        "x-request-id": "api-contract-request-id",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe(
      "api-contract-request-id",
    );
    const body = await response.json();
    expect(body.requestId).toBe("api-contract-request-id");
  });

  it("03 rejects malformed JSON when creating a session", async () => {
    const response = await app.request("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.requestId).toBeTruthy();
  });

  it("04 rejects an unknown session mode", async () => {
    const response = await app.request("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "UNKNOWN_MODE" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("05 rejects an oversized session goal", async () => {
    const response = await app.request("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "x".repeat(1001) }),
    });

    expect(response.status).toBe(400);
  });

  it("06 creates a concept-bound session and derives curriculum context", async () => {
    const response = await app.request("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conceptId,
        subjectId: "caller-supplied-wrong-subject",
        topicId: "caller-supplied-wrong-topic",
        mode: "LEARN",
        goal: `API contract learn ${suffix}`,
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    sessionIds.add(body.id);
    expect(body.conceptId).toBe(conceptId);
    expect(body.subjectId).toBe(subjectId);
    expect(body.topicId).toBe(topicId);
    expect(body.mode).toBe("LEARN");
  });

  it("07 gets a created session with structured concept context", async () => {
    const session = await prisma.studySession.create({
      data: {
        userId,
        subjectId,
        topicId,
        conceptId,
        goal: `API get session ${suffix}`,
      },
    });
    sessionIds.add(session.id);

    const response = await app.request(`/api/sessions/${session.id}`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(session.id);
    expect(body.concept.id).toBe(conceptId);
    expect(body.stats.attemptCount).toBe(0);
  });

  it("08 lists recent sessions", async () => {
    const response = await app.request("/api/sessions");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(
      body.some((session: { conceptId: string | null }) => session.conceptId === conceptId),
    ).toBe(true);
  });

  it("09 finishes an empty session with a deterministic summary", async () => {
    const session = await prisma.studySession.create({
      data: {
        userId,
        subjectId,
        topicId,
        conceptId,
        goal: `API finish empty ${suffix}`,
      },
    });
    sessionIds.add(session.id);

    const response = await app.request(`/api/sessions/${session.id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.endedAt).toBeTruthy();
    expect(body.summary).toContain("尚未记录可评分作答");
    expect(body.stats.attemptCount).toBe(0);
  });

  it("10 finishing an already-ended session is idempotent", async () => {
    const session = await prisma.studySession.create({
      data: {
        userId,
        subjectId,
        topicId,
        conceptId,
        goal: `API finish idempotent ${suffix}`,
      },
    });
    sessionIds.add(session.id);

    const first = await app.request(`/api/sessions/${session.id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const firstBody = await first.json();

    const second = await app.request(`/api/sessions/${session.id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const secondBody = await second.json();

    expect(second.status).toBe(200);
    expect(secondBody.endedAt).toBe(firstBody.endedAt);
    expect(secondBody.summary).toBe(firstBody.summary);
  });

  it("11 returns SESSION_NOT_FOUND for an unknown session", async () => {
    const response = await app.request("/api/sessions/not-a-real-session");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("12 rejects an empty custom session summary", async () => {
    const session = await prisma.studySession.create({
      data: {
        userId,
        subjectId,
        topicId,
        conceptId,
        goal: `API invalid finish ${suffix}`,
      },
    });
    sessionIds.add(session.id);

    const response = await app.request(`/api/sessions/${session.id}/finish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ summary: "" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("13 gets concept detail for an existing concept", async () => {
    const response = await app.request(`/api/concepts/${conceptId}`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.concept.id).toBe(conceptId);
    expect(body.state.mastery).toBeTypeOf("number");
    expect(Array.isArray(body.attempts)).toBe(true);
  });

  it("14 returns CONCEPT_NOT_FOUND for an unknown concept", async () => {
    const response = await app.request("/api/concepts/not-a-real-concept");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("CONCEPT_NOT_FOUND");
  });

  it("15 rejects an invalid review scope", async () => {
    const response = await app.request("/api/reviews?scope=INVALID");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("16 lists due reviews", async () => {
    const response = await app.request("/api/reviews?scope=DUE");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.some((item: { id: string }) => item.id === dueReviewId)).toBe(
      true,
    );
  });

  it("17 lists upcoming reviews", async () => {
    const response = await app.request("/api/reviews?scope=UPCOMING");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(
      body.some((item: { id: string }) => item.id === upcomingReviewId),
    ).toBe(true);
  });

  it("18 lists completed reviews", async () => {
    const response = await app.request("/api/reviews?scope=COMPLETED");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(
      body.some((item: { id: string }) => item.id === completedReviewId),
    ).toBe(true);
  });

  it("19 lists all review states", async () => {
    const response = await app.request("/api/reviews?scope=ALL");
    expect(response.status).toBe(200);
    const body = await response.json();
    const ids = new Set(body.map((item: { id: string }) => item.id));
    expect(ids.has(dueReviewId)).toBe(true);
    expect(ids.has(upcomingReviewId)).toBe(true);
    expect(ids.has(completedReviewId)).toBe(true);
  });

  it("20 rejects starting a future review", async () => {
    const response = await app.request(
      `/api/reviews/${upcomingReviewId}/start`,
      { method: "POST" },
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("REVIEW_TASK_NOT_FOUND");
  });

  it("21 rejects starting an already-completed review", async () => {
    const response = await app.request(
      `/api/reviews/${completedReviewId}/start`,
      { method: "POST" },
    );
    expect(response.status).toBe(404);
  });

  it("22 starts a due review as a bound REVIEW session", async () => {
    const response = await app.request(`/api/reviews/${dueReviewId}/start`, {
      method: "POST",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    sessionIds.add(body.id);
    expect(body.mode).toBe("REVIEW");
    expect(body.reviewTaskId).toBe(dueReviewId);
    expect(body.conceptId).toBe(conceptId);
  });

  it("23 starting the same due review reuses its open session", async () => {
    const first = await app.request(`/api/reviews/${dueReviewId}/start`, {
      method: "POST",
    });
    const firstBody = await first.json();
    sessionIds.add(firstBody.id);

    const second = await app.request(`/api/reviews/${dueReviewId}/start`, {
      method: "POST",
    });
    const secondBody = await second.json();

    expect(second.status).toBe(200);
    expect(secondBody.id).toBe(firstBody.id);
  });

  it("24 rejects an invalid mistake status filter", async () => {
    const response = await app.request("/api/mistakes?status=INVALID");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("25 lists open mistakes", async () => {
    const response = await app.request("/api/mistakes?status=OPEN");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("26 returns MISTAKE_NOT_FOUND for an unknown mistake", async () => {
    const response = await app.request("/api/mistakes/not-a-real-mistake");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("MISTAKE_NOT_FOUND");
  });

  it("27 rejects resolving an unknown mistake", async () => {
    const response = await app.request(
      "/api/mistakes/not-a-real-mistake/resolve",
      { method: "POST" },
    );
    expect(response.status).toBe(404);
  });

  it("28 rejects reopening an unknown mistake", async () => {
    const response = await app.request(
      "/api/mistakes/not-a-real-mistake/reopen",
      { method: "POST" },
    );
    expect(response.status).toBe(404);
  });

  it("29 rejects an invalid attempt correction payload", async () => {
    const response = await app.request(
      "/api/attempts/not-a-real-attempt/corrections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          correctness: 2,
          reasoning: 1,
          independence: 1,
          errorType: "NONE",
          misconceptions: [],
          feedback: "invalid because correctness is above one",
        }),
      },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("30 returns ATTEMPT_NOT_FOUND for a valid correction on an unknown attempt", async () => {
    const response = await app.request(
      "/api/attempts/not-a-real-attempt/corrections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          correctness: 1,
          reasoning: 1,
          independence: 1,
          errorType: "NONE",
          misconceptions: [],
          feedback: "Valid payload for a missing attempt.",
        }),
      },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("ATTEMPT_NOT_FOUND");
  });

  it("31 rejects an invalid mistake diagnosis correction", async () => {
    const response = await app.request(
      "/api/mistakes/not-a-real-mistake/corrections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          errorType: "NOT_AN_ERROR_TYPE",
          diagnosis: "invalid enum",
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it("32 returns MISTAKE_NOT_FOUND for a valid diagnosis correction on an unknown mistake", async () => {
    const response = await app.request(
      "/api/mistakes/not-a-real-mistake/corrections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          errorType: "MEMORY",
          misconception: "Recall failure",
          diagnosis: "Valid payload for a missing mistake.",
        }),
      },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("MISTAKE_NOT_FOUND");
  });
});
