"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, percent } from "@/lib/api";

const errorTypes = [
  "NONE",
  "CONCEPTUAL",
  "CALCULATION",
  "REASONING",
  "MEMORY",
  "CONDITION",
  "MISREAD",
  "CARELESS",
  "UNKNOWN",
] as const;

type ErrorType = (typeof errorTypes)[number];

type AttemptCorrection = {
  id: string;
  correctness: number;
  reasoning: number;
  independence: number;
  errorType: ErrorType;
  misconceptions: unknown;
  feedback: string;
  note: string | null;
  score: number;
  result: string;
  createdAt: string;
};

type MistakeRevision = {
  id: string;
  before: unknown;
  after: unknown;
  note: string | null;
  createdAt: string;
};

type MistakeDetail = {
  id: string;
  errorType: ErrorType;
  severity: number;
  misconception: string | null;
  diagnosis: string | null;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  resolvedAt: string | null;
  revisions: MistakeRevision[];
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
    corrections: AttemptCorrection[];
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

type EvaluationForm = {
  correctness: string;
  reasoning: string;
  independence: string;
  errorType: ErrorType;
  misconceptions: string;
  feedback: string;
  note: string;
};

type DiagnosisForm = {
  errorType: ErrorType;
  misconception: string;
  diagnosis: string;
  note: string;
};

const emptyEvaluationForm: EvaluationForm = {
  correctness: "0",
  reasoning: "0",
  independence: "0",
  errorType: "UNKNOWN",
  misconceptions: "",
  feedback: "",
  note: "",
};

export default function MistakeDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<MistakeDetail | null>(null);
  const [evaluationForm, setEvaluationForm] =
    useState<EvaluationForm>(emptyEvaluationForm);
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosisForm>({
    errorType: "UNKNOWN",
    misconception: "",
    diagnosis: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refreshDetail() {
    if (!params.id) return;

    const loaded = await api<MistakeDetail>(
      `/api/mistakes/${encodeURIComponent(params.id)}`,
    );

    setDetail(loaded);
    hydrateForms(loaded);
  }

  function hydrateForms(loaded: MistakeDetail) {
    const effective = getEffectiveEvaluation(loaded.attempt);

    if (effective) {
      setEvaluationForm({
        correctness: String(effective.correctness),
        reasoning: String(effective.reasoning),
        independence: String(effective.independence),
        errorType: effective.errorType,
        misconceptions: effective.misconceptions.join("；"),
        feedback: effective.feedback,
        note: "",
      });
    }

    setDiagnosisForm({
      errorType: loaded.errorType,
      misconception: loaded.misconception ?? "",
      diagnosis: loaded.diagnosis ?? "",
      note: "",
    });
  }

  useEffect(() => {
    refreshDetail().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function changeStatus(action: "resolve" | "reopen") {
    if (!detail || busy) return;

    setBusy(true);
    setError("");

    try {
      await api<MistakeDetail>(
        `/api/mistakes/${encodeURIComponent(detail.id)}/${action}`,
        { method: "POST" },
      );
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mistake");
    } finally {
      setBusy(false);
    }
  }

  async function submitEvaluationCorrection(event: FormEvent) {
    event.preventDefault();
    if (!detail?.attempt || busy) return;

    setBusy(true);
    setError("");

    try {
      await api(
        `/api/attempts/${encodeURIComponent(detail.attempt.id)}/corrections`,
        {
          method: "POST",
          body: JSON.stringify({
            correctness: Number(evaluationForm.correctness),
            reasoning: Number(evaluationForm.reasoning),
            independence: Number(evaluationForm.independence),
            errorType: evaluationForm.errorType,
            misconceptions: splitMisconceptions(evaluationForm.misconceptions),
            feedback: evaluationForm.feedback,
            note: evaluationForm.note || undefined,
          }),
        },
      );

      await refreshDetail();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to correct evaluation",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitDiagnosisCorrection(event: FormEvent) {
    event.preventDefault();
    if (!detail || busy) return;

    setBusy(true);
    setError("");

    try {
      await api(
        `/api/mistakes/${encodeURIComponent(detail.id)}/corrections`,
        {
          method: "POST",
          body: JSON.stringify({
            errorType: diagnosisForm.errorType,
            misconception: diagnosisForm.misconception || undefined,
            diagnosis: diagnosisForm.diagnosis || undefined,
            note: diagnosisForm.note || undefined,
          }),
        },
      );

      await refreshDetail();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to correct diagnosis",
      );
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

  const originalEvaluation = readEvaluation(detail.attempt?.evaluation);
  const latestCorrection = detail.attempt?.corrections[0] ?? null;

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
        <Panel title="错误模式" subtitle="当前 Mistake projection">
          <div className="text-base font-medium leading-7">
            {detail.misconception || "未记录明确 misconception。"}
          </div>
        </Panel>

        <Panel title="诊断与修复方向" subtitle="当前诊断，可由用户修订">
          <div className="text-sm leading-7 text-zinc-700">
            {detail.diagnosis || "未记录诊断文本。"}
          </div>
        </Panel>
      </section>

      {detail.attempt ? (
        <Panel title="原始 Attempt" subtitle="原始证据永不覆盖；Correction 以追加记录生效">
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
              <Metric label="Original score" value={percent(detail.attempt.score)} />
              <Metric label="Original result" value={detail.attempt.result} compact />
              <Metric
                label="Difficulty"
                value={String(detail.attempt.question.difficulty)}
              />
            </div>

            {originalEvaluation.feedback ? (
              <div className="rounded-2xl border border-zinc-200 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Original evaluation
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-700">
                  {originalEvaluation.feedback}
                </div>
              </div>
            ) : null}

            {latestCorrection ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Effective correction
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-900">
                  {latestCorrection.result} · {percent(latestCorrection.score)}
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-700">
                  {latestCorrection.feedback}
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {new Date(latestCorrection.createdAt).toLocaleString()}
                </div>
              </div>
            ) : null}

            <div className="text-xs text-zinc-400">
              submitted {new Date(detail.attempt.submittedAt).toLocaleString()}
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

      {detail.attempt ? (
        <Panel
          title="纠正系统评分"
          subtitle="保存为 AttemptCorrection；原 Attempt 不会被修改，Learner Model 会确定性重投影"
        >
          <form onSubmit={submitEvaluationCorrection} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <ScoreInput
                label="Correctness"
                value={evaluationForm.correctness}
                onChange={(value) =>
                  setEvaluationForm((current) => ({
                    ...current,
                    correctness: value,
                  }))
                }
              />
              <ScoreInput
                label="Reasoning"
                value={evaluationForm.reasoning}
                onChange={(value) =>
                  setEvaluationForm((current) => ({
                    ...current,
                    reasoning: value,
                  }))
                }
              />
              <ScoreInput
                label="Independence"
                value={evaluationForm.independence}
                onChange={(value) =>
                  setEvaluationForm((current) => ({
                    ...current,
                    independence: value,
                  }))
                }
              />
            </div>

            <SelectErrorType
              value={evaluationForm.errorType}
              onChange={(value) =>
                setEvaluationForm((current) => ({
                  ...current,
                  errorType: value,
                }))
              }
            />

            <Field
              label="Misconceptions"
              hint="多个错误点用分号或换行分隔"
              value={evaluationForm.misconceptions}
              onChange={(value) =>
                setEvaluationForm((current) => ({
                  ...current,
                  misconceptions: value,
                }))
              }
            />

            <Field
              label="Feedback"
              value={evaluationForm.feedback}
              onChange={(value) =>
                setEvaluationForm((current) => ({
                  ...current,
                  feedback: value,
                }))
              }
            />

            <Field
              label="Correction note"
              hint="可选：为什么要纠正系统判断"
              value={evaluationForm.note}
              onChange={(value) =>
                setEvaluationForm((current) => ({
                  ...current,
                  note: value,
                }))
              }
            />

            <button
              type="submit"
              disabled={busy || !evaluationForm.feedback.trim()}
              className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              保存评分纠正并重算学习状态
            </button>
          </form>

          {detail.attempt.corrections.length ? (
            <AuditHistory
              title="Evaluation correction history"
              items={detail.attempt.corrections.map((item) => ({
                id: item.id,
                createdAt: item.createdAt,
                text: `${item.result} · ${percent(item.score)} · ${item.errorType}`,
                note: item.note,
              }))}
            />
          ) : null}
        </Panel>
      ) : null}

      <Panel
        title="纠正错误诊断"
        subtitle="只修订 Mistake 的当前解释；不会改变 mastery 或历史 Attempt"
      >
        <form onSubmit={submitDiagnosisCorrection} className="space-y-5">
          <SelectErrorType
            value={diagnosisForm.errorType}
            onChange={(value) =>
              setDiagnosisForm((current) => ({
                ...current,
                errorType: value,
              }))
            }
          />

          <Field
            label="Misconception"
            value={diagnosisForm.misconception}
            onChange={(value) =>
              setDiagnosisForm((current) => ({
                ...current,
                misconception: value,
              }))
            }
          />

          <Field
            label="Diagnosis"
            value={diagnosisForm.diagnosis}
            onChange={(value) =>
              setDiagnosisForm((current) => ({
                ...current,
                diagnosis: value,
              }))
            }
          />

          <Field
            label="Revision note"
            hint="可选：说明为什么修订诊断"
            value={diagnosisForm.note}
            onChange={(value) =>
              setDiagnosisForm((current) => ({
                ...current,
                note: value,
              }))
            }
          />

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:border-zinc-400 disabled:opacity-50"
          >
            保存诊断修订
          </button>
        </form>

        {detail.revisions.length ? (
          <AuditHistory
            title="Mistake revision history"
            items={detail.revisions.map((item) => ({
              id: item.id,
              createdAt: item.createdAt,
              text: formatRevision(item.after),
              note: item.note,
            }))}
          />
        ) : null}
      </Panel>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">下一步</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Resolve/reopen 只管理“这个错误是否仍需关注”。Evaluation Correction 才会改变当前 Learner Model；Mistake Revision 只改变诊断文本。三种操作彼此分离，避免一个按钮同时改多个含义不同的状态。
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
      {subtitle ? <p className="mt-1 text-xs leading-5 text-zinc-400">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <input
        type="number"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
      />
    </label>
  );
}

function SelectErrorType({
  value,
  onChange,
}: {
  value: ErrorType;
  onChange: (value: ErrorType) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">Error type</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ErrorType)}
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
      >
        {errorTypes.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {hint ? <span className="ml-2 text-xs text-zinc-400">{hint}</span> : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm leading-6 outline-none focus:border-zinc-400"
      />
    </label>
  );
}

function AuditHistory({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    createdAt: string;
    text: string;
    note: string | null;
  }>;
}) {
  return (
    <div className="mt-8 border-t border-zinc-100 pt-5">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-zinc-50 p-3">
            <div className="text-sm text-zinc-700">{item.text}</div>
            {item.note ? (
              <div className="mt-1 text-xs text-zinc-500">{item.note}</div>
            ) : null}
            <div className="mt-1 text-xs text-zinc-400">
              {new Date(item.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function readEvaluation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      correctness: 0,
      reasoning: 0,
      independence: 0,
      errorType: "UNKNOWN" as ErrorType,
      misconceptions: [] as string[],
      feedback: "",
    };
  }

  const object = value as Record<string, unknown>;
  const errorType =
    typeof object.errorType === "string" &&
    errorTypes.includes(object.errorType as ErrorType)
      ? (object.errorType as ErrorType)
      : "UNKNOWN";

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

function getEffectiveEvaluation(attempt: MistakeDetail["attempt"]) {
  if (!attempt) return null;

  const correction = attempt.corrections[0];
  if (correction) {
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

  return readEvaluation(attempt.evaluation);
}

function splitMisconceptions(value: string) {
  return value
    .split(/[；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRevision(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Updated diagnosis";
  }

  const object = value as Record<string, unknown>;
  const type =
    typeof object.errorType === "string" ? object.errorType : "UNKNOWN";
  const misconception =
    typeof object.misconception === "string" ? object.misconception : "";

  return misconception ? `${type} · ${misconception}` : type;
}
