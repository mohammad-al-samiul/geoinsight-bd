/** Jest env bootstrap — must run before any module importing env.ts */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_minimum_32_characters_long";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_DAYS = "7";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://geoinsight:geoinsight@localhost:5432/geoinsight_test";
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
process.env.RABBITMQ_EXCHANGE = "geoinsight_exchange";
process.env.RABBITMQ_GOV_QUEUE = "gov_core_queue";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.FABRIC_ENABLED = "false";
