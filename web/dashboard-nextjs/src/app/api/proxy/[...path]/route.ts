import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { fetchGateway } from "@/lib/auth/fetch-gateway";
import { GATEWAY_API, GATEWAY_URL } from "@/lib/auth/gateway";

const FORWARD_HEADERS = ["content-type", "accept"];

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  const upstreamPath = pathSegments.join("/");
  const search = request.nextUrl.search;

  // Production hardening:
  // Sometimes Docker DNS / env drift makes one gateway hostname fail
  // (e.g. `api-gateway` vs `geoinsight-api-gateway`). Try a small set of
  // known-good base URLs instead of failing immediately.
  const baseCandidates = Array.from(
    new Set([
      GATEWAY_API, // from env / gateway.ts resolve
      "http://api-gateway:4000/api/v1",
      "http://geoinsight-api-gateway:4000/api/v1",
      // local dev fallbacks (harmless if not reachable)
      "http://localhost:4800/api/v1",
      "http://localhost:4000/api/v1",
    ]),
  ).filter(Boolean);

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);

  const clientIp =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip");
  if (clientIp) {
    headers.set("X-Forwarded-For", clientIp);
  }

  FORWARD_HEADERS.forEach((name) => {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  });

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  let upstream: Response | null = null;
  let lastErr: unknown = null;
  for (const base of baseCandidates) {
    const candidateUrl = `${base}/${upstreamPath}${search}`;
    try {
      upstream = await fetchGateway(candidateUrl, init);
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!upstream) {
    const message =
      lastErr instanceof Error ? lastErr.message : "Upstream request failed";
    return NextResponse.json(
      {
        success: false,
        message: `API gateway unreachable (tried: ${baseCandidates.join(
          ", ",
        )}). ${message}`,
      },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  if (contentType.includes("image/") || contentType.includes("octet-stream")) {
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  }

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
