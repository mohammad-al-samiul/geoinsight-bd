export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Prefer same-origin sockets behind nginx (path /socket.io/).
 * Set NEXT_PUBLIC_SOCKET_URL only when the gateway is on another host.
 * Empty / "same-origin" → browser origin (HTTPS + VPS nginx).
 */
export function getSocketUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SOCKET_URL ?? "").trim();
  if (!raw || raw === "same-origin" || raw === "/") {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }
  return raw;
}

/** Lazy-friendly export — prefer getSocketUrl() at connect time */
export const SOCKET_URL = getSocketUrl();
