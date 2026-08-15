"use client";

import { emitToast } from "@/components/ui/toast";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const redirect = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.href = `/login?redirect=${redirect}`;
}

/** In-flight GET dedupe + short TTL so parallel mounts share one network hop. */
const getInflight = new Map<string, Promise<unknown>>();
const getCache = new Map<string, { at: number; value: unknown }>();
const GET_CACHE_TTL_MS = 45_000;

async function apiClientUncached<T = unknown>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const normalized = path.replace(/^\//, "");
  const method = (init.method ?? "GET").toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD";

  let res: Response;
  try {
    res = await fetch(`/api/proxy/${normalized}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    // Network-level failure (offline, DNS, aborted server). Reads surface
    // through page-level error states; mutations get an immediate toast.
    if (isMutation) {
      emitToast({
        title: "Network error",
        description: "Could not reach the server. Check your connection and try again.",
        variant: "destructive",
      });
    }
    throw error;
  }

  if (res.status === 401 && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiClientUncached<T>(path, init, true);
    redirectToLogin();
    throw new ApiClientError(401, "Session expired");
  }

  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string }).message ??
      "Access denied for your administrative tenant";
    // Do not hard-navigate to /forbidden — optional widgets (alerts feed)
    // must not kick local DSS users out of their session. Callers handle 403.
    throw new ApiClientError(403, message, (body as { code?: string }).code);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (body as { message?: string }).message ?? "Request failed";
    if (isMutation) {
      emitToast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    }
    throw new ApiClientError(res.status, message);
  }

  return body as T;
}

export async function apiClient<T = unknown>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const normalized = path.replace(/^\//, "");
  const method = (init.method ?? "GET").toUpperCase();
  const isGet = method === "GET" || method === "HEAD";
  const skipCache = Boolean(init.cache === "no-store" || init.signal || init.body);

  if (!isGet || skipCache || retried) {
    return apiClientUncached<T>(path, init, retried);
  }

  const key = normalized;
  const hit = getCache.get(key);
  if (hit && Date.now() - hit.at < GET_CACHE_TTL_MS) {
    return hit.value as T;
  }

  const existing = getInflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = apiClientUncached<T>(path, init, retried)
    .then((value) => {
      getCache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      getInflight.delete(key);
    });

  getInflight.set(key, promise);
  return promise;
}

export async function authFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      (body as { message?: string }).message ?? "Request failed",
    );
  }
  return body as T;
}

/** Fire-and-forget GET so sidebar modules stay warm while the user is logged in. */
export function warmApiGets(paths: string[]): void {
  for (const path of paths) {
    void apiClient(path).catch(() => {
      /* 403/404 for out-of-role routes are expected */
    });
  }
}
