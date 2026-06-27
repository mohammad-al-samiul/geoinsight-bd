import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_GATEWAY_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  RABBITMQ_URL: z.string().min(1),
  RABBITMQ_EXCHANGE: z.string().default("geoinsight_exchange"),
  RABBITMQ_GOV_QUEUE: z.string().default("gov_core_queue"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  FABRIC_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  FABRIC_CONNECTION_PROFILE_PATH: z
    .string()
    .default("../../deploy/hyperledger/connection-profile.example.json"),
  FABRIC_WALLET_PATH: z.string().default("./deploy/hyperledger/wallet"),
  FABRIC_IDENTITY_LABEL: z.string().default("geoinsightApp"),
  FABRIC_CHANNEL_NAME: z.string().default("geoinsight-channel"),
  FABRIC_CHAINCODE_NAME: z.string().default("project-tracker"),
  FABRIC_DISCOVERY_AS_LOCALHOST: z
    .string()
    .optional()
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
  return parsed.data;
}

export const env = loadEnv();
