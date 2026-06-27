import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth/cookies";

/** Short-lived token handoff for Socket.IO (read from httpOnly cookie server-side). */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIES.access)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true, data: { token: accessToken } });
}
