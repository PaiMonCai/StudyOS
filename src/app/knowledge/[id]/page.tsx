"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, percent } from "@/lib/api";

type ConceptDetail = {
  concept: {
    id: string;
    name: string;
    description: string | null;
    difficulty: number;
    topic: {
      id: string;
      name: string;
      subject: {
        id: string;
        name: string;
      };
    };
  };
  state: {
    mastery: number;
    confidence: number;
    attemptCount: number;
    correctCount: number;
    lastStudiedAt: string | null;
    lastReviewedAt?: string | null;
    nextReviewAt: string | null;
  };
  prerequisites: Array<{
    conceptId: string;
    name: string;
    mastery: number;
    strength: number;
  }>;
  dependents: Array<{
    conceptId: string;
    name: string;
    mastery: number;
    strength: number;
  }>;
  attempts: Array<{
    id: string;
    answer: string;
    score: number;
    result: "CORRECT" | "PARTIAL" | "INCORRECT";
    evaluation: unknown;
    submittedAt: string;
    question: {
      id: string;
      stem: string;
      type: string;
      difficulty: number;
    };
  }>;
  mistakes: Array<{
    id: string;
    errorType: string;
    severity: number;
    misconception: string | null;
    diagnosis: string | null;
    status: string;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    type: string;
    score: number | null;
    createdAt: string;
  }>;
  reviewTasks: Array<{
    id: string;
    status: string;
    source: string;
    scheduledAt: string;
    completedAt: string | null;
    intervalDays: number;
    priority: number;
  }>;
  masteryHistory: Array<{
    eventId: string;
    createdAt: string;
    score: number | null;
    oldMastery: number;
    newMastery: number;
    delta: number;
  }>;
};

type Session = {
  id: string;
};

