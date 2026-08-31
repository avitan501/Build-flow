import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("live SMS automation prioritizes the new message without draining old backlog first", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  const drain = broker.slice(
    broker.indexOf("async function drainSmsAutomationQueue"),
    broker.indexOf("async function handleSmsAutomationDispatch"),
  );
  const webhook = broker.slice(
    broker.indexOf("async function handleQuoWebhook"),
    broker.indexOf("async function sendTwoChatWhatsApp"),
  );
  const polled = broker.slice(
    broker.indexOf("async function ingestPolledQuoMessage"),
    broker.indexOf("async function pollRecentQuoMessagesOnce"),
  );

  expect(drain).toContain("preferredCommunicationId");
  expect(drain).toContain(
    "case when communication_id = ${preferred}::uuid then 0 else 1 end",
  );
  expect(webhook).toContain("dispatchSmsAutomationWorker()");
  expect(webhook).not.toContain("drainSmsAutomationQueue(1, stored[0].id)");
  expect(webhook).toContain("const processAcceptedEvent = async () =>");
  expect(webhook).toContain("EdgeRuntime.waitUntil(");
  expect(webhook).toContain("accepted: true }, 202");
  expect(webhook).toContain("${sql.json(payload)}");
  expect(polled).toContain("select id from public.aura_communications");
  expect(polled).toContain("if (existing[0]?.id)");
  expect(polled).toContain("dispatchSmsAutomationWorker()");
  expect(polled).not.toContain("canonical[0]?.external_event_id");
  expect(polled).not.toContain("drainSmsAutomationQueue(1, inserted[0].id)");
  const dispatch = broker.slice(
    broker.indexOf("async function handleSmsAutomationDispatch"),
    broker.indexOf("async function handleQuoWebhook"),
  );
  expect(dispatch).toContain("EdgeRuntime.waitUntil(");
  expect(dispatch).toContain("drainSmsAutomationQueue(1)");
  expect(dispatch).toContain("accepted: true }, 202");
});

test("Quo acknowledgement and SMS AI run in separate workers", async () => {
  const receiver = await readFile(
    path.join(root, "supabase/functions/aura-quo-webhook-receiver/index.ts"),
    "utf8",
  );
  const migration = await readFile(
    path.join(
      root,
      "supabase/migrations/20260831115402_isolate_sms_automation_worker.sql",
    ),
    "utf8",
  );

  expect(receiver).toContain("EdgeRuntime.waitUntil(");
  expect(receiver).toContain("aura-quo-fast-poll-worker?mode=quo-fast-poll");
  expect(receiver).toContain("return json({ ok: true, accepted: true }, 202)");
  expect(migration).toContain(
    "/functions/v1/aura-sms-automation-worker?mode=sms-automation-dispatch",
  );
  expect(migration).toContain("timeout_milliseconds := 10000");
  expect(migration).not.toContain(
    "/functions/v1/aura-messaging-broker?mode=sms-automation-dispatch",
  );
  const smsWorker = await readFile(
    path.join(root, "supabase/functions/aura-sms-automation-worker/index.ts"),
    "utf8",
  );
  const pollWorker = await readFile(
    path.join(root, "supabase/functions/aura-quo-fast-poll-worker/index.ts"),
    "utf8",
  );
  expect(smsWorker).toContain('import "../aura-messaging-broker/index.ts"');
  expect(pollWorker).toContain('import "../aura-messaging-broker/index.ts"');
});

test("SMS secret reads are coalesced and warm-isolate cached", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  const secrets = broker.slice(
    broker.indexOf("const SECRET_CACHE_TTL_MS"),
    broker.indexOf("async function requireManager"),
  );

  expect(secrets).toContain("const SECRET_CACHE_TTL_MS = 60_000");
  expect(secrets).toContain("const secretLoads = new Map");
  expect(secrets).toContain("if (inFlight) return await inFlight");
  expect(secrets).toContain("secretCache.set(name");
  expect(secrets).toContain("secretCache.delete(name)");
});

test("normal AI turns have a fast deadline while complex turns retain headroom", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  const analyzer = broker.slice(
    broker.indexOf("async function analyzeCustomerSms"),
    broker.indexOf("function extractReviewMaterialLines"),
  );

  expect(analyzer).toContain("const escalated = needsCustomerReplyEscalation");
  expect(analyzer).toContain("escalated ? 15_000 : 8_000");
  expect(analyzer).toContain("customerSmsFallback");
});

test("provider replays and concurrent workers cannot send duplicate replies", async () => {
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );

  expect(broker).toContain("canonicalEvents[0]?.external_event_id === eventId");
  expect(broker).toContain("on conflict (communication_id) do nothing");
  expect(broker).toContain("for update skip locked");
  expect(broker).toContain("if (shouldAuto && replyDrafts[0]?.id)");
});
