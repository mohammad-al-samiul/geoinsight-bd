import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIES, cookieOptions, refreshCookieOptions } from "@/lib/auth/cookies";
import { GATEWAY_API } from "@/lib/auth/gateway";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(AUTH_COOKIES.refresh)?.value;

  if (refreshToken) {
    await fetch(`${GATEWAY_API}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIES.access, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(
    AUTH_COOKIES.refresh,
    "",
    { ...refreshCookieOptions(0), maxAge: 0 },
  );
  return response;
}
