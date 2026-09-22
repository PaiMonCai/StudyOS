"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type ReviewScope = "DUE" | "UPCOMING" | "COMPLETED";

type Review = {
  id: string;
  scheduledAt: string;
  completedAt: string | null;
  intervalDays: number;
  priority: number;
  source: string;
  status: string;
  concept: {
    id: string;
    name: string;
    topic: {
      name: string;
      subject: { name: string };
    };
  };
};

type StudySession = {
  id: string;
};

export default function ReviewsPage() {
  const router = useRouter();
  const [scope, setScope] = useState<ReviewScope>("DUE");
  const [items, setItems] = useState<Review[]>([]);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api<Review[]>(`/api/reviews?scope=${scope}`)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [scope]);

  async function startReview(reviewTaskId: string) {
    setStartingId(reviewTaskId);
    setError("");

    try {
      const session = await api<StudySession>(
        `/api/reviews/${reviewTaskId}/start`,
        {
          method: "POST",
        },
      );

      router.push(`/study?sessionId=${encodeURIComponent(session.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start review");
      setStartingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-zinc-500">Spaced review</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reviews</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          到期任务进入绑定知识点的 Review Session。只有完成针对该知识点的可评分练习，旧任务才会关闭，并根据新状态安排下一次复习。
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["DUE", "UPCOMING", "COMPLETED"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={
              scope === value
                ? "rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white"
                : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:border-zinc-300"
            }
          >
            {value === "DUE"
              ? "Due"
              : value === "UPCOMING"
                ? "Upcoming"
                : "Completed"}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/knowledge/${encodeURIComponent(item.concept.id)}`}
                  className="font-semibold hover:underline"
                >
                  {item.concept.name}
                </Link>
                <div className="mt-1 text-sm text-zinc-500">
                  {item.concept.topic.subject.name} · {item.concept.topic.name}
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  {item.source} · interval {item.intervalDays}d · priority {item.priority}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {scope === "COMPLETED"
                    ? `completed ${formatDateTime(item.completedAt)}`
                    : `scheduled ${formatDateTime(item.scheduledAt)}`}
                </div>
              </div>

              {scope === "DUE" ? (
                <button
                  type="button"
                  disabled={startingId !== null}
                  onClick={() => startReview(item.id)}
                  className="inline-flex justify-center rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startingId === item.id ? "创建复习 Session…" : "开始复习"}
                </button>
              ) : (
                <Link
                  href={`/knowledge/${encodeURIComponent(item.concept.id)}`}
                  className="inline-flex justify-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-300"
                >
                  查看知识点
                </Link>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            {scope === "DUE"
              ? "目前没有到期复习。"
              : scope === "UPCOMING"
                ? "目前没有未来复习任务。"
                : "还没有已完成复习。"}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}
