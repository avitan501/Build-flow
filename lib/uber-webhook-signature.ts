import { createHmac, timingSafeEqual } from "node:crypto";

const SHA256_HEX_LENGTH = 64;

export function verifyUberWebhookSignature(rawBody: string, signingKey: string, candidates: Array<string | null>) {
  if (!signingKey) return false;

  const expected = Buffer.from(createHmac("sha256", signingKey).update(rawBody).digest("hex"), "ascii");
  return candidates.some((candidate) => {
    const normalized = candidate?.trim().toLowerCase() || "";
    if (normalized.length !== SHA256_HEX_LENGTH || !/^[0-9a-f]+$/.test(normalized)) return false;
    return timingSafeEqual(Buffer.from(normalized, "ascii"), expected);
  });
}
