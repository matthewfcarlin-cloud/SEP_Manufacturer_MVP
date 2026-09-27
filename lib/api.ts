import type { AiErrorCode } from "./types";

export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string; code?: AiErrorCode };

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data, error: null } satisfies ApiResponse<T>, { status });
}

/** An error response. `code` is set for AI failures the UI handles specially (see AiErrorCode). */
export function fail(error: string, status: number, code?: AiErrorCode): Response {
  return Response.json({ success: false, data: null, error, ...(code && { code }) } satisfies ApiResponse<never>, {
    status,
  });
}
