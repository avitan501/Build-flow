import type { SupplierTrustLevel } from "@/lib/shop-qualification";

export type QuoteComparisonStatus = "draft" | "review" | "awarded" | "archived";

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
    const landedTotal = comparisonSubtotal + positiveNumber(bid.delivery_charge) + positiveNumber(bid.tax_amount);
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
