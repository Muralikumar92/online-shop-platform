"use client";

/**
 * Browser-side fetch helper. Always calls a relative "/api/..." URL so it
 * works unchanged in local dev (handled by our own proxy route) and in
 * production (handled by nginx, which forwards straight to the backend).
 */
import { parseOrThrow } from "./http";

export { ApiError } from "./http";

export async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  });

  return parseOrThrow<T>(response);
}

export async function apiUpload<T>(path: string, formData: FormData, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  return parseOrThrow<T>(response);
}
