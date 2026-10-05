/**
 * Server Component / Server Action fetch helper.
 *
 * Calls the backend directly over the docker network (no proxy hop), but
 * still needs to tell it which shop subdomain the visitor is on. We read
 * the original request's Host header via next/headers and forward it
 * untouched (minus port) so TenantResolutionFilter resolves the same shop
 * the browser is actually looking at.
 */
import { headers } from "next/headers";
import { parseOrThrow } from "./http";

export { ApiError } from "./http";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080";

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const hdrs = await headers();
  const host = (hdrs.get("host") ?? "").split(":")[0];

  const response = await fetch(`${BACKEND_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      // "Host" is a forbidden header name fetch implementations refuse to
      // override (it always reflects the real connection target, "backend"
      // here) - X-Forwarded-Host carries the original tenant subdomain
      // instead; TenantResolutionFilter reads that in preference to
      // getServerName() for exactly this reason.
      "X-Forwarded-Host": host,
    },
    // Public storefront data changes often (stock, prices) - never cache.
    cache: "no-store",
  });

  return parseOrThrow<T>(response);
}
