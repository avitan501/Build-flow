import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("communications use delta updates instead of full-page polling", () => {
  const inbox = readFileSync(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8");
  const updates = readFileSync(path.join(root, "app/api/admin/communications/updates/route.ts"), "utf8");
  expect(inbox).toContain("/api/admin/communications/updates?after=");
  expect(inbox).not.toContain("window.setInterval(refresh, 10_000)");
  expect(inbox).toContain("setLiveCommunications");
  expect(inbox).toContain("markCommunicationConversationReadAction");
  expect(updates).toContain('.gt("last_event_at", cursor)');
  expect(updates).toContain("Server-Timing");
});

test("provider webhooks rely on one deduplicated push source", () => {
  for (const file of [
    "app/api/aura/quo/route.ts",
    "app/api/aura/whatsapp/twilio/route.ts",
    "app/api/aura/whatsapp/2chat/route.ts",
  ]) {
    const source = readFileSync(path.join(root, file), "utf8");
    expect(source).not.toContain("notifyManagersSafely");
  }
  const notifications = readFileSync(path.join(root, "lib/manager-push-notifications.ts"), "utf8");
  expect(notifications).toContain('.rpc("queue_manager_push_event"');
});

test("ambiguous provider failures do not fall back to a second send", () => {
  const actions = readFileSync(path.join(root, "app/owner/aura/actions.ts"), "utf8");
  const sendSection = actions.slice(actions.indexOf("export async function sendAuraMessageAction"), actions.indexOf("export async function getTwoChatVoiceTokenAction"));
  expect(sendSection).toContain("invokeMessagingBroker");
  expect(sendSection).not.toContain("sendAuraQuoText");
  expect(sendSection).not.toContain("sendAuraWhatsAppText");
  expect(sendSection).not.toContain("sendAuraEmail");
});

test("Carlos activity timeline records page changes and communications", () => {
  const reporter = readFileSync(path.join(root, "app/admin/activity-actions.ts"), "utf8");
  const timeline = readFileSync(path.join(root, "app/admin/carlos-activity/page.tsx"), "utf8");
  const migration = readFileSync(path.join(root, "supabase/migrations/20260902174500_add_manager_staff_activity_timeline.sql"), "utf8");
  expect(reporter).toContain('event_type: "page_view"');
  expect(reporter).toContain('event_type: "communication_sent"');
  expect(timeline).toContain("Carlos activity");
  expect(timeline).toContain("Live history");
  expect(migration).toContain("manager_staff_activity_events");
  expect(migration).toContain("enable row level security");
});

test("conversation assignment keeps contact notes and uses structured links", () => {
  const actions = readFileSync(path.join(root, "app/admin/communications/actions.ts"), "utf8");
  const broker = readFileSync(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8");
  const inbox = readFileSync(path.join(root, "components/buildflow/unified-communication-inbox.tsx"), "utf8");
  const page = readFileSync(path.join(root, "app/admin/communications/page.tsx"), "utf8");

  const action = actions.slice(
    actions.indexOf("export async function linkCommunicationContactAction"),
    actions.indexOf("export async function linkEmailConversationAction"),
  );
  const brokerAction = broker.slice(
    broker.indexOf('if (input.action === "link_communication_contact")'),
    broker.indexOf('if (input.action === "quality_check_sms_ai")'),
  );
  expect(action).toContain("addAuraCommunicationLinks");
  expect(action).toContain("notes: null");
  expect(action).not.toContain("Avantia link:");
  expect(brokerAction).not.toContain("Avantia link:");
  expect(brokerAction).not.toContain("notes =");
  expect(page).toContain("loadAuraCommunicationLinks");
  expect(inbox).toContain("communication.links?.find");
});

test("communications page does not load the hidden legacy log", () => {
  const page = readFileSync(path.join(root, "app/admin/communications/page.tsx"), "utf8");
  expect(page).not.toContain("CommunicationCenter");
  expect(page).not.toContain("COMMUNICATION_LOG_PREFIX");
  expect(page).not.toContain("listInboxThreads");
});
