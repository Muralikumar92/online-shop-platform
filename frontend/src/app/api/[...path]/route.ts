/**
 * Generic reverse proxy from the Next.js app to the Spring Boot backend.
 *
 * Why this exists: the backend resolves which shop ("tenant") a request is
 * for purely from the Host header's subdomain (see TenantResolutionFilter).
 * In production, nginx terminates the customer's real Host header and
 * forwards it straight to the backend, so this route is never hit there.
 * In local dev there is no nginx in front of the frontend container, so
 * when a browser calls a relative "/api/..." URL it lands here first - we
 * re-issue the request to the backend over the docker network, forwarding
 * the browser's original host (minus port) via X-Forwarded-Host, so
 * subdomain-based tenant resolution keeps working identically in both
 * environments.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8080";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-length",
  "host",
]);

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/${path.join("/")}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  // "Host" is a forbidden header name fetch refuses to override (it would
  // always reflect the real connection target, "backend" here) - forward
  // the browser's original host via X-Forwarded-Host instead, which
  // TenantResolutionFilter reads in preference to getServerName().
  const originalHost = req.headers.get("host") ?? "";
  headers.set("x-forwarded-host", originalHost.split(":")[0]);

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const backendResponse = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  backendResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxy(req, (await params).path);
}
