import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes "/" differently depending on which host it's requested on:
 * the platform's root/apex domain (and reserved hosts like "www") gets the
 * marketing/welcome page, while every shop subdomain keeps resolving "/" to
 * the storefront's category grid ((storefront)/page.tsx). Mirrors the
 * subdomain-extraction rules in the backend's TenantResolutionFilter so the
 * two stay consistent about what counts as a "tenant" host.
 */
const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin"]);

function isApexHost(host: string): boolean {
  const bare = host.split(":")[0];
  const parts = bare.split(".");
  if (parts.length < 3) {
    return true;
  }
  return RESERVED_SUBDOMAINS.has(parts[0]);
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (isApexHost(host)) {
    return NextResponse.rewrite(new URL("/welcome", request.url));
  }
}

export const config = {
  matcher: "/",
};
