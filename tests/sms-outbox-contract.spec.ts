import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const migration = path.join(
  root,
  "supabase/migrations/20260831124500_add_aura_sms_outbox.sql",
);
const broker = path.join(
  root,
  "supabase/functions/aura-messaging-broker/index.ts",
);

async function sources() {
  const [sql, code] = await Promise.all([
    readFile(migration, "utf8"),
    readFile(broker, "utf8"),
  ]);
  return { sql: sql.toLowerCase(), code };
}

test("outbox is service-role only and payload is immutable", async () => {
  const { sql } = await sources();
  expect(sql).toContain("alter table public.aura_sms_outbox enable row level security");
  expect(sql).toContain("revoke all on table public.aura_sms_outbox from public, anon, authenticated");
  expect(sql).toContain("grant all on table public.aura_sms_outbox to service_role");
  for (const field of ["normalized_phone", "message_body", "message_hash"]) {
    expect(sql).toContain(`new.${field} is distinct from old.${field}`);
  }
  expect(sql).toContain("payload is immutable");
});

test("reply and confirmation parts each have a stable unique owner", async () => {
  const { sql, code } = await sources();
  expect(sql).toContain("dedupe_key text not null unique");
  expect(sql).toContain("aura_sms_outbox_reply_part_uidx");
  expect(sql).toContain("aura_sms_outbox_confirmation_part_uidx");
  expect(sql).toContain("num_nonnulls(reply_draft_id, pending_confirmation_id) = 1");
  expect(code).toContain("reply:${inserted[0].id}:${index}");
  expect(code).toContain("confirmation:${inserted[0].id}:0");
});

test("ambiguous results reconcile and never return to the POST-ready set", async () => {
  const { code } = await sources();
  expect(code).toContain('outbox.status = \'ambiguous\'');
  expect(code).toContain('then \'reconciling\' else \'claimed\'');
  expect(code).toContain("createdAfter");
  expect(code).toContain("no duplicate will be sent");
  const outboxWorker = code.split("async function processAuraSmsOutbox", 2)[1] || "";
  const ready = outboxWorker.match(/with candidate as \([\s\S]{0,1500}for update skip locked/)?.[0] || "";
  expect(ready).toContain("status in ('pending','retry_wait')");
  expect(ready).not.toContain("status in ('pending','retry_wait','ambiguous')");
});

test("429 is retryable while 5xx and transport errors are ambiguous", async () => {
  const { code } = await sources();
  expect(code).toContain("response.status === 429");
  expect(code).toContain('headers.get("retry-after")');
  expect(code).toContain("status = 'retry_wait'");
  expect(code).toContain("ambiguous_provider_response");
  expect(code).toContain("transport_unknown");
  expect(code).toContain("row.attempt_count >= 6");
  expect(code).toContain("send_started_at = now()");
});

test("known provider rejection is terminal", async () => {
  const { code } = await sources();
  expect(code).toContain("[400, 401, 402, 403, 404, 422]");
  expect(code).toContain("status = 'dead_letter'");
});

test("workers claim with SKIP LOCKED and stale sending never retries", async () => {
  const { code } = await sources();
  expect(code).toMatch(/for update skip locked limit 1/i);
  expect(code).toContain("status = 'ambiguous'");
  expect(code).toContain("status = 'retry_wait'");
  expect(code).toContain("status = 'sending' and locked_at < now() - interval '2 minutes'");
  expect(code).toContain("status = 'reconciling' and locked_at < now() - interval '2 minutes'");
  expect(code).toContain("reconcile_attempt_count = reconcile_attempt_count + 1");
  expect(code).toContain("when reconcile_attempt_count >= 2 then 'needs_review'");
});

test("parent becomes sent only after provider-confirmed outbox delivery", async () => {
  const { code } = await sources();
  expect(code).toContain('states.every((item) => item.status === "sent")');
  expect(code).toContain("decision = 'auto_sent'");
  expect(code).toContain("summary_sent_at = coalesce(summary_sent_at, now())");
  expect(code).toContain("summary_sent_at is null");
  expect(code).toContain("set status = 'send_failed'");
  expect(code).toContain("unfinishedParents");
  expect(code).toContain("outbox.status in ('sent', 'dead_letter', 'ambiguous', 'reconciling', 'needs_review')");
  expect(code).toContain("follow_up_prompt");
  expect(code).toContain("decision = 'auto_queued'");
});

test("dedicated recovery worker is scheduled continuously", async () => {
  const { sql } = await sources();
  expect(sql).toContain("dispatch_sms_outbox()");
  expect(sql).toContain("aura-sms-outbox-worker?mode=sms-outbox-dispatch");
  expect(sql).toContain("dispatch-sms-outbox");
  expect(sql).toContain("'30 seconds'");
  expect((await sources()).code).toContain("processAuraSmsOutbox(1)");
});
