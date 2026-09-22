"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, percent } from "@/lib/api";

type Dashboard = {
  masteryAverage: number;
  trackedConcepts: number;
  dueReviews: number;
  weakConcepts: Array<{
    mastery: number;
    concept: {
      id: string;
      name: string;
      topic: {
        name: string;
        subject: { name: string };
      };
    };
  }>;
  dueReviewItems: Array<{
    id: string;
    scheduledAt: string;
    priority: number;
    concept: {
      name: string;
      topic: { subject: { name: string } };
    };
  }>;
  recentSessions: Array<{
    id: string;
    goal: string | null;
    mode: string;
    startedAt: string;
    endedAt: string | null;
    subject: { name: string } | null;
    topic: { name: string } | null;
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-zinc-500">Overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          今天最值得学什么？
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          StudyOS 根据掌握度、错题和复习时间，把学习状态变成下一步行动。
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="平均掌握度"
          value={data ? percent(data.masteryAverage) : "—"}
        />
        <Metric
          label="追踪知识点"
          value={data ? String(data.trackedConcepts) : "—"}
        />
        <Metric
          label="今日到期复习"
          value={data ? String(data.dueReviews) : "—"}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-500">Needs attention</p>
              <h2 className="mt-1 text-xl font-semibold">薄弱知识点</h2>
            </div>
            <Link
              href="/knowledge"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              查看知识树 →
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {data?.weakConcepts.length ? (
              data.weakConcepts.map((item) => (
                <div key={item.concept.id}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <div className="font-medium">{item.concept.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {item.concept.topic.subject.name} · {item.concept.topic.name}
                      </div>
                    </div>
                    <div className="font-mono text-zinc-600">
                      {percent(item.mastery)}
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-800"
                      style={{ width: percent(item.mastery) }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <Empty>暂无薄弱状态。先完成一次学习 Session。</Empty>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-zinc-950 p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-zinc-400">Start</p>
          <h2 className="mt-1 text-xl font-semibold">开始一次学习 Session</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Agent 会先判断是解释、诊断还是复习，而不是默认给一篇长回答。
          </p>
          <Link
            href="/study"
            className="mt-8 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            开始学习
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Review queue</p>
            <h2 className="mt-1 text-xl font-semibold">今天到期</h2>
          </div>
          <Link href="/reviews" className="text-sm text-zinc-600 hover:text-zinc-950">
            全部复习 →
          </Link>
        </div>

        <div className="mt-5 divide-y divide-zinc-100">
          {data?.dueReviewItems.length ? (
            data.dueReviewItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="font-medium">{item.concept.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {item.concept.topic.subject.name}
                  </div>
                </div>
                <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                  Priority {item.priority}
                </div>
              </div>
            ))
          ) : (
            <Empty>现在没有到期复习。</Empty>
          )}
        </div>
      </section>
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

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-5 text-sm text-zinc-500">{children}</div>;
}
