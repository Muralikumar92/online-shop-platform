/**
 * Shared, framework-agnostic fetch-response helpers used by both the
 * server-side (`server-api.ts`) and client-side (`api-client.ts`) fetch
 * wrappers. Kept dependency-free so it's safe to import from client
 * components too.
 */

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed with status ${status}`
    );
    this.status = status;
    this.body = body;
  }
}

export async function parseOrThrow<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new ApiError(response.status, data);
  }
  return data as T;
}
