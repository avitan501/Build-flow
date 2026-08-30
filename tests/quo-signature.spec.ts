import { createHmac, randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

import { verifyQuoSignature } from "@/lib/aura/quo-signature";

function signature(secret: Buffer, timestamp: number, payload: string) {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("base64");
  return `hmac;1;${timestamp};${digest}`;
}

test("Quo signature accepts both raw and parsed JSON payload signing", () => {
  const secret = randomBytes(32);
  process.env.AURA_QUO_WEBHOOK_SIGNING_SECRET = secret.toString("base64");
  const now = Date.now();
  const raw = '{\n  "type": "message.received",\n  "data": { "text": "two  words" }\n}';
  const parsed = JSON.stringify(JSON.parse(raw));

  expect(verifyQuoSignature(raw, signature(secret, now, raw), now)).toBe(true);
  expect(verifyQuoSignature(raw, signature(secret, now, parsed), now)).toBe(true);
});

test("Quo signature keeps whitespace inside strings and rejects tampering or replay", () => {
  const secret = randomBytes(32);
  process.env.AURA_QUO_WEBHOOK_SIGNING_SECRET = secret.toString("base64");
  const now = Date.now();
  const raw = '{ "text": "keep  these spaces", "qty": 3 }';
  const compactOutsideStrings = '{"text":"keep  these spaces","qty":3}';
  const signed = signature(secret, now, compactOutsideStrings);

  expect(verifyQuoSignature(raw, signed, now)).toBe(true);
  expect(verifyQuoSignature(raw.replace("3", "4"), signed, now)).toBe(false);
  expect(verifyQuoSignature(raw, signed, now + 5 * 60_000 + 1)).toBe(false);
});
