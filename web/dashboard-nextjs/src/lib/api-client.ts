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

function redirectToForbidden(reason: string) {
  if (typeof window === "undefined") return;
  window.location.href = `/forbidden?reason=${encodeURIComponent(reason)}`;
}

export async function apiClient<T = unknown>(
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
    if (refreshed) return apiClient<T>(path, init, true);
    redirectToLogin();
    throw new ApiClientError(401, "Session expired");
  }

  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string }).message ??
      "Access denied for your administrative tenant";
    redirectToForbidden(message);
    throw new ApiClientError(403, message);
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
