import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { fetchGateway } from "@/lib/auth/fetch-gateway";
import { GATEWAY_API } from "@/lib/auth/gateway";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  try {
    const gatewayRes = await fetchGateway(`${GATEWAY_API}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const json = await gatewayRes.json();
    return NextResponse.json(json, { status: gatewayRes.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "API gateway unreachable";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
