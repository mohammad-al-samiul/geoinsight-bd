import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32 encode (no padding). */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = digest[digest.length - 1]! & 0xf;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

/** RFC 6238 TOTP (SHA-1, 30s step, 6 digits). */
export function generateTotp(secretBase32: string, at = Date.now()): string {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(at / 1000 / 30);
  return hotp(secret, counter);
}

export function verifyTotp(
  secretBase32: string,
  token: string,
  window = 1,
  at = Date.now(),
): boolean {
  const code = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(at / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, counter + w) === code) return true;
  }
  return false;
}

export function buildOtpAuthUrl(opts: {
  secret: string;
  email: string;
  issuer?: string;
}): string {
  const issuer = opts.issuer ?? "GeoInsight BD";
  const label = encodeURIComponent(`${issuer}:${opts.email}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
