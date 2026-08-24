import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
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

test("Twilio replies use the direct connection or the secure Vault broker", async () => {
  const [route, broker] = await Promise.all([
    readFile(path.join(process.cwd(), "app/api/aura/whatsapp/twilio/route.ts"), "utf8"),
    readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
  ]);

  expect(route).toContain("verifyTwilioWhatsAppRequest(request.url, signature, params)");
  expect(route).toContain("await processTwilioWhatsAppWebhook(params)");
  expect(route).toContain("functions/v1/aura-messaging-broker?mode=twilio-webhook");
  expect(route).toContain('"x-avantia-canonical-url": request.url');
  expect(route).toContain("if (!storedByBroker) await processTwilioWhatsAppWebhook(params)");
  expect(broker).toContain('req.headers.get("x-avantia-canonical-url") || req.url');
  expect(broker).toContain("syncRecentTwilioWhatsApp");
  expect(broker).toContain('direction === "inbound"');
  expect(broker).toContain("await syncRecentTwilioWhatsApp()");
});

test("missed Twilio replies are synchronized and ADD commands remain idempotent", async () => {
  const [twilioSource, ownerCommand, managerPage] = await Promise.all([
    readFile(path.join(process.cwd(), "lib/aura/twilio-whatsapp.ts"), "utf8"),
    readFile(path.join(process.cwd(), "lib/aura/owner-command.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/admin/communications/page.tsx"), "utf8"),
  ]);

  expect(twilioSource).toContain("syncRecentTwilioWhatsAppMessages");
  expect(twilioSource).toContain('message.direction === "inbound"');
  expect(twilioSource).toContain("existing.has(message.sid)");
  expect(ownerCommand).toContain("processAuraOwnerCommand");
  expect(ownerCommand).toContain("createAuraIntake");
  expect(managerPage).toContain("await syncRecentTwilioWhatsAppMessages()");
  expect(managerPage).toContain("loadManagerAura(supabase)");
  expect(managerPage).toContain("loadAuraDashboard(createAdminClient())");
  expect(managerPage).toContain("aura-messaging-broker");
});

test("lead and customer actions offer confirmed WhatsApp video attachments", async () => {
  const [actions, contactActions, videos] = await Promise.all([
    readFile(path.join(process.cwd(), "app/owner/aura/actions.ts"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/contact-actions.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "lib/aura/share-videos.ts"), "utf8"),
  ]);
  const assets = [
    "avantia-request-material-whatsapp-en-clear-20s.mp4",
    "avantia-why-contractors-hire-us-en-slow.mp4",
  ];

  expect(contactActions).toContain("Send video");
  expect(contactActions).toContain("Confirm send");
  expect(actions).toContain("sendAuraVideoAction");
  expect(actions).toContain('type: "video/mp4"');
  expect(actions).toContain('action: "send_whatsapp"');
  expect(actions).toContain("mediaUrl,");
  expect(actions).toContain("sendTwilioWhatsAppMessage(phone, caption, mediaUrl)");
  const broker = await readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8");
  expect(broker).toContain('form.set("MediaUrl", mediaUrl)');
  expect(broker).toContain("build\\.avantiap\\.com\\/videos");
  expect(videos).toContain("How to Request Materials");
  expect(videos).toContain("Why Contractors Hire Avantia");
  for (const asset of assets) {
    const details = await stat(path.join(process.cwd(), "public/videos", asset));
    expect(details.size).toBeGreaterThan(100_000);
  }
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
