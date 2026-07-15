import { env } from "../../core/config/env";

export const AI_FETCH_DEFAULT_MS = 30_000;
export const AI_FETCH_LLM_MS = 180_000;

export class AiFetchError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiFetchError";
  }
}

export async function fetchAi(
  path: string,
  init?: RequestInit,
  options?: { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? AI_FETCH_DEFAULT_MS;
  const url = path.startsWith("http")
    ? path
    : `${env.AI_SERVICE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: init?.signal ?? controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiFetchError(`AI request timed out after ${timeoutMs}ms`, err);
    }
    throw new AiFetchError("AI service unreachable", err);
  } finally {
    clearTimeout(timer);
  }
}
