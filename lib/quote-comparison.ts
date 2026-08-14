import type { SupplierTrustLevel } from "@/lib/shop-qualification";

export type QuoteComparisonStatus = "draft" | "review" | "awarded" | "archived";
export type ClientQuoteStatus = "draft" | "ready" | "sent" | "accepted" | "declined";

export type QuoteComparisonRecord = {
  id: string;
  project_id: string | null;
  request_id: string | null;
  created_by: string;
  title: string;
  department: string;
  job_address: string;
  status: QuoteComparisonStatus;
  currency: "USD";
  awarded_bid_id: string | null;
  client_id: string | null;
  client_name_snapshot: string;
  client_email_snapshot: string;
  quote_number: string;
  client_quote_status: ClientQuoteStatus;
  expires_on: string | null;
  client_message: string;
  client_delivery_charge: number;
  quote_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteComparisonItemRecord = {
  id: string;
  comparison_id: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  markup_percent: number;
  client_unit_price: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type QuoteComparisonPriceRecord = {
  bid_id: string;
  item_id: string;
  unit_price: number | null;
  is_available: boolean;
  notes: string;
};

export type QuoteComparisonBidRecord = {
  id: string;
  comparison_id: string;
  supplier_id: string;
  supplier_name_snapshot: string;
  trust_level_snapshot: SupplierTrustLevel;
  delivery_charge: number;
  tax_amount: number;
  tax_percent: number;
  lead_time_days: number | null;
  notes: string;
  status: "received" | "declined" | "awarded";
  created_at: string;
  updated_at: string;
  quote_comparison_prices?: QuoteComparisonPriceRecord[];
};

export type QuoteComparisonAnalysis = {
  bidId: string;
  supplierName: string;
  actualSubtotal: number;
  comparisonSubtotal: number;
  landedTotal: number;
  completeness: number;
  pricedItemCount: number;
  itemCount: number;
  missingItemCount: number;
  missingWithoutBenchmark: number;
  score: number;
  costScore: number;
  completenessScore: number;
  leadTimeScore: number;
  trustScore: number;
  blocked: boolean;
  eligible: boolean;
  isRecommended: boolean;
  isLowestCost: boolean;
  isFastest: boolean;
};

export type ClientQuoteLine = {
  itemId: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  supplierUnitCost: number | null;
  markupPercent: number;
  clientUnitPrice: number | null;
  supplierLineCost: number;
  clientLineTotal: number;
  profit: number;
};

export type ClientQuoteSummary = {
  lines: ClientQuoteLine[];
  supplierMaterialCost: number;
  supplierDeliveryAndTax: number;
  supplierLandedCost: number;
  clientMaterialSubtotal: number;
  clientDeliveryCharge: number;
  clientTotal: number;
  profit: number;
  marginPercent: number;
  complete: boolean;
};

const trustScores: Record<SupplierTrustLevel, number> = {
  "do-not-use": 0,
  "not-reviewed": 3,
  "first-time": 5,
  verified: 7,
  trusted: 9,
  preferred: 10,
};

function positiveNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function calculateQuoteTax(subtotal: number, taxPercent: number | null | undefined) {
  const safeSubtotal = positiveNumber(subtotal);
  const percent = Math.min(100, positiveNumber(taxPercent));
  return Math.round(safeSubtotal * percent) / 100;
}

function leadTimeScore(days: number | null) {
  if (days === null || !Number.isFinite(days)) return 3;
  if (days <= 2) return 10;
  if (days <= 5) return 8;
  if (days <= 10) return 6;
  if (days <= 20) return 4;
  return 2;
}

export function analyzeQuoteComparison(
  items: QuoteComparisonItemRecord[],
  bids: QuoteComparisonBidRecord[],
): QuoteComparisonAnalysis[] {
  const benchmarkByItem = new Map<string, number>();

  for (const item of items) {
    const prices = bids.flatMap((bid) =>
      (bid.quote_comparison_prices ?? [])
        .filter((price) => price.item_id === item.id && price.is_available && price.unit_price !== null)
        .map((price) => positiveNumber(price.unit_price)),
    );
    if (prices.length > 0) benchmarkByItem.set(item.id, Math.max(...prices));
  }

  const base = bids.map((bid) => {
    const prices = new Map((bid.quote_comparison_prices ?? []).map((price) => [price.item_id, price]));
    let actualSubtotal = 0;
    let comparisonSubtotal = 0;
    let pricedItemCount = 0;
    let missingWithoutBenchmark = 0;

    for (const item of items) {
      const quantity = positiveNumber(item.quantity);
      const price = prices.get(item.id);
      const hasPrice = Boolean(price?.is_available && price.unit_price !== null);

      if (hasPrice) {
        const lineTotal = positiveNumber(price?.unit_price) * quantity;
        actualSubtotal += lineTotal;
        comparisonSubtotal += lineTotal;
        pricedItemCount += 1;
        continue;
      }

      const benchmark = benchmarkByItem.get(item.id);
      if (benchmark === undefined) {
        missingWithoutBenchmark += 1;
      } else {
        comparisonSubtotal += benchmark * quantity * 1.1;
      }
    }

    const completeness = items.length === 0 ? 0 : pricedItemCount / items.length;
    const landedTotal = comparisonSubtotal + positiveNumber(bid.delivery_charge) + calculateQuoteTax(comparisonSubtotal, bid.tax_percent);
    const blocked = bid.trust_level_snapshot === "do-not-use" || bid.status === "declined";

    return {
      bid,
      actualSubtotal,
      comparisonSubtotal,
      landedTotal,
      completeness,
      pricedItemCount,
      missingItemCount: Math.max(0, items.length - pricedItemCount),
      missingWithoutBenchmark,
      blocked,
    };
  });

  const hasCompleteBid = base.some((result) => result.completeness === 1 && !result.blocked);
  const eligibleResults = base.filter((result) => {
    if (result.blocked || result.pricedItemCount === 0 || result.missingWithoutBenchmark > 0) return false;
    return hasCompleteBid ? result.completeness === 1 : true;
  });
  const minimumTotal = Math.min(...eligibleResults.map((result) => result.landedTotal).filter((total) => total > 0));
  const fastestDays = Math.min(
    ...base
      .filter((result) => !result.blocked && result.bid.lead_time_days !== null)
      .map((result) => result.bid.lead_time_days as number),
  );

  const analyses = base.map<QuoteComparisonAnalysis>((result) => {
    const eligible = eligibleResults.some((candidate) => candidate.bid.id === result.bid.id);
    const costScore = eligible && Number.isFinite(minimumTotal) && result.landedTotal > 0
      ? Math.min(60, (minimumTotal / result.landedTotal) * 60)
      : 0;
    const completenessScore = result.completeness * 20;
    const bidLeadTimeScore = leadTimeScore(result.bid.lead_time_days);
    const trustScore = trustScores[result.bid.trust_level_snapshot] ?? 3;
    const score = result.blocked || result.pricedItemCount === 0
      ? 0
      : costScore + completenessScore + bidLeadTimeScore + trustScore;

    return {
      bidId: result.bid.id,
      supplierName: result.bid.supplier_name_snapshot,
      actualSubtotal: result.actualSubtotal,
      comparisonSubtotal: result.comparisonSubtotal,
      landedTotal: result.landedTotal,
      completeness: result.completeness,
      pricedItemCount: result.pricedItemCount,
      itemCount: items.length,
      missingItemCount: result.missingItemCount,
      missingWithoutBenchmark: result.missingWithoutBenchmark,
      score: Math.round(score),
      costScore: Math.round(costScore),
      completenessScore: Math.round(completenessScore),
      leadTimeScore: bidLeadTimeScore,
      trustScore,
      blocked: result.blocked,
      eligible,
      isRecommended: false,
      isLowestCost: eligible && result.landedTotal === minimumTotal,
      isFastest: !result.blocked && result.bid.lead_time_days !== null && result.bid.lead_time_days === fastestDays,
    };
  });

  const recommendation = analyses
    .filter((analysis) => analysis.eligible)
    .sort((a, b) => b.score - a.score || a.landedTotal - b.landedTotal)[0];
  if (recommendation) recommendation.isRecommended = true;

  return analyses.sort((a, b) => b.score - a.score || a.landedTotal - b.landedTotal);
}

export function buildClientQuoteSummary(
  items: QuoteComparisonItemRecord[],
  selectedBid: QuoteComparisonBidRecord | null | undefined,
  clientDeliveryCharge: number,
): ClientQuoteSummary {
  const prices = new Map((selectedBid?.quote_comparison_prices ?? []).map((price) => [price.item_id, price]));
  const lines = items.map<ClientQuoteLine>((item) => {
    const supplierPrice = prices.get(item.id);
    const supplierUnitCost = supplierPrice?.is_available && supplierPrice.unit_price !== null
      ? positiveNumber(supplierPrice.unit_price)
      : null;
    const markupPercent = positiveNumber(item.markup_percent);
    const clientUnitPrice = item.client_unit_price === null || item.client_unit_price === undefined
      ? supplierUnitCost === null ? null : supplierUnitCost * (1 + markupPercent / 100)
      : positiveNumber(item.client_unit_price);
    const quantity = positiveNumber(item.quantity);
    const supplierLineCost = (supplierUnitCost ?? 0) * quantity;
    const clientLineTotal = (clientUnitPrice ?? 0) * quantity;

    return {
      itemId: item.id,
      description: item.description,
      specification: item.specification,
      quantity,
      unit: item.unit,
      supplierUnitCost,
      markupPercent,
      clientUnitPrice,
      supplierLineCost,
      clientLineTotal,
      profit: clientLineTotal - supplierLineCost,
    };
  });
  const supplierMaterialCost = lines.reduce((total, line) => total + line.supplierLineCost, 0);
  const supplierDeliveryAndTax = positiveNumber(selectedBid?.delivery_charge) + calculateQuoteTax(supplierMaterialCost, selectedBid?.tax_percent);
  const supplierLandedCost = supplierMaterialCost + supplierDeliveryAndTax;
  const clientMaterialSubtotal = lines.reduce((total, line) => total + line.clientLineTotal, 0);
  const safeClientDeliveryCharge = positiveNumber(clientDeliveryCharge);
  const clientTotal = clientMaterialSubtotal + safeClientDeliveryCharge;
  const profit = clientTotal - supplierLandedCost;

  return {
    lines,
    supplierMaterialCost,
    supplierDeliveryAndTax,
    supplierLandedCost,
    clientMaterialSubtotal,
    clientDeliveryCharge: safeClientDeliveryCharge,
    clientTotal,
    profit,
    marginPercent: clientTotal > 0 ? (profit / clientTotal) * 100 : 0,
    complete: Boolean(selectedBid) && lines.length > 0 && lines.every((line) => line.supplierUnitCost !== null && line.clientUnitPrice !== null),
  };
}

export function formatComparisonMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function quoteComparisonStatusLabel(status: QuoteComparisonStatus) {
  if (status === "draft") return "Collecting quotes";
  if (status === "review") return "Ready to review";
  if (status === "awarded") return "Supplier selected";
  return "Archived";
}
