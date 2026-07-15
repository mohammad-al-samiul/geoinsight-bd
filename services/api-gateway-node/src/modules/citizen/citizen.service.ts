import { fetchAi } from "../../shared/http/fetch-ai";

export interface CitizenChatParams {
  message: string;
  lang?: "bn" | "en";
  district?: string;
  upazila?: string;
  channel?: "333" | "999";
}

export class CitizenChatService {
  async chat(params: CitizenChatParams) {
    const res = await fetchAi(`/api/v1/citizen/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: params.message,
        lang: params.lang ?? "bn",
        district: params.district,
        upazila: params.upazila,
        channel: params.channel ?? "333",
      }),
    });
    if (!res.ok) throw new Error("Citizen chat unavailable");
    return res.json();
  }
}

export const citizenChatService = new CitizenChatService();
