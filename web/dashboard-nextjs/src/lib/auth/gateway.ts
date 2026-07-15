/**
 * Internal BFF → API Gateway base URL (Docker network or localhost).
 * Prefer the stable container_name DNS when unset on VPS.
 */
function resolveGatewayUrl(): string {
  const fromEnv = process.env.API_GATEWAY_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Inside Docker Compose the gateway listens as geoinsight-api-gateway:4000
  if (process.env.NODE_ENV === "production") {
    return "http://geoinsight-api-gateway:4000";
  }
  return "http://localhost:4000";
}

export const GATEWAY_URL = resolveGatewayUrl();
export const GATEWAY_API = `${GATEWAY_URL}/api/v1`;
