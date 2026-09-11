export type DashboardAttentionItem = {
  key: string;
  tone: string;
  title: string;
  detail: string;
  href: string;
  occurredAt?: string;
};

// Unread is a read-state, not evidence that a customer requires a reply.
export function communicationAttentionTitle(channel: string, status?: string | null) {
  const label = ({ sms: "SMS", whatsapp: "WhatsApp", email: "Email", call: "Call" } as Record<string, string>)[channel] || "Message";
  if (status === "undelivered") return `${label} not delivered`;
  if (status === "bounced") return `${label} bounced`;
  if (status === "failed") return `${label} failed`;
  return `Unread ${label === "SMS" ? "text" : label.toLowerCase()}`;
}

export function groupDashboardAttention(items: DashboardAttentionItem[]) {
  return [
    { id: "delivery", label: "Delivery issues", items: items.filter((item) => item.key.startsWith("failed-")) },
    { id: "unread", label: "Unread messages", items: items.filter((item) => item.key.startsWith("unread-")) },
    { id: "requests", label: "Requests", items: items.filter((item) => !item.key.startsWith("failed-") && !item.key.startsWith("unread-")) },
  ].filter((group) => group.items.length > 0);
}
