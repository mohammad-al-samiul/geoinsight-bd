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

interface GatewayAuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      phone: string | null;
      role: string;
      adminUnitId: string | null;
    };
  };
  message?: string;
}

function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
) {
  response.cookies.set(
    AUTH_COOKIES.access,
    tokens.accessToken,
    cookieOptions(ACCESS_MAX_AGE),
  );
  response.cookies.set(
    AUTH_COOKIES.refresh,
    tokens.refreshToken,
    refreshCookieOptions(REFRESH_MAX_AGE),
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const gatewayRes = await fetchGateway(`${GATEWAY_API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await gatewayRes.json()) as GatewayAuthResponse;
    if (!gatewayRes.ok || !json.success) {
      return NextResponse.json(
        { success: false, message: json.message ?? "Invalid credentials" },
        { status: gatewayRes.status },
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { user: json.data.user },
    });
    setAuthCookies(response, json.data);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "API gateway unreachable";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
