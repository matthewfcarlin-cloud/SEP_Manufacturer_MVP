export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data, error: null } satisfies ApiResponse<T>, { status });
}

export function fail(error: string, status: number): Response {
  return Response.json({ success: false, data: null, error } satisfies ApiResponse<never>, {
    status,
  });
}
