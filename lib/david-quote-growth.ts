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
  { key: "calls", label: "Local business calls", target: 25, order: 10 },
  { key: "follow_ups", label: "Permission-based follow-ups", target: 10, order: 20 },
  { key: "past_contractors", label: "Past contractor contacts", target: 5, order: 30 },
  { key: "quote_requests", label: "Ask for a real quote", target: 1, order: 40 },
  { key: "pipeline_updated", label: "Update every lead status", target: 1, order: 50 },
];

export const CAMPAIGN_QUOTE_GROWTH_METRICS: QuoteGrowthMetricDefinition[] = [
  { key: "prospects", label: "Prospects", target: 100, order: 10 },
  { key: "real_calls", label: "Real conversations", target: 40, order: 20 },
  { key: "quotes_received", label: "Quotes received", target: 20, order: 30 },
  { key: "comparisons_returned", label: "Comparisons returned", target: 10, order: 40 },
  { key: "purchases", label: "Purchases", target: 5, order: 50, note: "First win at 3" },
  { key: "repeat_customers", label: "Repeat customers", target: 2, order: 60 },
  { key: "referrals", label: "Referrals", target: 1, order: 70 },
];

export const QUOTE_GROWTH_PIPELINE = [
  "New Lead",
  "Contacted",
  "Quote Received",
  "Comparing",
  "Customer Won",
  "Lost",
] as const;

export function quoteGrowthDateInNewYork(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function quoteGrowthMetricDefinition(period: QuoteGrowthPeriod, key: string) {
  const definitions = period === "daily"
    ? DAILY_QUOTE_GROWTH_METRICS
    : CAMPAIGN_QUOTE_GROWTH_METRICS;
  return definitions.find((definition) => definition.key === key) ?? null;
}
