export type AppErrorCode =
  | "INVALID_REQUEST"
  | "OPENAI_API_KEY_MISSING"
  | "CONCEPT_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "REVIEW_TASK_NOT_FOUND"
  | "MISTAKE_NOT_FOUND"
  | "NO_ACTIVE_QUESTION"
  | "INTERNAL_ERROR";

export type AppErrorStatus = 400 | 404 | 409 | 503 | 500;

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: AppErrorStatus;
  readonly details?: unknown;

  constructor(input: {
    code: AppErrorCode;
    message: string;
    statusCode: AppErrorStatus;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "AppError";
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.details = input.details;
  }
}

const knownErrorMap: Partial<
  Record<string, { code: AppErrorCode; statusCode: AppErrorStatus; message: string }>
> = {
  CONCEPT_NOT_FOUND: {
    code: "CONCEPT_NOT_FOUND",
    statusCode: 404,
    message: "The requested concept does not exist.",
  },
  SESSION_NOT_FOUND: {
    code: "SESSION_NOT_FOUND",
    statusCode: 404,
    message: "The requested study session does not exist or is already closed.",
  },
  REVIEW_TASK_NOT_FOUND: {
    code: "REVIEW_TASK_NOT_FOUND",
    statusCode: 404,
    message: "The requested due review task does not exist.",
  },
  MISTAKE_NOT_FOUND: {
    code: "MISTAKE_NOT_FOUND",
    statusCode: 404,
    message: "The requested mistake does not exist.",
  },
  NO_ACTIVE_QUESTION: {
    code: "NO_ACTIVE_QUESTION",
    statusCode: 409,
    message: "There is no active graded question in this study session.",
  },
};

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const known = knownErrorMap[error.message];

    if (known) {
      return new AppError(known);
    }
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    statusCode: 500,
    message: "Unexpected server error.",
  });
}

export function errorBody(input: {
  code: AppErrorCode;
  message: string;
  requestId: string;
  details?: unknown;
}) {
  return {
    error: {
      code: input.code,
      message: input.message,
      requestId: input.requestId,
      ...(input.details === undefined ? {} : { details: input.details }),
    },
  };
}
