import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { communicationInboxNavigationKey } from "../lib/aura/communication-navigation";

const root = process.cwd();

test("communication notification copy resolves sender identity and keeps an exact record link", async () => {
  const migration = await readFile(
    path.join(root, "supabase/migrations/20260903153000_harden_manager_notification_identity_and_targets.sql"),
    "utf8",
  );

  expect(migration).toContain("contact.id = p_contact_id");
  expect(migration).toContain("contact.normalized_phone");
  expect(migration).toContain("lower(trim(coalesce(contact.email, ''))) = email_value");
  expect(migration).toContain("Missed call from");
  expect(migration).toContain("Incoming call from");
  expect(migration).toContain("Text message from");
  expect(migration).toContain("WhatsApp from");
  expect(migration).toContain("Email from");
  expect(migration).toContain("Note from");
  expect(migration).toContain("?communication=' || new.id::text");
  expect(migration).toContain("update public.manager_push_queue as queue");
  expect(migration).toContain("?communication=' || alert.communication_id::text");
  expect(migration).not.toContain("delete from public.manager_push_queue");
  expect(migration).not.toContain("manager_notification_reads");
});

test("query-only notification navigation remounts the inbox on the exact target", async () => {
  const page = await readFile(path.join(root, "app/admin/communications/page.tsx"), "utf8");

  expect(page).toContain("communicationInboxNavigationKey({");
  expect(page).toContain("communicationId: exactCommunicationId,");
  expect(page).toContain("thread: exactThread,");
  expect(page).toContain("key={inboxNavigationKey}");
  expect(page).toContain("initialCommunicationId={exactCommunicationId}");
  expect(page).toContain('.eq("id", exactCommunicationId)');

  const firstTarget = communicationInboxNavigationKey({
    channel: "sms",
    communicationId: "communication-one",
    thread: "",
    query: "",
    draft: "",
  });
  const secondTarget = communicationInboxNavigationKey({
    channel: "sms",
    communicationId: "communication-two",
    thread: "",
    query: "",
    draft: "",
  });

  expect(firstTarget).not.toBe(secondTarget);
});
