import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";

export interface SovereignChatParams {
  messages: Array<{ role: string; content: string }>;
  lang?: "bn" | "en";
  context?: string;
}

export class SovereignLlmService {
  async chat(params: SovereignChatParams) {
    const res = await fetchAi(
      `/api/v1/sovereign-llm/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: params.messages,
          lang: params.lang ?? "bn",
          context: params.context,
        }),
      },
      { timeoutMs: AI_FETCH_LLM_MS },
    );
    if (!res.ok) throw new Error("Sovereign LLM unavailable");
    return res.json();
  }

  async status() {
    const res = await fetchAi(`/api/v1/sovereign-llm/status`);
    if (!res.ok) throw new Error("AI status unavailable");
    return res.json();
  }
}

export const sovereignLlmService = new SovereignLlmService();
