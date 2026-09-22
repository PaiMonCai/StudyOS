"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Review = {
  id: string;
  scheduledAt: string;
  intervalDays: number;
  priority: number;
  source: string;
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
  const [items, setItems] = useState<Review[]>([]);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Review[]>("/api/reviews/today")
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

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
        <p className="mt-2 text-sm text-zinc-600">
          到期任务会创建一个绑定知识点的 Review Session；完成针对该知识点的练习后，系统才会关闭旧任务并安排下一次复习。
        </p>
      </header>

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
              <div>
                <div className="font-semibold">{item.concept.name}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {item.concept.topic.subject.name} · {item.concept.topic.name}
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  {item.source} · interval {item.intervalDays}d · priority {item.priority}
                </div>
              </div>

              <button
                type="button"
                disabled={startingId !== null}
                onClick={() => startReview(item.id)}
                className="inline-flex justify-center rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {startingId === item.id ? "创建复习 Session…" : "开始复习"}
              </button>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            目前没有到期复习。
          </div>
        )}
      </div>
    </div>
  );
}