export default function ConceptDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ConceptDetail | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    api<ConceptDetail>(`/api/concepts/${encodeURIComponent(params.id)}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [params.id]);

  async function startLearning() {
    if (!detail || starting) return;

    setStarting(true);
    setError("");

    try {
      const session = await api<Session>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          conceptId: detail.concept.id,
          mode: "LEARN",
          goal: `Learn ${detail.concept.name}`,
        }),
      });

      router.push(`/study?sessionId=${encodeURIComponent(session.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStarting(false);
    }
  }

  if (!detail && !error) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-sm text-zinc-500 shadow-sm">
        正在读取 Learner Model…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-5">
        <Link href="/knowledge" className="text-sm text-zinc-500 hover:text-zinc-950">
          ← 返回 Knowledge
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const latestMasteryChange = detail.masteryHistory[0];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link href="/knowledge" className="text-sm text-zinc-500 hover:text-zinc-950">
          ← {detail.concept.topic.subject.name} · {detail.concept.topic.name}
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Concept detail</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {detail.concept.name}
            </h1>
            {detail.concept.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                {detail.concept.description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            disabled={starting}
            onClick={startLearning}
            className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {starting ? "创建 Session…" : "学习这个知识点"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Mastery" value={percent(detail.state.mastery)} />
        <Metric label="Confidence" value={percent(detail.state.confidence)} />
        <Metric label="Attempts" value={String(detail.state.attemptCount)} />
        <Metric
          label="Next review"
          value={formatDate(detail.state.nextReviewAt)}
          compact
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="为什么是这个掌握度？" subtitle="最近的结构化学习证据">
          {latestMasteryChange ? (
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <span className="text-2xl font-semibold">
                  {percent(latestMasteryChange.oldMastery)}
                </span>
                <span className="pb-1 text-zinc-400">→</span>
                <span className="text-2xl font-semibold">
                  {percent(latestMasteryChange.newMastery)}
                </span>
              </div>
              <div className="text-sm leading-6 text-zinc-600">
                最近一次可评分作答使 mastery{" "}
                <strong>
                  {latestMasteryChange.delta >= 0 ? "提高" : "降低"}{" "}
                  {Math.abs(Math.round(latestMasteryChange.delta * 100))} 个百分点
                </strong>
                。表现分数为{" "}
                {latestMasteryChange.score === null
                  ? "—"
                  : percent(latestMasteryChange.score)}
                。
              </div>
              <div className="text-xs text-zinc-400">
                {formatDateTime(latestMasteryChange.createdAt)}
              </div>
            </div>
          ) : (
            <Empty>还没有可用于解释 mastery 变化的作答证据。</Empty>
          )}
        </Panel>

        <Panel title="前置知识" subtitle="当前知识点依赖什么">
          <ConceptRelations items={detail.prerequisites} empty="没有已建模的前置知识。" />
        </Panel>
      </section>

      {detail.dependents.length ? (
        <Panel title="后续知识" subtitle="哪些知识点依赖它">
          <ConceptRelations items={detail.dependents} empty="" />
        </Panel>
      ) : null}

      <Panel title="最近作答" subtitle="Attempt 是原始学习证据，不会因算法更新被覆盖">
        {detail.attempts.length ? (
          <div className="divide-y divide-zinc-100">
            {detail.attempts.map((attempt) => {
              const evaluation = readEvaluation(attempt.evaluation);

              return (
                <article key={attempt.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ResultBadge result={attempt.result} />
                      <span className="text-xs text-zinc-400">
                        {attempt.question.type} · difficulty {attempt.question.difficulty}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-zinc-600">
                      {percent(attempt.score)}
                    </div>
                  </div>

                  <div className="mt-3 text-sm font-medium leading-6">
                    {attempt.question.stem}
                  </div>
                  <div className="mt-2 rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
                    {attempt.answer}
                  </div>

                  {evaluation.feedback ? (
                    <div className="mt-3 text-sm leading-6 text-zinc-600">
                      <span className="font-medium text-zinc-800">Feedback：</span>
                      {evaluation.feedback}
                    </div>
                  ) : null}

                  {evaluation.misconceptions.length ? (
                    <div className="mt-2 text-sm text-amber-700">
                      Misconception：{evaluation.misconceptions.join("；")}
                    </div>
                  ) : null}

                  <div className="mt-2 text-xs text-zinc-400">
                    {formatDateTime(attempt.submittedAt)}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty>还没有作答记录。</Empty>
        )}
      </Panel>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="错误诊断" subtitle="Mistake history">
          {detail.mistakes.length ? (
            <div className="space-y-3">
              {detail.mistakes.map((mistake) => (
                <article key={mistake.id} className="rounded-2xl bg-zinc-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-amber-700">
                      {mistake.errorType}
                    </span>
                    <span className="text-xs text-zinc-400">{mistake.status}</span>
                  </div>
                  {mistake.misconception ? (
                    <div className="mt-2 text-sm font-medium leading-6">
                      {mistake.misconception}
                    </div>
                  ) : null}
                  {mistake.diagnosis ? (
                    <div className="mt-2 text-sm leading-6 text-zinc-600">
                      {mistake.diagnosis}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs text-zinc-400">
                    severity {percent(mistake.severity)} · {formatDateTime(mistake.createdAt)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty>没有已记录的错误诊断。</Empty>
          )}
        </Panel>

        <Panel title="复习记录" subtitle="ReviewTask lifecycle">
          {detail.reviewTasks.length ? (
            <div className="space-y-3">
              {detail.reviewTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 p-3">
                  <div>
                    <div className="text-sm font-medium">
                      {task.status} · {task.source}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      scheduled {formatDateTime(task.scheduledAt)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <div>{task.intervalDays}d</div>
                    <div>priority {task.priority}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>还没有复习任务记录。</Empty>
          )}
        </Panel>
      </section>

      <Panel title="Learning Event Timeline" subtitle="最近 50 条结构化学习事件">
        {detail.events.length ? (
          <div className="divide-y divide-zinc-100">
            {detail.events.slice(0, 20).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="text-sm font-medium">{event.type}</div>
                <div className="text-right text-xs text-zinc-400">
                  {event.score === null ? "" : `score ${percent(event.score)} · `}
                  {formatDateTime(event.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>还没有 LearningEvent。</Empty>
        )}
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`mt-2 font-semibold tracking-tight ${compact ? "text-lg" : "text-3xl"}`}>
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ConceptRelations({
  items,
  empty,
}: {
  items: Array<{
    conceptId: string;
    name: string;
    mastery: number;
    strength: number;
  }>;
  empty: string;
}) {
  if (!items.length) return <Empty>{empty}</Empty>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.conceptId}
          href={`/knowledge/${encodeURIComponent(item.conceptId)}`}
          className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 p-3 transition hover:border-zinc-300"
        >
          <div>
            <div className="text-sm font-medium">{item.name}</div>
            <div className="mt-1 text-xs text-zinc-400">
              relation strength {item.strength.toFixed(1)}
            </div>
          </div>
          <div className="font-mono text-sm text-zinc-600">{percent(item.mastery)}</div>
        </Link>
      ))}
    </div>
  );
}

function ResultBadge({ result }: { result: "CORRECT" | "PARTIAL" | "INCORRECT" }) {
  const label =
    result === "CORRECT" ? "Correct" : result === "PARTIAL" ? "Partial" : "Incorrect";

  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-3 text-sm text-zinc-500">{children}</div>;
}

function readEvaluation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { feedback: "", misconceptions: [] as string[] };
  }

  const object = value as Record<string, unknown>;

  return {
    feedback: typeof object.feedback === "string" ? object.feedback : "",
    misconceptions: Array.isArray(object.misconceptions)
      ? object.misconceptions.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
