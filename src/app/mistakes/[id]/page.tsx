"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, percent } from "@/lib/api";

type MistakeDetail = {
  id: string;
  errorType: string;
  severity: number;
  misconception: string | null;
  diagnosis: string | null;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
  concept: {
    id: string;
    name: string;
    topic: {
      name: string;
      subject: {
        name: string;
      };
    };
  };
  learningState: {
    mastery: number;
    confidence: number;
    attemptCount: number;
    correctCount: number;
    nextReviewAt: string | null;
  } | null;
  attempt: {
    id: string;
    answer: string;
    score: number;
    result: string;
    evaluation: unknown;
    submittedAt: string;
    question: {
      id: string;
      stem: string;
      answer: string;
      explanation: string | null;
      type: string;
      difficulty: number;
    };
    session: {
      id: string;
      mode: string;
      startedAt: string;
      endedAt: string | null;
      summary: string | null;
    } | null;
  } | null;
};

export default function MistakeDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<MistakeDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;

    api<MistakeDetail>(`/api/mistakes/${encodeURIComponent(params.id)}`)
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [params.id]);

  async function changeStatus(action: "resolve" | "reopen") {
    if (!detail || busy) return;

    setBusy(true);
    setError("");

    try {
      const updated = await api<MistakeDetail>(
        `/api/mistakes/${encodeURIComponent(detail.id)}/${action}`,
        { method: "POST" },
      );
      setDetail(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mistake");
    } finally {
      setBusy(false);
    }
  }

  if (!detail && !error) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-sm text-zinc-500 shadow-sm">
        正在读取 Mistake…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-5">
        <Link href="/mistakes" className="text-sm text-zinc-500 hover:text-zinc-950">
          ← 返回 Mistakes
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const evaluation = readEvaluation(detail.attempt?.evaluation);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/mistakes" className="text-sm text-zinc-500 hover:text-zinc-950">
          ← Mistakes
        </Link>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                {detail.errorType}
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                {detail.status}
              </span>
              <span className="text-xs text-zinc-400">
                severity {percent(detail.severity)}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {detail.concept.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {detail.concept.topic.subject.name} · {detail.concept.topic.name}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              changeStatus(detail.status === "OPEN" ? "resolve" : "reopen")
            }
            className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "处理中…"
              : detail.status === "OPEN"
                ? "标记为已解决"
                : "重新打开"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="当前 Mastery"
          value={detail.learningState ? percent(detail.learningState.mastery) : "30% baseline"}
        />
        <Metric
          label="Confidence"
          value={detail.learningState ? percent(detail.learningState.confidence) : "30% baseline"}
        />
        <Metric
          label="Next review"
          value={
            detail.learningState?.nextReviewAt
              ? new Date(detail.learningState.nextReviewAt).toLocaleDateString()
              : "—"
          }
          compact
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="错误模式" subtitle="可复用的 misconception">
          <div className="text-base font-medium leading-7">
            {detail.misconception || "未记录明确 misconception。"}
          </div>
        </Panel>

        <Panel title="诊断与修复方向" subtitle="Agent 当时生成的 feedback">
          <div className="text-sm leading-7 text-zinc-700">
            {detail.diagnosis || "未记录诊断文本。"}
          </div>
        </Panel>
      </section>

      {detail.attempt ? (
        <Panel title="原始 Attempt" subtitle="历史证据保持不变">
          <div className="space-y-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Question
              </div>
              <div className="mt-2 text-sm font-medium leading-6">
                {detail.attempt.question.stem}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Your answer
              </div>
              <div className="mt-2 rounded-2xl bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">
                {detail.attempt.answer}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Score" value={percent(detail.attempt.score)} />
              <Metric label="Result" value={detail.attempt.result} compact />
              <Metric
                label="Difficulty"
                value={String(detail.attempt.question.difficulty)}
              />
            </div>

            {evaluation.feedback ? (
              <div className="rounded-2xl border border-zinc-200 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Evaluation feedback
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-700">
                  {evaluation.feedback}
                </div>
              </div>
            ) : null}

            <div className="text-xs text-zinc-400">
              {new Date(detail.attempt.submittedAt).toLocaleString()}
            </div>
          </div>
        </Panel>
      ) : (
        <Panel title="原始 Attempt">
          <div className="text-sm text-zinc-500">
            该 Mistake 当前没有关联 Attempt；可能来自未来的手动诊断或数据迁移。
          </div>
        </Panel>
      )}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">下一步</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Resolve/reopen 只是管理错误是否仍需关注，不会改变历史证据或 mastery。若系统对这次作答的评分本身有误，后续需要使用 Evaluation Correction，而不是 Resolve。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={`/knowledge/${encodeURIComponent(detail.concept.id)}`}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-300"
          >
            查看知识点证据
          </Link>
          {detail.attempt?.session ? (
            <Link
              href={`/study?sessionId=${encodeURIComponent(detail.attempt.session.id)}`}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-300"
            >
              查看原 Session
            </Link>
          ) : null}
        </div>
      </section>
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
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function readEvaluation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { feedback: "" };
  }

  const object = value as Record<string, unknown>;
  return {
    feedback: typeof object.feedback === "string" ? object.feedback : "",
  };
}
