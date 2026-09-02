export type ManagerNotificationEventType =
  | "new_order"
  | "call_message"
  | "supplier_update"
  | "quote_approval"
  | "delivery_update"
  | "test";

export type ManagerNotificationEvent = {
  id: number;
  event_type: ManagerNotificationEventType;
  title: string;
  body: string;
  href: string;
  created_at: string;
  processed_at: string | null;
  read_at: string | null;
};

export function safeManagerNotificationHref(value: string) {
  const href = value.trim();
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\"))
    return "/admin/build-map";
  return href;
}

export function managerNotificationDestination(href: string) {
  const path = safeManagerNotificationHref(href).split("?", 1)[0];
  if (path.startsWith("/admin/communications")) return "Messages & Calls";
  if (path.startsWith("/owner/materials/requests")) return "Material Requests";
  if (path.startsWith("/admin/quote-comparison")) return "Quote Comparison";
  if (path.startsWith("/admin/supplier-quotes")) return "Supplier Quotes";
  if (path.startsWith("/admin/vendors") || path.startsWith("/admin/supplier-network")) return "Suppliers";
  if (path.startsWith("/admin/carlos-activity")) return "Carlos Activity";
  if (path.startsWith("/admin/users")) return "Customers & Team";
  if (path.startsWith("/admin/goals-progress")) return "Goals & Tasks";
  if (path.startsWith("/admin/documents")) return "Documents";
  if (path.startsWith("/admin/build-map")) return "Manager Dashboard";
  return "Avantia";
}

export function summarizeManagerNotifications(
  events: ManagerNotificationEvent[],
  now = Date.now(),
) {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return {
    unread: events.filter((event) => !event.read_at).length,
    last24Hours: events.filter((event) => {
      const occurredAt = Date.parse(event.created_at);
      return Number.isFinite(occurredAt) && occurredAt >= cutoff && occurredAt <= now;
    }).length,
    incoming: events.filter((event) => event.event_type === "call_message").length,
  };
}
