import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import path from "node:path";

test("Aura dashboard is private", async ({ page }) => {
  await page.goto("/owner/aura");

  await expect(page).toHaveURL(/\/login\?next=%2Fowner%2Faura$/);
});

test("Aura broker routes email through Supabase with the business mailbox as reply-to", async () => {
  const [broker, actions] = await Promise.all([
    readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/owner/aura/actions.ts"), "utf8"),
  ]);
  expect(broker).toContain('input.action === "send_email"');
  expect(broker).toContain('reply_to: "office@build.avantiap.com"');
  expect(broker).toContain('Deno.env.get("RESEND_API_KEY")');
  expect(actions).toContain('action: "send_email"');
});

test("Aura receives signed Resend email events through the secure broker", async () => {
  const broker = await readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8");

  expect(broker).toContain('url.searchParams.get("mode") === "resend-webhook"');
  expect(broker).toContain('Deno.env.get("AURA_RESEND_WEBHOOK_SECRET")');
  expect(broker).toContain("validResendSignature");
  expect(broker).toContain("https://api.resend.com/emails/receiving/");
  expect(broker).toContain('channel: "email"');
  expect(broker).toContain('direction: "incoming"');
  expect(broker).toContain('receive: Boolean(Deno.env.get("AURA_RESEND_WEBHOOK_SECRET"))');
});

test("Aura normalizes legacy JSON strings before rendering communications", async () => {
  const dashboard = await readFile(path.join(process.cwd(), "lib/aura/dashboard.ts"), "utf8");
  const managerPage = await readFile(path.join(process.cwd(), "app/admin/communications/page.tsx"), "utf8");
  const broker = await readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8");

  expect(dashboard).toContain("normalizeAuraCommunications");
  expect(dashboard).toContain("JSON.parse(value)");
  expect(managerPage).toContain("normalizeAuraCommunications(exactCommunicationResult.data ? [exactCommunicationResult.data] : [])");
  expect(broker).toContain("sql.json(input.nextSteps || [])");
  expect(broker).toContain("sql.json(input.media || [])");
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

  const unsignedTwoChatWebhook = await request.post("/api/aura/whatsapp/2chat", {
    data: {
      id: "MSG-test",
      sent_by: "user",
      remote_phone_number: "+13475675077",
      message: { text: "Hello" },
    },
  });
  expect(unsignedTwoChatWebhook.status()).toBe(401);

  const unsignedTwoChatCallWebhook = await request.post("/api/aura/2chat/calls", {
    data: { uuid: "CDRtest", direction: "I", from: "+13475675077", received_on_number: "+13479378665" },
  });
  expect(unsignedTwoChatCallWebhook.status()).toBe(401);
});

test("legacy 2Chat call webhooks stay protected while Communications uses the safe Q U O launcher", async () => {
  const [route, broker, actions, inbox, launcher] = await Promise.all([
    readFile(path.join(process.cwd(), "app/api/aura/2chat/calls/route.ts"), "utf8"),
    readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/owner/aura/actions.ts"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/unified-communication-inbox.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/communication-call-launcher.tsx"), "utf8"),
  ]);
  expect(route).toContain("mode=2chat-call-webhook");
  expect(route).toContain('"x-avantia-2chat-token": token');
  expect(broker).toContain('TWO_CHAT_BUSINESS_PHONE = "+13479378665"');
  expect(broker).toContain('input.action === "activate_2chat_whatsapp"');
  expect(broker).toContain("activeTwoChatWhatsAppConfig");
  expect(broker).toContain('input.action === "twochat_voice_token"');
  expect(broker).toContain("/open/sdk/access-token");
  expect(broker).toContain("call.status.update");
  expect(broker).toContain("gpt-4o-mini-transcribe");
  expect(actions).toContain('action: "twochat_voice_token"');
  expect(launcher).toContain("communicationQuoCallHref");
  expect(launcher).not.toContain('@2chat/voice-sdk');
  expect(launcher).not.toContain("getTwoChatVoiceTokenAction");
  expect(inbox).toContain("CommunicationCallLauncher");
  expect(inbox).not.toContain("TwoChatSoftphone");
  expect(inbox).toContain('aria-label={`Call ${activeConversation.name}`}');
  expect(inbox).toContain("Save this number");
  expect(inbox).toContain("Link to an existing person instead");
  expect(broker).not.toContain('await sendTwilioWhatsApp(input.to, input.message');
});

