import { env } from "../../core/config/env";

export interface AntiPhishingScan {
  scanned_url: string;
  scanned_domain: string;
  official_domain: string | null;
  official_name: string | null;
  official_name_bn: string | null;
  similarity_score: number;
  digital_signature: string;
  verified_official: boolean;
  risk_level: "SAFE" | "REVIEW" | "RED_FLAG";
  red_flag: boolean;
  reasons: string[];
  reasons_bn: string[];
  scanned_at: string;
  engine: string;
}

export class AntiPhishingService {
  async scan(url: string): Promise<AntiPhishingScan> {
    const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/anti-phishing/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error("Anti-phishing analysis unavailable");
    return response.json() as Promise<AntiPhishingScan>;
  }
}

export const antiPhishingService = new AntiPhishingService();
