"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, percent } from "@/lib/api";

type Knowledge = Array<{
  id: string;
  name: string;
  topics: Array<{
    id: string;
    name: string;
    concepts: Array<{
      id: string;
      name: string;
      mastery: number;
      confidence: number;
      difficulty: number;
      nextReviewAt: string | null;
    }>;
  }>;
}>;

export default function KnowledgePage() {
  const [subjects, setSubjects] = useState<Knowledge>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Knowledge>("/api/knowledge")
      .then(setSubjects)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-zinc-500">Learner model</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          这里展示的是长期学习状态，不是聊天记录。
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-6">
        {subjects.map((subject) => (
          <section
            key={subject.id}
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">{subject.name}</h2>

            <div className="mt-6 space-y-7">
              {subject.topics.map((topic) => (
                <div key={topic.id}>
                  <h3 className="text-sm font-semibold text-zinc-500">
                    {topic.name}
                  </h3>
                  <div className="mt-3 divide-y divide-zinc-100">
                    {topic.concepts.map((concept) => (
                      <div
                        key={concept.id}
                        className="grid gap-3 py-3 sm:grid-cols-[1fr_180px_80px] sm:items-center"
                      >
                        <div>
                          <Link
                            href={`/knowledge/${encodeURIComponent(concept.id)}`}
                            className="font-medium hover:underline"
                          >
                            {concept.name}
                          </Link>
                          <div className="mt-1 text-xs text-zinc-400">
                            Difficulty {concept.difficulty}
                          </div>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-800"
                            style={{ width: percent(concept.mastery) }}
                          />
                        </div>
                        <div className="font-mono text-sm text-zinc-600 sm:text-right">
                          {percent(concept.mastery)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
