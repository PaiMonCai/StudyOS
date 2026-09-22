"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Review[]>("/api/reviews/today")
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-zinc-500">Spaced review</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reviews</h1>
        <p className="mt-2 text-sm text-zinc-600">
          V0.1 使用透明的掌握度区间安排复习，后续可替换为更成熟的调度模型。
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

              <Link
                href="/study"
                className="inline-flex rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                开始复习
              </Link>
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
