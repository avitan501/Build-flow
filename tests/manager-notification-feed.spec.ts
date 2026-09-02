import { expect, test } from "@playwright/test";

import {
  managerNotificationCategory,
  managerNotificationCategoryLabel,
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

test("communication notifications have distinct operational categories", () => {
  expect(managerNotificationCategory(event({
    event_type: "call_message",
    title: "Text message from David",
    href: "/admin/communications?communication=one&channel=sms",
  }))).toBe("message");
  expect(managerNotificationCategory(event({
    event_type: "call_message",
    title: "Incoming call from Phone ending 5077",
    href: "/admin/communications?communication=two&channel=call",
  }))).toBe("incoming_call");
  expect(managerNotificationCategory(event({
    event_type: "call_message",
    title: "Missed call from Phone ending 5077",
    href: "/admin/communications?communication=three&channel=call",
  }))).toBe("missed_call");
  expect(managerNotificationCategory(event({
    event_type: "call_message",
    title: "Email from David",
    href: "/admin/communications?communication=four&channel=email",
  }))).toBe("email");
  expect(managerNotificationCategory(event({ href: "/admin/goals-progress/website-work" }))).toBe("task");
  expect(managerNotificationCategory(event({ event_type: "test", href: "/admin/build-map" }))).toBe("system");
  expect(managerNotificationCategoryLabel("missed_call")).toBe("Missed call");
});
