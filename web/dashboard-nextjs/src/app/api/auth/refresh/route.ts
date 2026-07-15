import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_MAX_AGE,
  AUTH_COOKIES,
  cookieOptions,
  refreshCookieOptions,
  REFRESH_MAX_AGE,
} from "@/lib/auth/cookies";
import { GATEWAY_API } from "@/lib/auth/gateway";
import { fetchGateway } from "@/lib/auth/fetch-gateway";

interface GatewayRefreshResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: Record<string, unknown>;
  };
  message?: string;
}

async function performRefresh(refreshToken: string) {
  return fetchGateway(`${GATEWAY_API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(AUTH_COOKIES.refresh)?.value;
  const redirectTo = request.nextUrl.searchParams.get("redirect") ?? "/";

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const gatewayRes = await performRefresh(refreshToken);
  const json = (await gatewayRes.json()) as GatewayRefreshResponse;

  if (!gatewayRes.ok || !json.success || !json.data) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(AUTH_COOKIES.access, "", { ...cookieOptions(0), maxAge: 0 });
    response.cookies.set(
      AUTH_COOKIES.refresh,
      "",
      { ...refreshCookieOptions(0), maxAge: 0 },
    );
    return response;
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(
    AUTH_COOKIES.access,
    json.data.accessToken,
    cookieOptions(ACCESS_MAX_AGE),
  );
  response.cookies.set(
    AUTH_COOKIES.refresh,
    json.data.refreshToken,
    refreshCookieOptions(REFRESH_MAX_AGE),
  );
  return response;
}

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(AUTH_COOKIES.refresh)?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, message: "No refresh token" },
      { status: 401 },
    );
  }

  const gatewayRes = await performRefresh(refreshToken);
  const json = (await gatewayRes.json()) as GatewayRefreshResponse;

  if (!gatewayRes.ok || !json.success || !json.data) {
    const response = NextResponse.json(
      { success: false, message: json.message ?? "Refresh failed" },
      { status: 401 },
    );
    response.cookies.set(AUTH_COOKIES.access, "", { ...cookieOptions(0), maxAge: 0 });
    response.cookies.set(
      AUTH_COOKIES.refresh,
      "",
      { ...refreshCookieOptions(0), maxAge: 0 },
    );
    return response;
  }

  const response = NextResponse.json({
    success: true,
    data: { user: json.data.user },
  });
  response.cookies.set(
    AUTH_COOKIES.access,
    json.data.accessToken,
    cookieOptions(ACCESS_MAX_AGE),
  );
  response.cookies.set(
    AUTH_COOKIES.refresh,
    json.data.refreshToken,
    refreshCookieOptions(REFRESH_MAX_AGE),
  );
  return response;
}
