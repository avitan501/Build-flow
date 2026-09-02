import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  attachmentCapability,
  classifyProviderOutcome,
  safeRetryDelaySeconds,
} from "../supabase/functions/_shared/communication-outbox-policy";

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

test("provider outcomes never blindly retry an ambiguous send", () => {
  expect(classifyProviderOutcome(202)).toEqual({ kind: "accepted", status: "accepted" });
  expect(classifyProviderOutcome(429)).toMatchObject({ kind: "retry", status: "retry_wait" });
  expect(classifyProviderOutcome(422)).toMatchObject({ kind: "terminal", status: "failed" });
  expect(classifyProviderOutcome(503)).toMatchObject({ kind: "ambiguous", status: "ambiguous" });
  expect(safeRetryDelaySeconds(1)).toBe(10);
  expect(safeRetryDelaySeconds(20)).toBe(640);
  expect(safeRetryDelaySeconds(2, 45)).toBe(45);
});

test("attachment capabilities match the actual provider APIs", () => {
  expect(attachmentCapability("sms", 1)).toEqual({
    supported: false,
    reason: "quo_api_does_not_support_attachments",
  });
  expect(attachmentCapability("whatsapp", 2)).toEqual({
    supported: false,
    reason: "two_chat_one_attachment_per_message",
  });
  expect(attachmentCapability("whatsapp", 1)).toEqual({ supported: true });
  expect(attachmentCapability("email", 3)).toEqual({ supported: true });
});

test("worker claims atomically, resolves real attachments, and preserves unknown outcomes", async () => {
  const worker = await read("supabase/functions/aura-communication-outbox-worker/index.ts");

  expect(worker).toContain("for update skip locked");
  expect(worker).toContain("worker_stopped_during_send");
  expect(worker).toContain("The message will not be sent twice");
  expect(worker).toContain("createSignedUrl(attachment.storage_path, 15 * 60)");
  expect(worker).toContain(".download(attachment.storage_path)");
  expect(worker).toContain('"Idempotency-Key": `avantia-outbox/${row.id}`');
  expect(worker).toContain("attachments: attachments.length");
  expect(worker).toContain('url: mediaUrl');
  expect(worker).toContain('status = \'needs_review\'');
  expect(worker).not.toMatch(/console\.log\([^)]*(?:message_body|apiKey|dispatchSecret)/);
});

test("manager sends enqueue all three channels with stable browser request keys", async () => {
  const [broker, actions, inbox] = await Promise.all([
    read("supabase/functions/aura-messaging-broker/index.ts"),
    read("app/owner/aura/actions.ts"),
    read("components/buildflow/unified-communication-inbox.tsx"),
  ]);

  expect(broker).toContain("enqueueManagerMessage(");
  expect(broker).toContain('"sms",');
  expect(broker).toContain('"whatsapp",');
  expect(broker).toContain('"email",');
  expect(broker).toContain("public.enqueue_aura_message_outbox(");
  expect(broker).toContain("communication_outbox_dispatch_failed");
  expect(actions).toContain("sendAuraMessageWithAttachmentAction");
  expect(actions).toContain('storageBucket: "project-uploads"');
  expect(inbox).toContain("const idempotencyKey = crypto.randomUUID()");
  expect(inbox).toContain("sendAuraMessageWithAttachmentAction(formData)");
  expect(inbox).toContain('status: "queued"');
});

test("delivery receipts flow back into the durable outbox history", async () => {
  const [broker, migration] = await Promise.all([
    read("supabase/functions/aura-messaging-broker/index.ts"),
    read("supabase/migrations/20260902142525_add_unified_communication_outbox_routines.sql"),
  ]);

  expect(broker).toContain('"email.delivered": "delivered"');
  expect(broker).toContain('"email.bounced": "bounced"');
  expect(broker).toContain('"email.complained": "complained"');
  expect(migration).toContain("sync_aura_message_outbox_from_communication");
  expect(migration).toContain("after update of status on public.aura_communications");
  expect(migration).toContain("idempotency key reused with a different payload");
  expect(migration).toContain("pg_advisory_xact_lock");
});
