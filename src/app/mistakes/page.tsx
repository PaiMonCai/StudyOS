"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, percent } from "@/lib/api";

type MistakeItem = {
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
  attempt: {
    id: string;
    score: number;
    result: string;
    submittedAt: string;
    question: {
      id: string;
      stem: string;
      type: string;
      difficulty: number;
    };
  } | null;
};

export default function MistakesPage() {
  const [items, setItems] = useState<MistakeItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("OPEN");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = filter === "ALL" ? "" : `?status=${filter}`;

    api<MistakeItem[]>(`/api/mistakes${query}`)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [filter]);

  const stats = useMemo(() => {
    const open = items.filter((item) => item.status === "OPEN").length;
    const resolved = items.filter((item) => item.status === "RESOLVED").length;
    return { open, resolved };
  }, [items]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-zinc-500">Error diagnosis</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Mistakes</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          Mistake 是对一次作答中“可复用错误模式”的诊断。Resolve 只表示你已经处理这个错误，不会修改历史 Attempt，也不会自动重算 mastery。
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["OPEN", "RESOLVED", "ALL"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? "rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white"
                : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:border-zinc-300"
            }
          >
            {value === "OPEN" ? "Open" : value === "RESOLVED" ? "Resolved" : "All"}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <Metric label="当前列表 Open" value={String(stats.open)} />
        <Metric label="当前列表 Resolved" value={String(stats.resolved)} />
      </section>

      <div className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/mistakes/${encodeURIComponent(item.id)}`}
              className="block rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {item.errorType}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                      {item.status}
                    </span>
                    <span className="text-xs text-zinc-400">
                      severity {percent(item.severity)}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold">{item.concept.name}</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.concept.topic.subject.name} · {item.concept.topic.name}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-zinc-700">
                    {item.misconception || item.diagnosis || "没有进一步诊断文本。"}
                  </p>

                  {item.attempt ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">
                      题目：{item.attempt.question.stem}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 text-xs text-zinc-400">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            当前筛选下没有 Mistake。
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
