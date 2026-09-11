import { expect, test } from "@playwright/test";
import { communicationAttentionTitle, groupDashboardAttention, type DashboardAttentionItem } from "../lib/dashboard-attention";

test("unread never implies customer or reply required", () => {
  expect(communicationAttentionTitle("sms")).toBe("Unread text");
  expect(communicationAttentionTitle("email")).toBe("Unread email");
  expect(communicationAttentionTitle("whatsapp")).toBe("Unread whatsapp");
});
test("delivery labels preserve known provider state", () => {
  expect(communicationAttentionTitle("sms", "undelivered")).toBe("SMS not delivered");
  expect(communicationAttentionTitle("email", "bounced")).toBe("Email bounced");
  expect(communicationAttentionTitle("sms", "failed")).toBe("SMS failed");
});
test("grouping preserves every failure and keeps request alerts separate", () => {
  const items: DashboardAttentionItem[] = ["failed-1", "unread-1", "rush-1", "failed-2", "approval-1"].map((key) => ({ key, tone: "rose", title: key, detail: "Same contact", href: "/admin/communications" }));
  const groups = groupDashboardAttention(items);
  expect(groups.map((group) => [group.label, group.items.length])).toEqual([["Delivery issues", 2], ["Unread messages", 1], ["Requests", 2]]);
  expect(groups.flatMap((group) => group.items).length).toBe(items.length);
  expect(groupDashboardAttention([])).toEqual([]);
});
