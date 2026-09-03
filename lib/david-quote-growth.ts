import { siteBusinessDateKey } from "@/lib/site-date-time";

export type QuoteGrowthPeriod = "daily" | "campaign";

export type QuoteGrowthMetricDefinition = {
  key: string;
  label: string;
  target: number;
  order: number;
  note?: string;
};

export type QuoteGrowthMetricRecord = {
  id: string;
  metric_key: string;
  period_kind: QuoteGrowthPeriod;
  period_start: string;
  label: string;
  target_count: number;
  actual_count: number;
  sort_order: number;
  updated_at: string;
};

export const DAILY_QUOTE_GROWTH_METRICS: QuoteGrowthMetricDefinition[] = [
  { key: "supplier_calls", label: "Supplier calls first", target: 5, order: 10 },
  { key: "supplier_contacts", label: "Right supplier contacts", target: 1, order: 20 },
  { key: "calls", label: "Contractor calls", target: 20, order: 30 },
  { key: "follow_ups", label: "Permission-based follow-ups", target: 10, order: 40 },
  { key: "past_contractors", label: "Past contractor contacts", target: 5, order: 50 },
  { key: "quote_requests", label: "Ask for a real quote", target: 1, order: 60 },
  { key: "pipeline_updated", label: "Update every lead status", target: 1, order: 70 },
];

export const SUPPLIER_CAMPAIGN_METRICS: QuoteGrowthMetricDefinition[] = [
  { key: "suppliers_contacted", label: "Suppliers contacted", target: 40, order: 10 },
  { key: "supplier_conversations", label: "Right-person conversations", target: 20, order: 20 },
  { key: "supplier_price_lists", label: "Price lists or quotes", target: 10, order: 30 },
  { key: "active_suppliers", label: "Active supplier relationships", target: 5, order: 40 },
];

export const CAMPAIGN_QUOTE_GROWTH_METRICS: QuoteGrowthMetricDefinition[] = [
  { key: "prospects", label: "Prospects", target: 100, order: 110 },
  { key: "real_calls", label: "Real conversations", target: 40, order: 120 },
  { key: "quotes_received", label: "Quotes received", target: 20, order: 130 },
  { key: "comparisons_returned", label: "Comparisons returned", target: 10, order: 140 },
  { key: "purchases", label: "Purchases", target: 5, order: 150, note: "First win at 3" },
  { key: "repeat_customers", label: "Repeat customers", target: 2, order: 160 },
  { key: "referrals", label: "Referrals", target: 1, order: 170 },
];

export const QUOTE_GROWTH_PIPELINE = [
  "New Lead",
  "Contacted",
  "Quote Received",
  "Comparing",
  "Customer Won",
  "Lost",
] as const;

export const SUPPLIER_GROWTH_PIPELINE = [
  "New Supplier",
  "Contacted",
  "Right Person",
  "Pricing Received",
  "Active",
] as const;

export function quoteGrowthDateInNewYork(date = new Date()) {
  return siteBusinessDateKey(date) ?? "";
}

export function quoteGrowthMetricDefinition(period: QuoteGrowthPeriod, key: string) {
  const definitions = period === "daily"
    ? DAILY_QUOTE_GROWTH_METRICS
    : [...SUPPLIER_CAMPAIGN_METRICS, ...CAMPAIGN_QUOTE_GROWTH_METRICS];
  return definitions.find((definition) => definition.key === key) ?? null;
}
