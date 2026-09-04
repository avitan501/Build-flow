export type ManagerStaffActivityMetadata = {
  channel?: string;
  direction?: string;
  recipient?: string;
  label?: string;
  request_id?: string;
  request?: string;
  outcome?: string;
  duration_ms?: number;
  duration_seconds?: number;
  subject?: string;
};

export type ManagerStaffActivityEvent = {
  id: string;
  user_id: string;
  event_type:
    | "page_view"
    | "communication_sent"
    | "record_created"
    | "record_updated"
    | "record_deleted";
  page_path: string;
  page_label: string;
  metadata: ManagerStaffActivityMetadata | null;
  occurred_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const MANAGER_ROUTE_LABELS: Array<[prefix: string, label: string]> = [
  ["/admin/goals-progress/beat-your-quote-flyer", "Beat Your Quote flyer"],
  ["/admin/goals-progress/website-work/quote-challenge", "30-Day Quote Challenge"],
  ["/admin/goals-progress/client-target", "Client outreach"],
  ["/admin/goals-progress/website-work", "Website work"],
  ["/admin/ai-tools/construction-amazon-deals", "Amazon construction deals"],
  ["/admin/ai-tools/construction-knowledge", "Construction knowledge"],
  ["/admin/ai-tools/estimate-converter", "Estimate converter"],
  ["/admin/ai-tools/internal-library", "Internal AI library"],
  ["/admin/ai-tools/jobsite-delivery", "Jobsite delivery"],
  ["/admin/ai-tools/locate-cheap-item", "Locate cheap item"],
  ["/admin/ai-tools/material-list", "AI material list"],
  ["/admin/ai-tools/media-messages", "Media messages"],
  ["/admin/ai-tools/order-test", "Order testing"],
  ["/admin/ai-tools/work-browser", "Employee work browser"],
  ["/admin/ai-tools/sms-replies", "AI text replies"],
  ["/admin/ai-tools/aura", "Aura AI"],
  ["/admin/supplier-approvals", "Supplier approvals"],
  ["/admin/quote-comparison", "Quote comparison"],
  ["/admin/supplier-network", "Supplier relationships"],
  ["/admin/supplier-requests", "Supplier requests"],
  ["/admin/supplier-quotes", "Supplier quotes"],
  ["/admin/whatsapp/settings", "WhatsApp settings"],
  ["/admin/carlos-activity", "Carlos activity"],
  ["/admin/daily-summary", "Time log & daily summary"],
  ["/admin/goals-progress", "David dashboard"],
  ["/admin/communications", "Communications"],
  ["/admin/documents", "Documents"],
  ["/admin/ai-tools", "Manager tools"],
  ["/admin/build-map", "Dashboard"],
  ["/admin/materials", "Materials"],
  ["/admin/payments", "Payments"],
  ["/admin/projects", "Projects"],
  ["/admin/orders", "Orders"],
  ["/admin/quotes", "Quotes"],
  ["/admin/settings", "Settings"],
  ["/admin/traffic", "Website traffic"],
  ["/admin/vendors", "Supplier directory"],
  ["/admin/whatsapp", "WhatsApp"],
  ["/admin/catalog", "Material catalog"],
  ["/admin/users", "Customers & leads"],
  ["/admin/abc", "ABC Supply"],
];

export function managerActivityPageLabel(value: string) {
  const path = String(value || "").split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const match = MANAGER_ROUTE_LABELS
    .filter(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))
    .sort(([left], [right]) => right.length - left.length)[0];
  return match?.[1] ?? "Manager portal";
}

function eventTime(event: Pick<ManagerStaffActivityEvent, "occurred_at">) {
  const value = Date.parse(event.occurred_at);
  return Number.isFinite(value) ? value : null;
}

export function activityEventsInLast24Hours(
  events: ManagerStaffActivityEvent[],
  now: Date | number = Date.now(),
) {
  const nowTime = typeof now === "number" ? now : now.getTime();
  const threshold = nowTime - DAY_MS;
  return events.filter((event) => {
    const occurredAt = eventTime(event);
    return occurredAt !== null && occurredAt >= threshold && occurredAt <= nowTime + 5 * 60 * 1000;
  });
}

export function summarizeManagerStaffActivity(
  events: ManagerStaffActivityEvent[],
  now: Date | number = Date.now(),
) {
  const last24Hours = activityEventsInLast24Hours(events, now);
  const pageViews = last24Hours.filter((event) => event.event_type === "page_view");
  const communications = last24Hours.filter((event) => event.event_type === "communication_sent");
  const successfulCommunications = communications.filter((event) => ["sent", "completed"].includes(event.metadata?.outcome || "sent"));
  const failedCommunications = communications.filter((event) => ["failed", "provider_unconfirmed", "no_answer"].includes(event.metadata?.outcome || "")).length;
  const recordChanges = last24Hours.filter((event) => event.event_type.startsWith("record_")).length;
  const areas = [...new Set(pageViews.map((event) => event.page_label).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const areaCounts = new Map<string, number>();
  for (const event of pageViews) areaCounts.set(event.page_label, (areaCounts.get(event.page_label) || 0) + 1);
  const topArea = [...areaCounts]
    .sort(([leftLabel, leftCount], [rightLabel, rightCount]) => rightCount - leftCount || leftLabel.localeCompare(rightLabel))[0]?.[0] ?? null;
  const latestEvent = [...events]
    .filter((event) => eventTime(event) !== null)
    .sort((left, right) => (eventTime(right) || 0) - (eventTime(left) || 0))[0] ?? null;
  const latestPage = [...pageViews]
    .sort((left, right) => (eventTime(right) || 0) - (eventTime(left) || 0))[0]?.page_label ?? null;

  return {
    last24Hours,
    pageViews: pageViews.length,
    communications: communications.length,
    successfulCommunications: successfulCommunications.length,
    failedCommunications,
    recordChanges,
    areas,
    topArea,
    latestEvent,
    latestPage,
  };
}

export function managerActivityDuration(metadata: ManagerStaffActivityMetadata | null) {
  const seconds = Number(metadata?.duration_seconds);
  const milliseconds = Number(metadata?.duration_ms);
  const durationSeconds = Number.isFinite(seconds) && seconds >= 0
    ? Math.round(seconds)
    : Number.isFinite(milliseconds) && milliseconds >= 0
      ? Math.round(milliseconds / 1000)
      : null;
  if (durationSeconds === null) return null;
  if (durationSeconds < 60) return `${durationSeconds}s`;
  const minutes = Math.floor(durationSeconds / 60);
  const remainder = durationSeconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
