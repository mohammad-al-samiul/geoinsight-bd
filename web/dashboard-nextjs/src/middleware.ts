import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIES } from "@/lib/auth/cookies";

const PUBLIC_PREFIXES = [
  "/login",
  "/forbidden",
  "/api/auth/login",
  "/api/auth/refresh",
];

const PROTECTED_PREFIXES = [
  "/",
  "/dashboard",
  "/briefing",
  "/outlook",
  "/unrest",
  "/anti-phishing",
  "/ops",
  "/procurement",
  "/alerts",
  "/kpis",
  "/projects",
  "/documents",
  "/audit-trail",
  "/hazards",
  "/agro",
  "/map",
  "/representatives",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isProtected(pathname: string): boolean {
  if (pathname.startsWith("/api/proxy")) return true;
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)),
  );
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

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (!isProtected(pathname)) {
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
