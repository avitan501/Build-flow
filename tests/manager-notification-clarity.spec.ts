import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("lock-screen communication notifications name the event, sender, subject, and content", async () => {
  const migration = await readFile(
    path.join(root, "supabase/migrations/20260904013000_make_manager_notifications_self_explanatory.sql"),
    "utf8",
  );

  for (const title of [
    "Missed call · ",
    "Incoming call · ",
    "Email received · ",
    "WhatsApp received · ",
    "Text received · ",
    "Note added · ",
  ]) expect(migration).toContain(title);

  expect(migration).toContain("Subject: ");
  expect(migration).toContain("Preview: ");
  expect(migration).toContain("Message: ");
  expect(migration).toContain("What happened: the call was not answered");
  expect(migration).toContain("attachment_count");
  expect(migration).toContain("private.manager_notification_party_label");
  expect(migration).toContain("left(event_body, 240)");
  expect(migration).toContain("update public.manager_push_queue as queue");
  expect(migration).not.toContain("delete from public.manager_push_queue");
  expect(migration).not.toContain("manager_notification_reads");
});
