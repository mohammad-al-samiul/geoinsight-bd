import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth/cookies";

const PUBLIC_PREFIXES = [
  "/login",
  "/forbidden",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/mfa",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function requiresAuth(pathname: string): boolean {
  if (isPublic(pathname)) return false;
  // Auth helper routes that don't need a session cookie
  if (pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/proxy")) {
    return false;
  }
  // All app pages + gateway proxy require a session
  if (pathname.startsWith("/api/proxy")) return true;
  if (pathname.startsWith("/api/")) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|ico)$/)
  ) {
    return NextResponse.next();
  }

  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  const access = request.cookies.get(AUTH_COOKIES.access)?.value;
  if (access) {
    return NextResponse.next();
  }

  const refresh = request.cookies.get(AUTH_COOKIES.refresh)?.value;
  if (refresh && !pathname.startsWith("/api/auth/refresh")) {
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    refreshUrl.searchParams.set(
      "redirect",
      pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(refreshUrl);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
