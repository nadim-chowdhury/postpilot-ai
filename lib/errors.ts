/**
 * Custom error class for application-level errors.
 * Carries a machine-readable code, HTTP status, and optional metadata.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Machine-readable error codes used across services and actions.
 */
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Meta API
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  RATE_LIMITED: "RATE_LIMITED",
  META_API_ERROR: "META_API_ERROR",

  // Content
  DUPLICATE_CONTENT: "DUPLICATE_CONTENT",
  CONTENT_TOO_LONG: "CONTENT_TOO_LONG",
  INVALID_MEDIA: "INVALID_MEDIA",

  // Scheduling
  SCHEDULE_CONFLICT: "SCHEDULE_CONFLICT",
  SCHEDULE_PAST_TIME: "SCHEDULE_PAST_TIME",
  DAILY_LIMIT_REACHED: "DAILY_LIMIT_REACHED",

  // AI
  AI_GENERATION_FAILED: "AI_GENERATION_FAILED",
  AI_PROVIDER_UNAVAILABLE: "AI_PROVIDER_UNAVAILABLE",

  // General
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
