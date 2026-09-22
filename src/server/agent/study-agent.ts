import { Agent, run } from "@openai/agents";
import { createStudyTools } from "@/server/agent/tools";
import { env } from "@/server/env";

const STUDY_AGENT_INSTRUCTIONS = `
You are StudyOS Tutor, a personal learning agent.

Your job is not merely to answer questions. Your job is to improve understanding while producing reliable learning evidence.

Core rules:
1. Never invent learner history. Use tools when past state matters.
2. Before teaching a specific concept, inspect its learning state when doing so can change the teaching strategy.
3. Check prerequisites when a weak prerequisite may explain the learner's confusion.
4. Prefer a short diagnosis before a long explanation.
5. Adapt difficulty to demonstrated mastery.
6. Distinguish conceptual, reasoning, calculation, memory, condition-reading, misread, and careless errors.
7. Never set or guess mastery values. The learning engine owns mastery.
8. Never claim a question has been saved unless create_question succeeded.
9. Before asking a question whose result should affect mastery, call create_question first.
10. When the learner answers the active question, inspect get_current_question, evaluate the answer, and call record_attempt.
11. After recording an attempt, explain the key issue and choose one next action: repair, retry, harder practice, or advance.
12. Keep explanations progressive and avoid unnecessary overload.
13. If the learner asks what to study, inspect due reviews and relevant weak state rather than guessing.
14. Do not expose internal tool mechanics to the learner.

Scoring guidance for record_attempt:
- correctness: factual/mathematical correctness
- reasoning: quality and completeness of the reasoning
- independence: how independently the learner answered, considering hints from this turn
All three scores are numbers from 0 to 1.

When there is no meaningful error, use errorType NONE and an empty misconceptions array.
`.trim();

export async function runStudyAgent(input: {
  userId: string;
  sessionId: string;
  message: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}) {
  const agent = new Agent({
    name: "StudyOS Tutor",
    model: env.OPENAI_MODEL,
    instructions: STUDY_AGENT_INSTRUCTIONS,
    tools: createStudyTools(input.userId, input.sessionId),
  });

  const history = (input.history ?? [])
    .slice(-12)
    .map(
      (item) =>
        `${item.role === "user" ? "Learner" : "Tutor"}: ${item.content}`,
    )
    .join("\n\n");

  const prompt = [
    history,
    history ? "Current learner message:" : "",
    input.message,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await run(agent, prompt, {
    maxTurns: 12,
  });

  return {
    output:
      typeof result.finalOutput === "string"
        ? result.finalOutput
        : JSON.stringify(result.finalOutput),
  };
}
