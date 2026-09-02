import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260902142250_create_unified_communication_outbox.sql",
);

test("unified communication outbox is durable, private, and backward compatible", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("create table if not exists public.aura_message_outbox (");
  expect(sql).toContain("channel in ('sms', 'whatsapp', 'email')");
  expect(sql).toContain("provider in ('quo', 'two_chat', 'resend')");
  expect(sql).toContain("dedupe_key text not null unique");
  expect(sql).toContain("payload_hash text not null");
  expect(sql).toContain("where status in ('pending', 'retry_wait')");
  expect(sql).toContain("protect_aura_message_outbox_payload");
  expect(sql).toContain("Aura message outbox payload is immutable");
  expect(sql).not.toMatch(/drop table\s+(?:if exists\s+)?public\.aura_sms_outbox/i);

  for (const table of [
    "aura_message_outbox",
    "aura_message_outbox_attachments",
    "aura_message_outbox_events",
  ]) {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toContain(`revoke all on table public.${table} from public, anon, authenticated`);
  }
});

test("attachments remain private references and delivery history is append-only", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("storage_bucket text not null default 'project-uploads'");
  expect(sql).toContain("check (storage_bucket = 'project-uploads')");
  expect(sql).toContain("content_sha256 text");
  expect(sql).toContain("Aura message outbox attachments are immutable");
  expect(sql).toContain("Aura message outbox events are append-only");
  expect(sql).toContain("after insert or update on public.aura_message_outbox");
});

test("the recovery dispatcher is scheduled without embedding credentials", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("vault.decrypted_secrets");
  expect(sql).toContain("https://nprfhspwdflpqlopydmp.supabase.co");
  expect(sql).toContain("aura-communication-outbox-worker?mode=communication-outbox-dispatch");
  expect(sql).toContain("X-Communication-Outbox-Dispatch");
  expect(sql).toContain("dispatch-communication-outbox");
  expect(sql).not.toMatch(/(?:api[_-]?key|token|secret)\s*[=:]\s*['\"][A-Za-z0-9_-]{20,}/i);
});
