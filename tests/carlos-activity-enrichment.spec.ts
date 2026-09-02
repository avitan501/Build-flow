import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  activityEventsInLast24Hours,
  managerActivityDuration,
  managerActivityPageLabel,
  summarizeManagerStaffActivity,
  type ManagerStaffActivityEvent,
} from "@/lib/manager-staff-activity";

const root = process.cwd();
const now = new Date("2026-09-02T16:00:00.000Z");

function event(
  id: string,
  eventType: ManagerStaffActivityEvent["event_type"],
  occurredAt: string,
  pageLabel = "Dashboard",
  metadata: ManagerStaffActivityEvent["metadata"] = null,
): ManagerStaffActivityEvent {
  return {
    id,
    user_id: "00000000-0000-4000-8000-000000000001",
    event_type: eventType,
    page_path: "/admin/build-map",
    page_label: pageLabel,
    metadata,
    occurred_at: occurredAt,
  };
}

test("the 24-hour window is anchored to current time instead of the newest stored event", () => {
  const staleEvents = [
    event("old-1", "page_view", "2026-08-31T14:00:00.000Z"),
    event("old-2", "page_view", "2026-08-31T13:00:00.000Z"),
  ];
  expect(activityEventsInLast24Hours(staleEvents, now)).toEqual([]);
  expect(summarizeManagerStaffActivity(staleEvents, now).pageViews).toBe(0);
});

test("the one-glance activity summary is stable and separates completed from failed communications", () => {
  const events = [
    event("page-1", "page_view", "2026-09-02T15:30:00.000Z", "Supplier relationships"),
    event("page-2", "page_view", "2026-09-02T15:20:00.000Z", "Dashboard"),
    event("page-3", "page_view", "2026-09-02T15:10:00.000Z", "Dashboard"),
    event("sent", "communication_sent", "2026-09-02T15:00:00.000Z", "Communications", { channel: "sms", outcome: "sent" }),
    event("failed", "communication_sent", "2026-09-02T14:50:00.000Z", "Communications", { channel: "call", outcome: "no_answer" }),
    event("updated", "record_updated", "2026-09-02T14:40:00.000Z", "Supplier directory", { label: "ABC Supply" }),
  ];
  const summary = summarizeManagerStaffActivity(events, now);
  expect(summary.pageViews).toBe(3);
  expect(summary.areas).toEqual(["Dashboard", "Supplier relationships"]);
  expect(summary.topArea).toBe("Dashboard");
  expect(summary.latestPage).toBe("Supplier relationships");
  expect(summary.successfulCommunications).toBe(1);
  expect(summary.failedCommunications).toBe(1);
  expect(summary.recordChanges).toBe(1);
});

test("every important Carlos manager route gets a useful label", () => {
  expect(managerActivityPageLabel("/admin/build-map")).toBe("Dashboard");
  expect(managerActivityPageLabel("/admin/supplier-network")).toBe("Supplier relationships");
  expect(managerActivityPageLabel("/admin/documents/1f80f171-f72e-45a9-9601-a259f5bdcd75")).toBe("Documents");
  expect(managerActivityPageLabel("/admin/goals-progress/website-work/quote-challenge")).toBe("30-Day Quote Challenge");
  expect(managerActivityPageLabel("/admin/ai-tools/sms-replies")).toBe("AI text replies");
  expect(managerActivityPageLabel("/admin/whatsapp/settings?tab=connection")).toBe("WhatsApp settings");
  expect(managerActivityPageLabel("/admin/not-yet-known")).toBe("Manager portal");
});

test("durations render consistently for message latency and completed calls", () => {
  expect(managerActivityDuration({ duration_ms: 1_499 })).toBe("1s");
  expect(managerActivityDuration({ duration_seconds: 125 })).toBe("2m 5s");
  expect(managerActivityDuration(null)).toBeNull();
});

test("send and call activity receipts include recipient, label, request, outcome, and duration", async () => {
  const [auraActions, activityActions, softphone, timeline] = await Promise.all([
    readFile(path.join(root, "app/owner/aura/actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/activity-actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/two-chat-softphone.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/carlos-activity/page.tsx"), "utf8"),
  ]);
  for (const field of ["recipient", "label", "request_id", "request", "outcome", "duration_ms"]) {
    expect(auraActions).toContain(field);
  }
  for (const field of ["recipient", "label", "request_id", "request", "outcome", "duration_seconds"]) {
    expect(activityActions).toContain(field);
  }
  expect(softphone).toContain('recordCallActivity(connectedAtRef.current ? "completed" : "no_answer")');
  expect(softphone).toContain("durationSeconds");
  expect(timeline).toContain("Recipient, request, outcome, and duration");
  expect(timeline).toContain("summarizeManagerStaffActivity(events)");
});
