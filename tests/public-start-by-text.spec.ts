import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, webcrypto } from "node:crypto";
import { publicStartTextOpeningMessage } from "../supabase/functions/_shared/sms-reply-policy";

const root = process.cwd();

test("site-dispatch HMAC uses identical raw UTF-8 key bytes in Node and Web Crypto", async () => {
  const key = "sb_secret_fixed-test-key.with-punctuation";
  const message = '1730000000000.{"phone":"+15165550123","consent":true}';
  const nodeSignature = createHmac("sha256", key)
    .update(message)
    .digest("base64");
  const cryptoKey = await webcrypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await webcrypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message),
  );
  const webSignature = Buffer.from(digest).toString("base64");
  expect(webSignature).toBe(nodeSignature);
});

test("public text starter is fixed-copy, consented, rate-limited, and audited", async () => {
  const [route, broker, migration] = await Promise.all([
    readFile(path.join(root, "app/api/public/start-by-text/route.ts"), "utf8"),
    readFile(
      path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
      "utf8",
    ),
    readFile(
      path.join(
        root,
        "supabase/migrations/20260830122523_public_start_by_text.sql",
      ),
      "utf8",
    ),
  ]);

  expect(route).toContain("mode=start-by-text");
  expect(route).toContain("START_TEXT_SIGNING_SECRET");
  expect(route).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
  expect(route).toContain('createHmac("sha256", signingSecret)');
  expect(route).toContain('"x-avantia-site-timestamp": timestamp');
  expect(route).toContain('"x-avantia-site-signature": signature');
  expect(route).toContain("attempt < 2");
  expect(route).toContain("AbortSignal.timeout(12_000)");
  expect(route).toContain("AbortSignal.timeout(30_000)");
  expect(route).toContain("same idempotency key");
  expect(route).not.toContain("input.message");
  expect(broker).toContain("PUBLIC_START_TEXT_OPENING");
  expect(broker).toContain(
    "await sendQuoSms(phone, PUBLIC_START_TEXT_OPENING)",
  );
  expect(broker).toContain("EdgeRuntime.waitUntil(");
  expect(broker).toContain(
    'return json({ ok: true, delivery: "processing" }, 202)',
  );
  expect(broker).toContain("interval '5 minutes'");
  expect(broker).toContain(
    'delivery: suppressed ? "already_sent" : "processing"',
  );
  expect(broker).toContain('partial ? "partial" : "failed"');
  expect(broker).toContain('const PUBLIC_START_TEXT_TEMPLATE_VERSION = "start-material-request-v7"');
  const opening = publicStartTextOpeningMessage();
  expect(opening).toBe(
    "Hi, Carlos from Avantia Build. Send your material list, photo, plan, or current quote. We’ll check pricing, availability, and delivery. See how it works (20 sec): https://build.avantiap.com/videos/avantia-request-material-whatsapp-en-clear-20s.mp4",
  );
  expect(broker).toContain("async function ensurePublicStartLead");
  expect(broker).toContain("public.manager_outreach_leads");
  expect(broker).toContain("'public_start_lead_auto_created'");
  expect(broker).toContain('assignedTo: "Carlos"');
  expect(broker).toContain('welcomeVideo: "request-materials"');
  expect(broker).toContain("linkPublicStartMessageToLead(providerId, lead)");
  expect((broker.match(/sendQuoSms\(phone, PUBLIC_START_TEXT_OPENING\)/g) || [])).toHaveLength(1);
  expect(broker).not.toContain("sendQuoSms(phone, PUBLIC_START_TEXT_EXAMPLE");
  expect(route).toContain('result.delivery || "processing"');
  expect(route).not.toContain('result.delivery || "sent"');
  expect(broker).toContain('req.headers.get("x-avantia-site-signature")');
  expect(broker).toContain('req.headers.get("x-avantia-site-timestamp")');
  expect(broker).toContain("hmacSha256Base64RawKey(signingSecret");
  expect(broker).toContain("new TextEncoder().encode(key)");
  expect(broker).not.toContain("hmacSha256Base64(serviceKey");
  expect(broker).toContain(
    "constantTimeEqual(expectedSignature, suppliedSignature)",
  );
  expect(broker).toContain(
    "Math.abs(Date.now() - timestampMs) <= 2 * 60 * 1000",
  );
  const publicHandler = broker.slice(
    broker.indexOf("async function handlePublicStartByText"),
    broker.indexOf("Deno.serve"),
  );
  expect(publicHandler.indexOf("x-avantia-site-signature")).toBeLessThan(
    publicHandler.indexOf("x-avantia-site-origin"),
  );
  expect(publicHandler.indexOf("Invalid site dispatch signature")).toBeLessThan(
    publicHandler.indexOf("JSON.parse(payload)"),
  );
  expect(publicHandler).not.toContain("await req.json()");
  expect(broker).toContain("input.consent !== true");
  expect(broker).not.toContain("sendQuoSms(phone, input.message");
  expect(broker).toContain("interval '24 hours'");
  expect(broker).toContain("interval '1 hour'");
  expect(broker).toContain("action = 'sms_ai_customer_opted_out'");
  expect(broker).toContain("details->>'phone' = ${phone}");
  expect(broker).toContain("sms_ai_mode/off misclassification");
  expect(broker).toContain("last_error = 'sms_opted_out'");
  expect(broker).not.toContain(
    "normalized_phone = ${phone} and sms_ai_mode = 'off'",
  );
  expect(migration).toContain("enable row level security");
  expect(migration).toContain(
    "revoke all on table public.public_start_text_requests from public, anon, authenticated",
  );
  expect(migration).toContain("idempotency_key text not null unique");
});
