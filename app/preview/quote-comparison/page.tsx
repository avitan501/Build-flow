import { QuoteComparisonWorkspace } from "@/components/buildflow/quote-comparison-workspace";
import type { QuoteComparisonBidRecord, QuoteComparisonItemRecord, QuoteComparisonRecord } from "@/lib/quote-comparison";

const comparison: QuoteComparisonRecord = {
  id: "preview-comparison",
  project_id: null,
  request_id: null,
  created_by: "preview-manager",
  title: "280 Lawrence framing package",
  department: "Framing",
  job_address: "280 Lawrence Avenue, Lawrence, NY 11559",
  status: "review",
  currency: "USD",
  awarded_bid_id: null,
  client_id: "client-jacob",
  client_name_snapshot: "Jacob Darry",
  client_email_snapshot: "jacob@example.com",
  quote_number: "ABQ-280LAW",
  client_quote_status: "draft",
  expires_on: "2026-09-12",
  client_message: "Pricing includes the listed materials and delivery to the jobsite.",
  client_delivery_charge: 275,
  quote_sent_at: null,
  created_at: "2026-08-13T12:00:00.000Z",
  updated_at: "2026-08-13T12:00:00.000Z",
};

const items: QuoteComparisonItemRecord[] = [
  { id: "studs", comparison_id: comparison.id, description: "2 x 4 x 10 ft. studs", specification: "Douglas Fir", quantity: 400, unit: "piece", markup_percent: 15, client_unit_price: null, sort_order: 0, created_at: comparison.created_at, updated_at: comparison.updated_at },
  { id: "osb", comparison_id: comparison.id, description: "3/4 in. OSB subfloor", specification: "4 x 8 ft. tongue-and-groove", quantity: 172, unit: "sheet", markup_percent: 15, client_unit_price: null, sort_order: 1, created_at: comparison.created_at, updated_at: comparison.updated_at },
  { id: "nails", comparison_id: comparison.id, description: "3-1/4 in. framing nails", specification: "Collated", quantity: 20, unit: "box", markup_percent: 15, client_unit_price: null, sort_order: 2, created_at: comparison.created_at, updated_at: comparison.updated_at },
];

function sampleBid(
  id: string,
  name: string,
  trust: QuoteComparisonBidRecord["trust_level_snapshot"],
  delivery: number,
  tax: number,
  leadTime: number,
  prices: Array<[string, number | null, boolean?]>,
): QuoteComparisonBidRecord {
  return {
    id,
    comparison_id: comparison.id,
    supplier_id: id,
    supplier_name_snapshot: name,
    trust_level_snapshot: trust,
    delivery_charge: delivery,
    tax_amount: tax,
    lead_time_days: leadTime,
    notes: "",
    status: "received",
    created_at: comparison.created_at,
    updated_at: comparison.updated_at,
    quote_comparison_prices: prices.map(([itemId, unitPrice, isAvailable = true]) => ({ bid_id: id, item_id: itemId, unit_price: unitPrice, is_available: isAvailable, notes: "" })),
  };
}

const bids = [
  sampleBid("supplier-one", "Five Towns Building Supply", "trusted", 225, 0, 2, [["studs", 5.89], ["osb", 31.25], ["nails", 54.5]]),
  sampleBid("supplier-two", "Metro Lumber", "verified", 125, 0, 4, [["studs", 5.72], ["osb", 32.1], ["nails", 52.25]]),
  sampleBid("supplier-three", "Regional Materials", "first-time", 85, 0, 1, [["studs", 5.5], ["osb", null, false], ["nails", 49.95]]),
];

export default function PublicQuoteComparisonPreviewPage() {
  return (
    <QuoteComparisonWorkspace
      comparison={comparison}
      items={items}
      bids={bids}
      suppliers={[]}
      projects={[]}
      departments={["Framing"]}
      clients={[
        { id: "client-jacob", name: "Jacob Darry", email: "jacob@example.com", companyName: "Darry Construction", phone: "(516) 555-0182" },
        { id: "client-five-towns", name: "David Avitan", email: "info@fivetownsbuilders.com", companyName: "Five Towns Builders", phone: "(516) 555-0134" },
      ]}
      previewMode
    />
  );
}
