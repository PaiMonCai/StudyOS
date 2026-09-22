"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type SessionStats = {
  attemptCount: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  mistakeCount: number;
  concepts: string[];
  masteryDelta: number;
};

type Session = {
  id: string;
  mode: "LEARN" | "REVIEW" | "QUIZ" | "FREE_CHAT";
  goal: string | null;
  summary: string | null;
  endedAt: string | null;
  stats?: SessionStats;
  concept: {
    id: string;
    name: string;
    topic: {
      name: string;
      subject: {
        name: string;
      };
    };
  } | null;
  reviewTask: {
    id: string;
    source: string;
    priority: number;
    scheduledAt: string;
  } | null;
};

export default function StudyPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [goal, setGoal] = useState("帮我诊断一个目前薄弱的知识点，并用一道题确认理解。");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("sessionId");

    if (!id) {
      setHydrating(false);
      return;
    }

    setBusy(true);

    api<Session>(`/api/sessions/${encodeURIComponent(id)}`)
      .then((loaded) => {
        setSessionId(loaded.id);
        setSession(loaded);

        if (!loaded.endedAt && loaded.mode === "REVIEW" && loaded.concept) {
          setInput("开始复习");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setBusy(false);
        setHydrating(false);
      });
  }, []);

  async function startSession() {
    setBusy(true);
    setError("");

    try {
      const created = await api<Session>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          goal,
          mode: "LEARN",
        }),
      });

      setSessionId(created.id);
      setSession(created);
      setMessages([]);
      window.history.replaceState(
        null,
        "",
        `/study?sessionId=${encodeURIComponent(created.id)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setBusy(false);
    }
  }

  async function finishSession() {
    if (!sessionId || busy || session?.endedAt) return;

    setBusy(true);
    setError("");

    try {
      const finished = await api<Session>(
        `/api/sessions/${encodeURIComponent(sessionId)}/finish`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      setSession(finished);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finish session");
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || session?.endedAt || !input.trim() || busy) return;

    const message = input.trim();
    const history = messages;
    setInput("");
    setMessages((current) => [
      ...current,
      { role: "user", content: message },
    ]);
    setBusy(true);
    setError("");

    try {
      const response = await api<{ output: string }>("/api/agent/message", {
        method: "POST",
        body: JSON.stringify({
          sessionId,
          message,
          history,
        }),
      });

      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.output },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent request failed");
    } finally {
      setBusy(false);
    }
  }

  if (hydrating) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-sm text-zinc-500 shadow-sm">
        正在恢复 Study Session…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-zinc-500">Study session</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Study Agent</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Session 会保存长期学习上下文的引用。刷新页面仍能恢复 Session、知识点和结束状态；聊天 transcript 的持久化仍在后续阶段。
        </p>
      </header>

      {!sessionId ? (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="text-sm font-medium">本次目标</label>
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="mt-3 min-h-28 w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 outline-none transition focus:border-zinc-400"
          />
          <button
            type="button"
            disabled={busy}
            onClick={startSession}
            className="mt-4 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "创建中…" : "开始 Session"}
          </button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {session?.mode ?? "LEARN"} · {session?.endedAt ? "Completed" : "Active"}
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-700">
                  {session?.concept
                    ? session.concept.name
                    : session?.goal || "Open study session"}
                </div>
                {session?.concept ? (
                  <div className="mt-1 text-xs text-zinc-500">
                    {session.concept.topic.subject.name} · {session.concept.topic.name}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {session?.reviewTask ? (
                  <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Review · priority {session.reviewTask.priority}
                  </div>
                ) : null}

                {!session?.endedAt ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={finishSession}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950 disabled:opacity-50"
                  >
                    {busy ? "处理中…" : "结束 Session"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {session?.endedAt ? (
            <SessionSummary session={session} />
          ) : (
            <>
              <div className="min-h-[420px] space-y-4 p-5">
                {messages.length ? (
                  messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={
                        message.role === "user"
                          ? "ml-auto max-w-2xl rounded-2xl bg-zinc-950 px-4 py-3 text-sm leading-6 text-white"
                          : "mr-auto max-w-3xl whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-3 text-sm leading-6 text-zinc-800"
                      }
                    >
                      {message.content}
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-sm text-zinc-400">
                    {session?.mode === "REVIEW" && session.concept
                      ? `这是「${session.concept.name}」的复习 Session。发送“开始复习”，StudyOS 会先读取当前学习状态再决定诊断方式。`
                      : "Session 已创建。发送第一条消息开始学习。"}
                  </div>
                )}

                {busy ? (
                  <div className="mr-auto rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                    StudyOS 正在处理…
                  </div>
                ) : null}
              </div>

              <form onSubmit={send} className="border-t border-zinc-100 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      session?.mode === "REVIEW"
                        ? "发送“开始复习”，或直接回答 StudyOS 的问题。"
                        : "例如：我总是分不清期望效用和期望值的效用。"
                    }
                    className="min-h-12 flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-zinc-400"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="self-end rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    发送
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function SessionSummary({ session }: { session: Session }) {
  const stats = session.stats;

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Session summary
        </p>
        <h2 className="mt-1 text-xl font-semibold">本次学习已结束</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
          {session.summary || "本次 Session 没有生成总结。"}
        </p>
      </div>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryMetric label="作答" value={String(stats.attemptCount)} />
          <SummaryMetric label="正确" value={String(stats.correctCount)} />
          <SummaryMetric label="部分正确" value={String(stats.partialCount)} />
          <SummaryMetric label="错误诊断" value={String(stats.mistakeCount)} />
        </div>
      ) : null}

      {stats?.concepts.length ? (
        <div className="rounded-2xl bg-zinc-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Practiced concepts
          </div>
          <div className="mt-2 text-sm text-zinc-700">
            {stats.concepts.join(" · ")}
          </div>
        </div>
      ) : null}

      <div className="text-xs text-zinc-400">
        结束时间：{session.endedAt ? new Date(session.endedAt).toLocaleString() : "—"}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
