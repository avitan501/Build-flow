import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  communicationHistoryCursor,
  parseCommunicationHistoryCursor,
} from "../lib/aura/communication-history-cursor";

const read = (file: string) => readFile(path.join(process.cwd(), file), "utf8");

test("history cursor is stable, composite, and rejects malformed input", () => {
  const cursor = communicationHistoryCursor({
    id: "00000000-0000-4000-8000-000000000123",
    occurred_at: "2026-09-02T15:30:00.000Z",
  });
  expect(cursor).toBe("2026-09-02T15:30:00.000Z~00000000-0000-4000-8000-000000000123");
  expect(parseCommunicationHistoryCursor(cursor)).toEqual({
    occurredAt: "2026-09-02T15:30:00.000Z",
    id: "00000000-0000-4000-8000-000000000123",
  });
  expect(parseCommunicationHistoryCursor("2026-09-02T15:30:00.000Z")).toBeNull();
  expect(parseCommunicationHistoryCursor("invalid~00000000-0000-4000-8000-000000000123")).toBeNull();
});

test("database history uses true keyset pagination and retains communication links", async () => {
  const migration = await read("supabase/migrations/20260902154000_add_communication_history_pagination.sql");

  expect(migration).toContain("(communication.occurred_at, communication.id) < (p_before_occurred_at, p_before_id)");
  expect(migration).toContain("order by communication.occurred_at desc, communication.id desc");
  expect(migration).toContain("limit least(greatest(coalesce(p_page_size, 80), 1), 100) + 1");
  expect(migration).toContain("aura_communications_history_cursor_idx");
  expect(migration).toContain("aura_communications_channel_history_cursor_idx");
  expect(migration).toContain("aura_communication_links as link");
  expect(migration).toContain("to service_role");
  expect(migration).not.toContain("aura_message_outbox");
});

test("history endpoint is manager-only and pages every supported channel", async () => {
  const [route, loader] = await Promise.all([
    read("app/api/admin/communications/history/route.ts"),
    read("lib/aura/communication-history.ts"),
  ]);

  expect(route).toContain("getSessionWithProfile");
  expect(route).toContain("managerCapabilities");
  expect(route).toContain("if (!access.customers)");
  expect(route).toContain('new Set(["all", "call", "sms", "whatsapp", "email"])');
  expect(route).toContain('"Cache-Control", "private, no-store"');
  expect(loader).toContain('reader.rpc("staff_load_aura_communication_history_page"');
  expect(loader).toContain("normalized.length > pageSize");
  expect(loader).toContain("communications[communications.length - 1]");
});

test("communications page starts small and preserves an exact thread deep link", async () => {
  const [page, inbox] = await Promise.all([
    read("app/admin/communications/page.tsx"),
    read("components/buildflow/unified-communication-inbox.tsx"),
  ]);

  expect(page).toContain("COMMUNICATION_HISTORY_PAGE_SIZE");
  expect(page).toContain("loadCommunicationHistoryPage");
  expect(page).toContain("initialHistoryCursor");
  expect(page).toContain("initialHistoryHasMore");
  expect(page).toContain("initialThread={exactThread}");
  expect(page).toContain("loadAuraConnectionStatus");
  expect(page).not.toContain('body: { action: "dashboard" }');
  expect(inbox).toContain('url.searchParams.set("thread", thread)');
  expect(inbox).toContain("window.history.replaceState");
  expect(inbox).toContain('loadOlderHistory("all")');
  expect(inbox).toContain('loadOlderHistory("thread")');
  expect(inbox).toContain("/api/admin/communications/history?");
  expect(inbox).toContain("mergeCommunicationRows(current, result.communications || [])");
});

test("incremental history leaves live delta polling in place", async () => {
  const [inbox, updates] = await Promise.all([
    read("components/buildflow/unified-communication-inbox.tsx"),
    read("app/api/admin/communications/updates/route.ts"),
  ]);

  expect(inbox).toContain("/api/admin/communications/updates?after=");
  expect(inbox).toContain("updatesCursorRef.current");
  expect(inbox).toContain("Load older conversations");
  expect(inbox).toContain("Load earlier messages");
  expect(inbox).toContain("Beginning of conversation");
  expect(updates).toContain("loadAuraCommunicationLinks");
  expect(updates).toContain("linksByCommunication");
});

test("existing customer, supplier, SMS, WhatsApp, and call links carry an exact thread identity", async () => {
  const files = await Promise.all([
    read("components/buildflow/communication-center.tsx"),
    read("components/buildflow/client-target-outreach.tsx"),
    read("components/buildflow/supplier-routing-manager.tsx"),
    read("app/owner/materials/requests/page.tsx"),
    read("app/admin/users/page.tsx"),
    read("app/admin/whatsapp/[threadId]/page.tsx"),
    read("app/api/aura/2chat/calls/route.ts"),
  ]);

  for (const source of files) expect(source).toContain("thread=");
});
