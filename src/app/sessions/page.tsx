"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type SessionItem = {
  id: string;
  goal: string | null;
  mode: string;
  summary: string | null;
  startedAt: string;
  endedAt: string | null;
  subject: { name: string } | null;
  topic: { name: string } | null;
  concept: { id: string; name: string } | null;
  reviewTask: {
    id: string;
    status: string;
    source: string;
  } | null;
  _count: {
    attempts: number;
    learningEvents: number;
  };
};

export default function SessionsPage() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<SessionItem[]>("/api/sessions")
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-zinc-500">Learning history</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sessions</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          每个 Session 是一次有明确开始与结束边界的学习过程。已结束 Session 可以回看总结；未结束 Session 可以继续进入。
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {items.length ? (
          items.map((session) => (
            <Link
              key={session.id}
              href={`/study?sessionId=${encodeURIComponent(session.id)}`}
              className="block rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                      {session.mode}
                    </span>
                    <span
                      className={
                        session.endedAt
                          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                          : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                      }
                    >
                      {session.endedAt ? "Completed" : "Active"}
                    </span>
                    {session.reviewTask ? (
                      <span className="text-xs text-zinc-400">
                        Review · {session.reviewTask.status}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-lg font-semibold">
                    {session.concept?.name ||
                      session.goal ||
                      session.topic?.name ||
                      "Untitled Study Session"}
                  </h2>

                  {(session.subject || session.topic) ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {[session.subject?.name, session.topic?.name]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}

                  {session.summary ? (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-600">
                      {session.summary}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-400">
                      {session.endedAt
                        ? "该 Session 没有保存总结。"
                        : "Session 仍在进行中。"}
                    </p>
                  )}

                  <div className="mt-3 text-xs text-zinc-400">
                    {session._count.attempts} attempts ·{" "}
                    {session._count.learningEvents} events
                  </div>
                </div>

                <div className="shrink-0 text-right text-xs text-zinc-400">
                  <div>{new Date(session.startedAt).toLocaleString()}</div>
                  {session.endedAt ? (
                    <div className="mt-1">
                      ended {new Date(session.endedAt).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            还没有 Study Session。
          </div>
        )}
      </div>
    </div>
  );
}