test("direct Meta WhatsApp uses Vault-backed verification and delivery without 2Chat credentials", async () => {
  const [route, broker, worker, actions, setup, dashboard] = await Promise.all([
    readFile(path.join(process.cwd(), "app/api/aura/whatsapp/route.ts"), "utf8"),
    readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(process.cwd(), "supabase/functions/aura-communication-outbox-worker/index.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/owner/aura/actions.ts"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/aura-connection-setup.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "lib/aura/dashboard.ts"), "utf8"),
  ]);

  expect(route).toContain('brokerUrl.searchParams.set("mode", "meta-whatsapp-webhook")');
  expect(route).toContain('request.headers.get("x-hub-signature-256")');
  expect(route).not.toContain("AURA_WHATSAPP_APP_SECRET");
  expect(broker).toContain('input.action === "configure_meta_whatsapp"');
  expect(broker).toContain('input.action === "activate_meta_whatsapp"');
  expect(broker).toContain('url.searchParams.get("mode") === "meta-whatsapp-webhook"');
  expect(broker).toContain("handleMetaWhatsAppVerification");
  expect(broker).toContain("handleMetaWhatsAppWebhook");
  expect(broker).toContain("metaWhatsAppConfig(false)");
  expect(broker).toContain("hmacSha256HexRawKey");
  expect(broker).toContain('change.field !== "messages"');
  expect(broker).toContain('provider: "whatsapp"');
  expect(broker).toContain('where provider = \'whatsapp\' and external_activity_id = ${receipt.id}');
  expect(broker).toContain('whatsappProvider: activeWhatsApp ? directMetaSelected ? "meta" : "2chat" : null');
  expect(broker).toContain("aura_meta_whatsapp_access_token");
  expect(broker).toContain("aura_meta_whatsapp_app_secret");
  expect(broker).toContain("aura_meta_whatsapp_verify_token");
  expect(broker).toContain("aura_meta_whatsapp_business_account_id");
  expect(broker).toContain("aura_meta_whatsapp_phone_number_id");
  expect(broker).not.toContain('saveSecret(secretNames.twoChatKey, accessToken');
  expect(worker).toContain('vaultSecret("aura_whatsapp_provider")');
  expect(worker).toContain('vaultSecret("aura_meta_whatsapp_access_token")');
  expect(worker).toContain('https://graph.facebook.com/${meta.graphVersion}/${meta.phoneNumberId}/messages');
  expect(worker).toContain('messaging_product: "whatsapp"');
  expect(worker).toContain("Array.isArray(payload.messages)");
  expect(worker).toContain('if (!meta) throw new Error("provider_not_configured")');
  expect(broker).toContain('input.action === "send_sms"');
  expect(actions).toContain('provider === "meta-whatsapp"');
  expect(actions).toContain('action: "configure_meta_whatsapp"');
  expect(actions).toContain('action: "activate_meta_whatsapp"');
  expect(setup).toContain("Direct Meta WhatsApp");
  expect(setup).toContain('value="meta-whatsapp"');
  expect(setup).not.toContain('value="2chat"');
  expect(setup).toContain("2Chat remains only for the existing call and recording service");
  expect(setup).toContain("I verified and subscribed messages · Activate");
  expect(setup).toContain('value="quo"');
  expect(dashboard).toContain("brokerStatus?.whatsappProvider");
  expect(dashboard).toContain("Boolean(brokerStatus?.whatsapp)");
});

test("legacy Twilio webhooks remain verified but cannot become the active WhatsApp fallback", async () => {
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
  expect(broker).not.toContain("if (!activeTwoChat) await syncRecentTwilioWhatsApp()");
});

test("legacy Twilio replies sync in the background before paginated history is merged", async () => {
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
  expect(managerPage).toContain("after(() => syncRecentTwilioWhatsAppMessages().catch(() => null))");
  expect(managerPage).toContain("loadManagerAura(supabase)");
  expect(managerPage).toContain("loadCommunicationHistoryPage");
  expect(managerPage).toContain("mergeCommunicationHistory");
  expect(managerPage).toContain("normalizeAuraCommunications");
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

  expect(contactActions).toContain("Send a Video");
  expect(contactActions).toContain("Confirm send");
  expect(actions).toContain("sendAuraVideoAction");
  expect(actions).toContain('action: "send_whatsapp"');
  expect(actions).toContain("mediaUrl,");
  expect(actions).toContain("invokeMessagingBroker(supabase");
  expect(actions).toContain("buildAuraShareVideoCaption(video, input.recipientName)");
  expect(contactActions).toContain("buildAuraShareVideoCaption(selectedVideo, name)");
  const broker = await readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8");
  expect(broker).toContain("url: mediaUrl || undefined");
  expect(broker).toContain("build\\.avantiap\\.com\\/");
  expect(videos).toContain("How to Request Materials");
  expect(videos).toContain("Why Contractors Hire Avantia");
  expect(videos).toContain("https://wa.me/13479378665");
  expect(videos).toContain("welcome to Avantia Build");
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

test("Aura Q U O inbound events use Vault-backed verification", async () => {
  const [route, broker, actions, setup] = await Promise.all([
    readFile(path.join(process.cwd(), "app/api/aura/quo/route.ts"), "utf8"),
    readFile(path.join(process.cwd(), "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/owner/aura/actions.ts"), "utf8"),
    readFile(path.join(process.cwd(), "components/buildflow/aura-connection-setup.tsx"), "utf8"),
  ]);

  expect(route).toContain("mode=quo-webhook");
  expect(route).toContain('"openphone-signature": signature');
  expect(route).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  expect(broker).toContain('quoWebhookSecret: "aura_quo_webhook_signing_secret"');
  expect(broker).toContain('quoPhoneNumberId: "aura_quo_phone_number_id"');
  expect(broker).toContain("validQuoSignature");
  expect(broker).toContain("matchesConfiguredBusinessPhone");
  expect(broker).toContain("eventBusinessPhone === configuredBusinessPhone");
  expect(broker).toContain('input.action === "configure_quo_webhook"');
  expect(broker).toContain('quo: { receive: Boolean(smsReceive), send: Boolean(sms) }');
  expect(actions).toContain('provider === "quo-webhook"');
  expect(setup).toContain("Connect incoming calls & texts");
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
