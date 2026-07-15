/**
 * Server-side fetch to the API gateway with retries.
 * Covers short outages during docker recreate / health-check windows.
 */

const RETRY_DELAYS_MS = [0, 400, 1000, 2000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGateway(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay > 0) await sleep(delay);

    try {
      const res = await fetch(url, {
        ...init,
        cache: "no-store",
      });
      // Retry only while gateway is still booting (connection ok but not ready)
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        lastError = new Error(`Gateway HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("API gateway unreachable");
}
