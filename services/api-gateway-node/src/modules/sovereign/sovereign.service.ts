import { env } from "../../core/config/env";

export interface SovereignChatParams {
  messages: Array<{ role: string; content: string }>;
  lang?: "bn" | "en";
  context?: string;
}

export class SovereignLlmService {
  async chat(params: SovereignChatParams) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/sovereign-llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: params.messages,
          lang: params.lang ?? "bn",
          context: params.context,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Sovereign LLM unavailable");
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async status() {
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/sovereign-llm/status`);
    if (!res.ok) throw new Error("AI status unavailable");
    return res.json();
  }
}

export const sovereignLlmService = new SovereignLlmService();
