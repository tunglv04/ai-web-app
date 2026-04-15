import { NextResponse } from "next/server";

export type ApiErrorCode = "QUOTA_EXCEEDED" | "INVALID_API_KEY" | "GENERATION_FAILED" | "UNKNOWN";

interface ApiErrorResponse {
  error: string;
  code: ApiErrorCode;
}

export function classifyError(err: unknown): { message: string; code: ApiErrorCode; status: number } {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("resource has been exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("tokens") && lower.includes("exceeded") ||
    lower.includes("billing")
  ) {
    return {
      message: "API key quota exceeded. Your API key may have run out of tokens or hit its rate limit.",
      code: "QUOTA_EXCEEDED",
      status: 429,
    };
  }

  if (
    lower.includes("api key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("permission denied") ||
    lower.includes("403")
  ) {
    return {
      message: "Invalid or expired API key.",
      code: "INVALID_API_KEY",
      status: 403,
    };
  }

  return {
    message: message || "An unexpected error occurred.",
    code: "GENERATION_FAILED",
    status: 500,
  };
}

export function errorResponse(err: unknown): NextResponse<ApiErrorResponse> {
  const { message, code, status } = classifyError(err);
  return NextResponse.json({ error: message, code }, { status });
}
