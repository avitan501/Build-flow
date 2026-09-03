import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { communicationInboxNavigationKey } from "../lib/aura/communication-navigation";

const root = process.cwd();

test("communication notification copy resolves sender identity and keeps an exact record link", async () => {
  const identityMigration = await readFile(
    path.join(root, "supabase/migrations/20260903023000_resolve_manager_caller_identity.sql"),
    "utf8",
  );
  const notificationMigration = await readFile(
    path.join(root, "supabase/migrations/20260903153000_harden_manager_notification_identity_and_targets.sql"),
    "utf8",
  );

  expect(identityMigration).toContain("contact.id = p_contact_id");
  expect(identityMigration).toContain("contact.normalized_phone");
  expect(identityMigration).toContain("email_value text := lower(trim(coalesce(p_email, '')))");
  expect(identityMigration).toContain("return left(email_value, 1) || '***@'");
  expect(notificationMigration).toContain("Missed call from");
  expect(notificationMigration).toContain("Incoming call from");
  expect(notificationMigration).toContain("Text message from");
  expect(notificationMigration).toContain("WhatsApp from");
  expect(notificationMigration).toContain("Email from");
  expect(notificationMigration).toContain("Note from");
  expect(notificationMigration).toContain("?communication=' || new.id::text");
  expect(notificationMigration).toContain("update public.manager_push_queue as queue");
  expect(notificationMigration).toContain("?communication=' || alert.communication_id::text");
  expect(notificationMigration).not.toContain("delete from public.manager_push_queue");
  expect(notificationMigration).not.toContain("manager_notification_reads");
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
