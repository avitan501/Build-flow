import { expect, test } from "@playwright/test";

import {
  managerNotificationDestination,
  safeManagerNotificationHref,
  summarizeManagerNotifications,
  type ManagerNotificationEvent,
} from "../lib/manager-notification-feed";

function event(overrides: Partial<ManagerNotificationEvent>): ManagerNotificationEvent {
  return {
    id: 1,
    event_type: "new_order",
    title: "New request",
    body: "Open the request.",
    href: "/owner/materials/requests/request-1",
    created_at: "2026-09-02T11:30:00.000Z",
    processed_at: "2026-09-02T11:31:00.000Z",
    read_at: null,
    ...overrides,
  };
}

test("last 24 hours is anchored to current time and read state remains event-specific", () => {
  const now = Date.parse("2026-09-02T12:00:00.000Z");
  const summary = summarizeManagerNotifications([
    event({ id: 1, created_at: "2026-09-02T11:30:00.000Z" }),
    event({ id: 2, created_at: "2026-09-01T11:59:59.000Z", read_at: "2026-09-02T10:00:00.000Z" }),
    event({ id: 3, event_type: "call_message", created_at: "2026-09-02T13:00:00.000Z" }),
  ], now);

  expect(summary).toEqual({ unread: 2, last24Hours: 1, incoming: 1 });
});

test("notification links stay internal and important destinations have clear labels", () => {
  expect(safeManagerNotificationHref("//example.com/steal")).toBe("/admin/build-map");
  expect(safeManagerNotificationHref("https://example.com")).toBe("/admin/build-map");
  expect(safeManagerNotificationHref("/admin/communications?communication=abc&channel=sms"))
    .toBe("/admin/communications?communication=abc&channel=sms");
  expect(managerNotificationDestination("/admin/communications?communication=abc")).toBe("Messages & Calls");
  expect(managerNotificationDestination("/owner/materials/requests/abc")).toBe("Material Requests");
  expect(managerNotificationDestination("/admin/quote-comparison/abc")).toBe("Quote Comparison");
  expect(managerNotificationDestination("/admin/supplier-quotes/abc")).toBe("Supplier Quotes");
  expect(managerNotificationDestination("/admin/carlos-activity")).toBe("Carlos Activity");
  expect(managerNotificationDestination("/admin/goals-progress")).toBe("Goals & Tasks");
});
