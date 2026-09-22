"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Session = {
  id: string;
};

export default function StudyPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [goal, setGoal] = useState("帮我诊断一个目前薄弱的知识点，并用一道题确认理解。");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startSession() {
    setBusy(true);
    setError("");

    try {
      const session = await api<Session>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          goal,
          mode: "LEARN",
        }),
      });

      setSessionId(session.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || !input.trim() || busy) return;

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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-zinc-500">Study session</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Study Agent</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
          先创建 Session。之后你可以直接说“讲讲期望效用”“今天该复习什么”或回答 Agent 提出的问题。
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
          <div className="border-b border-zinc-100 px-5 py-3 text-xs text-zinc-500">
            Session {sessionId}
          </div>

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
                Session 已创建。发送第一条消息开始学习。
              </div>
            )}

            {busy ? (
              <div className="mr-auto rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                StudyOS 正在判断下一步…
              </div>
            ) : null}
          </div>

          <form onSubmit={send} className="border-t border-zinc-100 p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="例如：我总是分不清期望效用和期望值的效用。"
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
