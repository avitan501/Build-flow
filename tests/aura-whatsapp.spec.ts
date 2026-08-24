import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("Aura dashboard is private", async ({ page }) => {
  await page.goto("/owner/aura");

  await expect(page).toHaveURL(/\/login\?next=%2Fowner%2Faura$/);
});

test("Aura broker routes email through Supabase with the business Gmail as reply-to", async () => {
  const [broker, actions] = await Promise.all([
    readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/owner/aura/actions.ts"), "utf8"),
  ]);
  expect(broker).toContain('input.action === "send_email"');
  expect(broker).toContain('reply_to: "buildavantiap@gmail.com"');
  expect(broker).toContain('Deno.env.get("RESEND_API_KEY")');
  expect(actions).toContain('action: "send_email"');
});

test("Aura webhook rejects unverified requests", async ({ request }) => {
  const verification = await request.get("/api/aura/whatsapp", {
    params: {
      "hub.mode": "subscribe",
      "hub.verify_token": "not-the-secret",
      "hub.challenge": "test-challenge",
    },
  });
  expect(verification.status()).toBe(403);

  const unsignedWebhook = await request.post("/api/aura/whatsapp", {
    data: {
      object: "whatsapp_business_account",
      entry: [],
    },
  });
  expect(unsignedWebhook.status()).toBe(401);

  const unsignedTwilioWebhook = await request.post("/api/aura/whatsapp/twilio", {
    form: {
      MessageSid: "SM-test",
      From: "whatsapp:+13475675077",
      To: "whatsapp:+15169088319",
      Body: "Hello",
    },
  });
  expect(unsignedTwilioWebhook.status()).toBe(401);
});

test("Twilio replies use the same server connection as outbound WhatsApp", async () => {
  const route = await readFile(
    path.join(process.cwd(), "app/api/aura/whatsapp/twilio/route.ts"),
    "utf8",
  );

  expect(route).toContain("verifyTwilioWhatsAppRequest(request.url, signature, params)");
  expect(route).toContain("await processTwilioWhatsAppWebhook(params)");
  expect(route).not.toContain("functions/v1/aura-messaging-broker?mode=twilio-webhook");
});

test("Aura Q U O webhook rejects unsigned requests", async ({ request }) => {
  const unsignedWebhook = await request.post("/api/aura/quo", {
    data: {
      id: "EV-test",
      object: "event",
      createdAt: new Date().toISOString(),
      type: "message.received",
      data: { object: { id: "AC-test", body: "Hello" } },
    },
  });

  expect(unsignedWebhook.status()).toBe(401);
  expect(await unsignedWebhook.text()).toBe("Invalid signature");
});

test("Aura email webhook rejects unsigned requests", async ({ request }) => {
  const unsignedWebhook = await request.post("/api/aura/resend", {
    data: {
      type: "email.received",
      data: { email_id: "email-test", from: "client@example.com" },
    },
  });

  expect(unsignedWebhook.status()).toBe(401);
  expect(await unsignedWebhook.text()).toBe("Invalid signature");
});
