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
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  PUBLIC_FEED_333_RATE_MAX: z.coerce.number().int().positive().default(30),
  PUBLIC_FEED_333_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  PUBLIC_FEED_999_RATE_MAX: z.coerce.number().int().positive().default(15),
  PUBLIC_FEED_999_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  SOVEREIGN_MODE: z.string().default("false").transform((v) => v === "true"),

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

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const data = parsed.data;
  return {
    ...data,
    DATABASE_READ_URL: data.DATABASE_READ_URL ?? data.DATABASE_URL,
    DIRECT_DATABASE_URL: data.DIRECT_DATABASE_URL ?? data.DATABASE_URL,
  };
}

export const env = loadEnv();
