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
    requiresMfa?: boolean;
    mfaToken?: string;
    accessToken?: string;
    refreshToken?: string;
    user: {
      id: string;
      email: string;
      phone?: string | null;
      role: string;
      adminUnitId?: string | null;
      mfaEnabled?: boolean;
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

    if (json.data.requiresMfa && json.data.mfaToken) {
      return NextResponse.json({
        success: true,
        data: {
          requiresMfa: true,
          mfaToken: json.data.mfaToken,
          user: json.data.user,
        },
      });
    }

    if (!json.data.accessToken || !json.data.refreshToken) {
      return NextResponse.json(
        { success: false, message: "Incomplete auth response" },
        { status: 502 },
      );
    }

    const response = NextResponse.json({
      success: true,
      data: {
        requiresMfa: false,
        user: json.data.user,
      },
    });
    setAuthCookies(response, {
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
    });
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "API gateway unreachable";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
