import { tool } from "@openai/agents";
import { z } from "zod";
import { ErrorType } from "@/generated/prisma/enums";
import { toolResult } from "@/server/agent/tool-result";
import {
  createAgentQuestion,
  getCurrentQuestion,
  getLearningState,
  getPrerequisites,
  getRecentMistakes,
  recordCurrentAttempt,
} from "@/server/services/learning-service";
import {
  finishStudySession,
  getDueReviews,
  searchConcepts,
} from "@/server/services/study-service";

const errorTypeSchema = z.enum([
  "NONE",
  "CONCEPTUAL",
  "CALCULATION",
  "REASONING",
  "MEMORY",
  "CONDITION",
  "MISREAD",
  "CARELESS",
  "UNKNOWN",
]);

export function createStudyTools(userId: string, sessionId: string) {
  const searchConceptsTool = tool({
    name: "search_concepts",
    description:
      "Resolve a learner's natural-language concept name to StudyOS concept IDs before reading or writing concept-scoped state.",
    parameters: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(12).default(8),
    }),
    async execute({ query, limit }) {
      return toolResult("search_concepts", async () => {
        const concepts = await searchConcepts(query, limit);

        return concepts.map((concept) => ({
          id: concept.id,
          name: concept.name,
          slug: concept.slug,
          description: concept.description,
          difficulty: concept.difficulty,
          topic: concept.topic.name,
          subject: concept.topic.subject.name,
        }));
      });
    },
  });

  const getLearningStateTool = tool({
    name: "get_learning_state",
    description:
      "Read the learner's current mastery state for a concept before choosing how to teach or test it.",
    parameters: z.object({
      conceptId: z.string(),
    }),
    async execute({ conceptId }) {
      return toolResult("get_learning_state", () =>
        getLearningState(userId, conceptId),
      );
    },
  });

  const getPrerequisitesTool = tool({
    name: "get_prerequisites",
    description:
      "Read prerequisite concepts and their mastery before teaching a concept that may depend on weaker foundations.",
    parameters: z.object({
      conceptId: z.string(),
    }),
    async execute({ conceptId }) {
      return toolResult("get_prerequisites", () =>
        getPrerequisites(userId, conceptId),
      );
    },
  });

  const getRecentMistakesTool = tool({
    name: "get_recent_mistakes",
    description:
      "Inspect recent unresolved learner mistakes, optionally for one concept.",
    parameters: z.object({
      conceptId: z.string().optional(),
    }),
    async execute({ conceptId }) {
      return toolResult("get_recent_mistakes", () =>
        getRecentMistakes(userId, conceptId),
      );
    },
  });

  const getDueReviewsTool = tool({
    name: "get_due_reviews",
    description:
      "Read review tasks that are due now. Use when the learner asks what to study or review.",
    parameters: z.object({
      limit: z.number().int().min(1).max(20).default(5),
    }),
    async execute({ limit }) {
      return toolResult("get_due_reviews", () =>
        getDueReviews(userId, limit),
      );
    },
  });

  const createQuestionTool = tool({
    name: "create_question",
    description:
      "Persist a diagnostic or practice question before asking it to the learner. Always use this before presenting a question whose answer should affect mastery.",
    parameters: z.object({
      conceptId: z.string(),
      stem: z.string().min(1),
      answer: z.string().min(1),
      explanation: z.string().optional(),
      type: z.enum([
        "CONCEPT",
        "CALCULATION",
        "DERIVATION",
        "COMPARISON",
        "APPLICATION",
      ]),
      difficulty: z.number().int().min(1).max(5),
    }),
    async execute(input) {
      return toolResult("create_question", async () => {
        const question = await createAgentQuestion({
          userId,
          sessionId,
          ...input,
        });

        return {
          questionId: question.id,
          conceptId: question.conceptId,
          stem: question.stem,
          type: question.type,
          difficulty: question.difficulty,
        };
      });
    },
  });

  const getCurrentQuestionTool = tool({
    name: "get_current_question",
    description:
      "Get the active persisted question for this study session before evaluating the learner's answer.",
    parameters: z.object({}),
    async execute() {
      return toolResult("get_current_question", () =>
        getCurrentQuestion(userId, sessionId),
      );
    },
  });

  const recordAttemptTool = tool({
    name: "record_attempt",
    description:
      "Record structured evidence for the learner's answer to the active question. Mastery is calculated by deterministic business logic; never set mastery yourself.",
    parameters: z.object({
      answer: z.string(),
      correctness: z.number().min(0).max(1),
      reasoning: z.number().min(0).max(1),
      independence: z.number().min(0).max(1),
      errorType: errorTypeSchema,
      misconceptions: z.array(z.string()).max(6),
      feedback: z.string(),
    }),
    async execute(input) {
      return toolResult("record_attempt", () =>
        recordCurrentAttempt({
          userId,
          sessionId,
          answer: input.answer,
          evaluation: {
            correctness: input.correctness,
            reasoning: input.reasoning,
            independence: input.independence,
            errorType: input.errorType as ErrorType,
            misconceptions: input.misconceptions,
            feedback: input.feedback,
          },
        }),
      );
    },
  });

  const finishSessionTool = tool({
    name: "finish_study_session",
    description:
      "Finish the current study session and save a concise learning summary when the learner is done.",
    parameters: z.object({
      summary: z.string().min(1).max(2000),
    }),
    async execute({ summary }) {
      return toolResult("finish_study_session", () =>
        finishStudySession({
          userId,
          sessionId,
          summary,
        }),
      );
    },
  });

  return [
    searchConceptsTool,
    getLearningStateTool,
    getPrerequisitesTool,
    getRecentMistakesTool,
    getDueReviewsTool,
    createQuestionTool,
    getCurrentQuestionTool,
    recordAttemptTool,
    finishSessionTool,
  ];
}
