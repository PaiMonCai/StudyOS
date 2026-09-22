import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_HOST: z.string().min(1).default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DATABASE_USER: z.string().min(1).default("studyos"),
  DATABASE_PASSWORD: z.string().default("studyos"),
  DATABASE_NAME: z.string().min(1).default("studyos"),

  OPENAI_API_KEY: optionalSecret,
  OPENAI_MODEL: z.string().min(1).default("gpt-5.6"),

  DEFAULT_USER_EMAIL: z.string().email().default("dev@studyos.local"),
  DEFAULT_USER_NAME: z.string().min(1).default("StudyOS Learner"),

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

  throw new Error(`INVALID_ENVIRONMENT: ${details}`);
}

export const env = parsed.data;
