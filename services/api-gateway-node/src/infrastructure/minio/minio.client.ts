import { createHash, createHmac, randomUUID } from "crypto";
import { env } from "../../core/config/env";

const MINIO_REF = "minio:";

export function isMinioConfigured(): boolean {
  return Boolean(env.MINIO_ENDPOINT && env.MINIO_ROOT_USER && env.MINIO_ROOT_PASSWORD);
}

export function isMinioRef(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(MINIO_REF));
}

export function toMinioRef(key: string): string {
  return `${MINIO_REF}${key}`;
}

export function minioKeyFromRef(value: string): string {
  return value.startsWith(MINIO_REF) ? value.slice(MINIO_REF.length) : value;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function signingKey(secret: string, dateStamp: string): Buffer {
  const kDate = hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion = hmacSha256(kDate, "us-east-1");
  const kService = hmacSha256(kRegion, "s3");
  return hmacSha256(kService, "aws4_request");
}

function amzNow(): { amzDate: string; dateStamp: string } {
  const iso = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

async function signedS3(
  method: "PUT" | "GET",
  key: string,
  body?: Buffer,
  contentType?: string,
): Promise<Response> {
  if (!isMinioConfigured()) {
    throw new Error("MinIO is not configured");
  }
  const endpoint = new URL(env.MINIO_ENDPOINT!);
  const bucket = env.MINIO_BUCKET_DOCS;
  const accessKey = env.MINIO_ROOT_USER!;
  const secretKey = env.MINIO_ROOT_PASSWORD!;
  const { amzDate, dateStamp } = amzNow();
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const host = endpoint.host;
  const payloadHash = body ? sha256Hex(body) : sha256Hex("");
  const type = contentType ?? "application/octet-stream";

  const headerLines =
    method === "PUT"
      ? [
          `content-type:${type}`,
          `host:${host}`,
          `x-amz-content-sha256:${payloadHash}`,
          `x-amz-date:${amzDate}`,
        ]
      : [
          `host:${host}`,
          `x-amz-content-sha256:${payloadHash}`,
          `x-amz-date:${amzDate}`,
        ];
  const signedHeaders =
    method === "PUT"
      ? "content-type;host;x-amz-content-sha256;x-amz-date"
      : "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    `${headerLines.join("\n")}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/us-east-1/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmacSha256(signingKey(secretKey, dateStamp), stringToSign).toString("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    Host: host,
    "X-Amz-Date": amzDate,
    "X-Amz-Content-Sha256": payloadHash,
    Authorization: authorization,
  };
  if (method === "PUT") headers["Content-Type"] = type;

  return fetch(`${endpoint.origin}${canonicalUri}`, {
    method,
    headers,
    body,
  });
}

export async function putComplaintPhoto(
  entityId: string,
  kind: "before" | "after",
  dataUrl: string,
): Promise<string> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error("Invalid image data URL");
  }
  const ext = parsed.contentType.includes("png")
    ? "png"
    : parsed.contentType.includes("webp")
      ? "webp"
      : "jpg";
  const key = `complaints/${entityId}/${kind}-${randomUUID()}.${ext}`;
  const res = await signedS3("PUT", key, parsed.body, parsed.contentType);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`MinIO PUT ${res.status} ${detail.slice(0, 180)}`);
  }
  return key;
}

export async function getMinioObject(
  key: string,
): Promise<{ body: Buffer; contentType: string }> {
  const res = await signedS3("GET", key);
  if (!res.ok) {
    throw new Error(`MinIO GET ${res.status}`);
  }
  const body = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { body, contentType };
}

export function parseDataUrl(
  value: string,
): { contentType: string; body: Buffer } | null {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  return {
    contentType: match[1]!,
    body: Buffer.from(match[2]!.replace(/\s/g, ""), "base64"),
  };
}

export function toDataUrl(contentType: string, body: Buffer): string {
  return `data:${contentType};base64,${body.toString("base64")}`;
}
