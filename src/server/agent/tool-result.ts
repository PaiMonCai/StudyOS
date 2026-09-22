import { normalizeError } from "@/server/errors";
import { logger } from "@/server/logger";

export type ToolResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        retryable: boolean;
      };
    };

export async function toolResult<T>(
  toolName: string,
  operation: () => Promise<T>,
): Promise<ToolResult<T>> {
  try {
    return {
      ok: true,
      data: await operation(),
    };
  } catch (error) {
    const normalized = normalizeError(error);

    logger.warn("agent.tool.error", {
      tool: toolName,
      code: normalized.code,
      statusCode: normalized.statusCode,
    });

    return {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        retryable: normalized.statusCode >= 500,
      },
    };
  }
}
