import { config as loadDotenv } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

const serviceDir = resolve(__dirname, "../../..");
const monorepoRoot = resolve(serviceDir, "../..");

if (existsSync(resolve(monorepoRoot, ".env"))) {
  loadDotenv({ path: resolve(monorepoRoot, ".env") });
}
loadDotenv({ path: resolve(serviceDir, ".env"), override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_GATEWAY_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  DATABASE_READ_URL: z.string().min(1).optional(),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  RABBITMQ_URL: z.string().min(1),
  RABBITMQ_EXCHANGE: z.string().default("geoinsight_exchange"),
  RABBITMQ_GOV_QUEUE: z.string().default("gov_core_queue"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(500),
  PUBLIC_FEED_333_RATE_MAX: z.coerce.number().int().positive().default(30),
  PUBLIC_FEED_333_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  PUBLIC_FEED_999_RATE_MAX: z.coerce.number().int().positive().default(15),
  PUBLIC_FEED_999_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  SOVEREIGN_MODE: z.string().default("false").transform((v) => v === "true"),
  INGESTION_ENABLED: z.string().default("true").transform((v) => v === "true"),
  INGESTION_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  INGESTION_RUN_ON_START: z.string().default("true").transform((v) => v === "true"),
  INGESTION_STARTUP_DELAY_MS: z.coerce.number().int().positive().default(45_000),

  PIPELINE_ENABLED: z.string().default("true").transform((v) => v === "true"),
  PIPELINE_RUN_ON_START: z.string().default("true").transform((v) => v === "true"),
  PIPELINE_STARTUP_DELAY_MS: z.coerce.number().int().positive().default(60_000),
  PIPELINE_NEWS_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  PIPELINE_COMMODITY_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),
  PIPELINE_KPI_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),
  PIPELINE_ALERT_INTERVAL_MS: z.coerce.number().int().positive().default(1_200_000),
  PIPELINE_AGRO_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),
  PIPELINE_HAZARD_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),
  PIPELINE_WEATHER_INTERVAL_MS: z.coerce.number().int().positive().default(600_000),
  PIPELINE_UNREST_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  PIPELINE_NARRATIVE_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),
  PIPELINE_OUTLOOK_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),
  PIPELINE_BRIEFING_INTERVAL_MS: z.coerce.number().int().positive().default(1_800_000),

  /** Intel snapshot DB retention (days) + max rows kept per kind/lang/scope */
  INTEL_SNAPSHOT_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  INTEL_SNAPSHOT_KEEP_PER_SCOPE: z.coerce.number().int().positive().default(48),
  PIPELINE_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(14),
  INGESTION_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(14),

  LIVE_DATA_ONLY: z.string().default("true").transform((v) => v === "true"),

  /** National election / new cabinet — politics/economy/unrest scoped from this date */
  CURRENT_GOVERNMENT_SINCE: z.string().default("2026-02-15"),
  CURRENT_GOVERNMENT_PARTY: z.string().default("BNP"),

  FABRIC_ENABLED: z.string().default("false").transform((v) => v === "true"),
  FABRIC_CONNECTION_PROFILE_PATH: z
    .string()
    .default("../../deploy/hyperledger/connection-profile.example.json"),
  FABRIC_WALLET_PATH: z.string().default("./deploy/hyperledger/wallet"),
  FABRIC_IDENTITY_LABEL: z.string().default("geoinsightApp"),
  FABRIC_CHANNEL_NAME: z.string().default("geoinsight-channel"),
  FABRIC_CHAINCODE_NAME: z.string().default("project-tracker"),
  FABRIC_DISCOVERY_AS_LOCALHOST: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  FABRIC_MAX_RETRIES: z.coerce.number().int().positive().default(5),
  FABRIC_RETRY_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
});

export type Env = z.infer<typeof envSchema>;

const PLACEHOLDER_SECRET = /change_me|changeme|example\.gov|YOUR_VPS|password123/i;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const data = parsed.data;

  if (data.NODE_ENV === "production") {
    const violations: string[] = [];
    if (PLACEHOLDER_SECRET.test(data.JWT_SECRET)) violations.push("JWT_SECRET");
    if (PLACEHOLDER_SECRET.test(data.RABBITMQ_URL)) violations.push("RABBITMQ_URL");
    if (!data.REDIS_URL) violations.push("REDIS_URL (required in production)");
    if (violations.length > 0) {
      console.error(
        `[env] Production startup blocked — replace placeholder values: ${violations.join(", ")}`,
      );
      process.exit(1);
    }
  }

  return {
    ...data,
    DATABASE_READ_URL: data.DATABASE_READ_URL ?? data.DATABASE_URL,
    DIRECT_DATABASE_URL: data.DIRECT_DATABASE_URL ?? data.DATABASE_URL,
  };
}

export const env = loadEnv();
