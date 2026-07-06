export const AUTH_COOKIES = {
  access: "gi_access_token",
  refresh: "gi_refresh_token",
} as const;

export const ACCESS_MAX_AGE = 60 * 15; // 15 minutes
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function cookieOptions(maxAge: number) {
  const secure = cookieSecure();
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function refreshCookieOptions(maxAge: number) {
  const secure = cookieSecure();
  return {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
