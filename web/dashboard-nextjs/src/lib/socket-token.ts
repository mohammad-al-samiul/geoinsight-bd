/**
 * Shared socket-token fetch — one in-flight request + short-lived cache
 * so dashboard / feed / realtime hooks do not stampede `/api/auth/socket-token`.
 */

let cached: string | null | undefined;
let inflight: Promise<string | null> | null = null;
let cachedAt = 0;

const TTL_MS = 60_000;

export async function fetchSocketToken(): Promise<string | null> {
  if (cached !== undefined && Date.now() - cachedAt < TTL_MS) {
    return cached;
  }
  if (inflight) return inflight;

  inflight = fetch("/api/auth/socket-token", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      cached = json?.success ? (json.data.token as string) : null;
      cachedAt = Date.now();
      return cached;
    })
    .catch(() => {
      cached = null;
      cachedAt = Date.now();
      return null;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function clearSocketTokenCache() {
  cached = undefined;
  cachedAt = 0;
  inflight = null;
}
