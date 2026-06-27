export const AUTH_COOKIES = {
  access: "gi_access_token",
  refresh: "gi_refresh_token",
} as const;

export const ACCESS_MAX_AGE = 60 * 15; // 15 minutes
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function cookieOptions(maxAge: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function refreshCookieOptions(maxAge: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
