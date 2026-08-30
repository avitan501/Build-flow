import { createHmac, timingSafeEqual } from "node:crypto";

function quoSignaturePayloads(rawBody: string) {
  const candidates = new Set<string>([rawBody, rawBody.trim()]);
  try {
    candidates.add(JSON.stringify(JSON.parse(rawBody)));
  } catch {
    return [];
  }

  let compact = "";
  let inString = false;
  let escaped = false;
  for (const character of rawBody) {
    if (inString) {
      compact += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') {
      inString = true;
      compact += character;
    } else if (!/\s/.test(character)) {
      compact += character;
    }
  }
  candidates.add(compact);
  return [...candidates];
}

export function verifyQuoSignature(
  rawBody: string,
  signatureHeader: string | null,
  now = Date.now(),
) {
  const encodedSecret = process.env.AURA_QUO_WEBHOOK_SIGNING_SECRET;
  if (!encodedSecret || !signatureHeader) return false;

  const payloads = quoSignaturePayloads(rawBody);
  if (payloads.length === 0) return false;

  let key: Buffer;
  try {
    key = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  return signatureHeader.split(",").some((candidate) => {
    const [scheme, version, timestamp, providedDigest, ...extra] = candidate
      .trim()
      .split(";");
    if (
      scheme !== "hmac" ||
      version !== "1" ||
      !timestamp ||
      !providedDigest ||
      extra.length > 0
    ) return false;
    const timestampMs = Number(timestamp);
    if (
      !Number.isFinite(timestampMs) ||
      Math.abs(now - timestampMs) > 5 * 60 * 1000
    ) return false;

    let suppliedDigest: Buffer;
    try {
      suppliedDigest = Buffer.from(providedDigest, "base64");
    } catch {
      return false;
    }
    return payloads.some((payload) => {
      const expectedDigest = createHmac("sha256", key)
        .update(`${timestamp}.${payload}`, "utf8")
        .digest();
      return suppliedDigest.length === expectedDigest.length &&
        timingSafeEqual(suppliedDigest, expectedDigest);
    });
  });
}
