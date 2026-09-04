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
  client_tax_percent: number;
  quote_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteComparisonItemRecord = {
  id: string;
  comparison_id: string;
  source_request_item_id?: string | null;
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
  source_supplier_quote_id?: string | null;
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

export type ClientQuoteAttachmentRecord = {
  id: string;
  comparison_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

export type QuoteComparisonAnalysis = {
  bidId: string;
  supplierName: string;
  actualSubtotal: number;
  comparisonSubtotal: number;
  landedTotal: number;
  materialSubtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  taxPercent: number;
  leadTimeDays: number | null;
  missingFields: string[];
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

export type LowestSupplierLine = {
  itemId: string;
  bidId: string;
  supplierName: string;
  unitPrice: number;
  lineTotal: number;
};

export type MixedSupplierAnalysis = {
  complete: boolean;
  pricedItemCount: number;
  itemCount: number;
  missingItemCount: number;
  supplierCount: number;
  supplierNames: string[];
  materialSubtotal: number;
  deliveryCharge: number;
  taxAmount: number;
  landedTotal: number;
  leadTimeDays: number | null;
  missingFields: string[];
  lines: LowestSupplierLine[];
};

export type ClientReadyToPaySummary = {
  materialSubtotal: number;
  deliveryCharge: number;
  taxPercent: number;
  taxAmount: number;
  preTaxTotal: number;
  finalTotal: number;
  missingItemCount: number;
  missingFields: string[];
  complete: boolean;
};

export type QuoteBuyingOption = {
  id: string;
  kind: "supplier" | "mixed";
  label: string;
  supplierNames: string[];
  supplierMaterialSubtotal: number;
  supplierDeliveryCharge: number;
  supplierTaxAmount: number;
  supplierTotal: number;
  clientMaterialSubtotal: number;
  clientDeliveryCharge: number;
  clientTaxAmount: number;
  clientTotal: number;
  estimatedGrossProfit: number;
  grossMarginPercent: number;
  leadTimeDays: number | null;
  missingFields: string[];
  complete: boolean;
  isLowestCost: boolean;
  selectable: boolean;
};

export type QuoteLineMatchStatus = "exact" | "possible" | "review" | "manual";

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
  clientTaxPercent: number;
  clientTaxAmount: number;
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

function moneyAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateQuoteTax(subtotal: number, taxPercent: number | null | undefined) {
  const safeSubtotal = positiveNumber(subtotal);
  const percent = Math.min(100, positiveNumber(taxPercent));
  return Math.round(safeSubtotal * percent) / 100;
}

function leadTimeScore(days: number | null) {
  if (days === null || !Number.isFinite(days)) return 0;
  if (days <= 2) return 10;
  if (days <= 5) return 8;
  if (days <= 10) return 6;
  if (days <= 20) return 4;
  return 2;
}

function bidMetadataMissingFields(bid: QuoteComparisonBidRecord) {
  const missing: string[] = [];
  if (!Number.isFinite(bid.delivery_charge) || bid.delivery_charge < 0) missing.push("delivery");
  if (!Number.isFinite(bid.tax_percent) || bid.tax_percent < 0 || bid.tax_percent > 100) missing.push("tax");
  return missing;
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
      const hasPrice = Boolean(price?.is_available && price.unit_price !== null && Number.isFinite(price.unit_price) && price.unit_price >= 0);

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
    const deliveryCharge = positiveNumber(bid.delivery_charge);
    const taxAmount = calculateQuoteTax(actualSubtotal + deliveryCharge, bid.tax_percent);
    const landedTotal = actualSubtotal + deliveryCharge + taxAmount;
    const blocked = bid.trust_level_snapshot === "do-not-use" || bid.status === "declined";
    const missingFields = [
      ...(pricedItemCount === items.length ? [] : [`${Math.max(0, items.length - pricedItemCount)} material price${items.length - pricedItemCount === 1 ? "" : "s"}`]),
      ...bidMetadataMissingFields(bid),
    ];

    return {
      bid,
      actualSubtotal,
      comparisonSubtotal,
      landedTotal,
      completeness,
      pricedItemCount,
      missingItemCount: Math.max(0, items.length - pricedItemCount),
      missingWithoutBenchmark,
      deliveryCharge,
      taxAmount,
      missingFields,
      blocked,
    };
  });

  const eligibleResults = base.filter((result) => !result.blocked && items.length > 0 && result.missingFields.length === 0);
  const minimumTotal = Math.min(...eligibleResults.map((result) => result.landedTotal));
  const fastestDays = Math.min(
    ...base
      .filter((result) => eligibleResults.some((candidate) => candidate.bid.id === result.bid.id))
      .map((result) => result.bid.lead_time_days as number),
  );

  const analyses = base.map<QuoteComparisonAnalysis>((result) => {
    const eligible = eligibleResults.some((candidate) => candidate.bid.id === result.bid.id);
    const costScore = eligible && Number.isFinite(minimumTotal)
      ? result.landedTotal === minimumTotal
        ? 60
        : result.landedTotal > 0 && minimumTotal > 0
          ? Math.min(60, (minimumTotal / result.landedTotal) * 60)
          : 0
      : 0;
    const completenessScore = result.completeness * 20;
    const bidLeadTimeScore = leadTimeScore(result.bid.lead_time_days);
    const trustScore = trustScores[result.bid.trust_level_snapshot] ?? 3;
    const score = !eligible
      ? 0
      : costScore + completenessScore + bidLeadTimeScore + trustScore;

    return {
      bidId: result.bid.id,
      supplierName: result.bid.supplier_name_snapshot,
      actualSubtotal: result.actualSubtotal,
      comparisonSubtotal: result.comparisonSubtotal,
      landedTotal: result.landedTotal,
      materialSubtotal: result.actualSubtotal,
      deliveryCharge: result.deliveryCharge,
      taxAmount: result.taxAmount,
      taxPercent: positiveNumber(result.bid.tax_percent),
      leadTimeDays: result.bid.lead_time_days,
      missingFields: result.missingFields,
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
      isFastest: eligible && result.bid.lead_time_days !== null && result.bid.lead_time_days === fastestDays,
    };
  });

  const recommendation = analyses
    .filter((analysis) => analysis.eligible)
    .sort((a, b) => b.score - a.score || a.landedTotal - b.landedTotal)[0];
  if (recommendation) recommendation.isRecommended = true;

  return analyses.sort((a, b) => b.score - a.score || a.landedTotal - b.landedTotal);
}

export function lowestSupplierPriceByItem(
  items: QuoteComparisonItemRecord[],
  bids: QuoteComparisonBidRecord[],
) {
  const result = new Map<string, LowestSupplierLine>();
  const eligibleBids = bids.filter((bid) => bid.trust_level_snapshot !== "do-not-use" && bid.status !== "declined" && bidMetadataMissingFields(bid).length === 0);

  for (const item of items) {
    for (const bid of eligibleBids) {
      const price = (bid.quote_comparison_prices ?? []).find((entry) => entry.item_id === item.id);
      if (!price?.is_available || price.unit_price === null || !Number.isFinite(price.unit_price) || price.unit_price < 0) continue;
      const unitPrice = positiveNumber(price.unit_price);
      const current = result.get(item.id);
      if (!current || unitPrice < current.unitPrice) {
        result.set(item.id, {
          itemId: item.id,
          bidId: bid.id,
          supplierName: bid.supplier_name_snapshot,
          unitPrice,
          lineTotal: unitPrice * positiveNumber(item.quantity),
        });
      }
    }
  }

  return result;
}

export function buildMixedSupplierAnalysis(
  items: QuoteComparisonItemRecord[],
  bids: QuoteComparisonBidRecord[],
): MixedSupplierAnalysis {
  const lowestLines = lowestSupplierPriceByItem(items, bids);
  const lines = items.flatMap((item) => {
    const line = lowestLines.get(item.id);
    return line ? [line] : [];
  });
  const subtotals = new Map<string, number>();
  for (const line of lines) subtotals.set(line.bidId, (subtotals.get(line.bidId) ?? 0) + line.lineTotal);

  let deliveryCharge = 0;
  let taxAmount = 0;
  let leadTimeDays: number | null = null;
  for (const [bidId, subtotal] of subtotals) {
    const bid = bids.find((entry) => entry.id === bidId);
    if (!bid) continue;
    const delivery = positiveNumber(bid.delivery_charge);
    deliveryCharge += delivery;
    taxAmount += calculateQuoteTax(subtotal + delivery, bid.tax_percent);
    leadTimeDays = Math.max(leadTimeDays ?? 0, bid.lead_time_days ?? 0);
  }

  const supplierNames = [...new Set(lines.map((line) => line.supplierName))];
  const missingFields = lines.length === items.length ? [] : [`${Math.max(0, items.length - lines.length)} material price${items.length - lines.length === 1 ? "" : "s"}`];
  const materialSubtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  return {
    complete: items.length > 0 && missingFields.length === 0,
    pricedItemCount: lines.length,
    itemCount: items.length,
    missingItemCount: Math.max(0, items.length - lines.length),
    supplierCount: supplierNames.length,
    supplierNames,
    materialSubtotal,
    deliveryCharge,
    taxAmount,
    landedTotal: materialSubtotal + deliveryCharge + taxAmount,
    leadTimeDays,
    missingFields,
    lines,
  };
}

export function buildClientReadyToPaySummary(
  items: QuoteComparisonItemRecord[],
  clientDeliveryCharge: number | null,
  clientTaxPercent: number | null,
): ClientReadyToPaySummary {
  const missingItemCount = items.filter((item) => item.client_unit_price === null || !Number.isFinite(item.client_unit_price) || item.client_unit_price < 0).length;
  const missingFields = [
    ...(missingItemCount ? [`${missingItemCount} client unit price${missingItemCount === 1 ? "" : "s"}`] : []),
    ...(!Number.isFinite(clientDeliveryCharge) || clientDeliveryCharge === null || clientDeliveryCharge < 0 ? ["client delivery"] : []),
    ...(!Number.isFinite(clientTaxPercent) || clientTaxPercent === null || clientTaxPercent < 0 || clientTaxPercent > 100 ? ["client tax"] : []),
  ];
  const materialSubtotal = items.reduce((total, item) => total + positiveNumber(item.client_unit_price) * positiveNumber(item.quantity), 0);
  const deliveryCharge = positiveNumber(clientDeliveryCharge);
  const taxPercent = Math.min(100, positiveNumber(clientTaxPercent));
  const preTaxTotal = materialSubtotal + deliveryCharge;
  const taxAmount = calculateQuoteTax(preTaxTotal, taxPercent);

  return {
    materialSubtotal,
    deliveryCharge,
    taxPercent,
    taxAmount,
    preTaxTotal,
    finalTotal: preTaxTotal + taxAmount,
    missingItemCount,
    missingFields,
    complete: items.length > 0 && missingFields.length === 0,
  };
}

export function buildQuoteBuyingOptions(
  items: QuoteComparisonItemRecord[],
  bids: QuoteComparisonBidRecord[],
  clientReady: ClientReadyToPaySummary,
): QuoteBuyingOption[] {
  const analyses = analyzeQuoteComparison(items, bids);
  const supplierOptions = analyses.map<QuoteBuyingOption>((analysis) => {
    const missingFields = [...analysis.missingFields, ...clientReady.missingFields];
    const estimatedGrossProfit = moneyAmount(clientReady.preTaxTotal - analysis.landedTotal);
    return {
      id: analysis.bidId,
      kind: "supplier",
      label: analysis.supplierName,
      supplierNames: [analysis.supplierName],
      supplierMaterialSubtotal: analysis.materialSubtotal,
      supplierDeliveryCharge: analysis.deliveryCharge,
      supplierTaxAmount: analysis.taxAmount,
      supplierTotal: analysis.landedTotal,
      clientMaterialSubtotal: clientReady.materialSubtotal,
      clientDeliveryCharge: clientReady.deliveryCharge,
      clientTaxAmount: clientReady.taxAmount,
      clientTotal: clientReady.finalTotal,
      estimatedGrossProfit,
      grossMarginPercent: clientReady.preTaxTotal > 0 ? (estimatedGrossProfit / clientReady.preTaxTotal) * 100 : 0,
      leadTimeDays: analysis.leadTimeDays,
      missingFields,
      complete: analysis.eligible && clientReady.complete,
      isLowestCost: analysis.isLowestCost,
      selectable: analysis.eligible && clientReady.complete,
    };
  });

  const mixed = buildMixedSupplierAnalysis(items, bids);
  const hasTrueMix = mixed.complete && mixed.supplierCount > 1;
  if (hasTrueMix) {
    const missingFields = [...mixed.missingFields, ...clientReady.missingFields];
    const estimatedGrossProfit = moneyAmount(clientReady.preTaxTotal - mixed.landedTotal);
    supplierOptions.push({
      id: "mixed",
      kind: "mixed",
      label: "Mixed suppliers",
      supplierNames: mixed.supplierNames,
      supplierMaterialSubtotal: mixed.materialSubtotal,
      supplierDeliveryCharge: mixed.deliveryCharge,
      supplierTaxAmount: mixed.taxAmount,
      supplierTotal: mixed.landedTotal,
      clientMaterialSubtotal: clientReady.materialSubtotal,
      clientDeliveryCharge: clientReady.deliveryCharge,
      clientTaxAmount: clientReady.taxAmount,
      clientTotal: clientReady.finalTotal,
      estimatedGrossProfit,
      grossMarginPercent: clientReady.preTaxTotal > 0 ? (estimatedGrossProfit / clientReady.preTaxTotal) * 100 : 0,
      leadTimeDays: mixed.leadTimeDays,
      missingFields,
      complete: clientReady.complete && missingFields.length === 0,
      isLowestCost: false,
      selectable: false,
    });
  }

  const lowestCompleteTotal = Math.min(...supplierOptions.filter((option) => option.complete).map((option) => option.supplierTotal));
  for (const option of supplierOptions) option.isLowestCost = option.complete && option.supplierTotal === lowestCompleteTotal;
  return supplierOptions.sort((a, b) => Number(b.complete) - Number(a.complete) || a.supplierTotal - b.supplierTotal || a.label.localeCompare(b.label));
}

function normalizedMatchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function quoteLineMatchStatus(item: Pick<QuoteComparisonItemRecord, "description" | "specification">, supplierDescription: string): QuoteLineMatchStatus {
  const source = normalizedMatchText(supplierDescription);
  if (!source) return "manual";
  const requestedDescription = normalizedMatchText(item.description);
  const requestedFull = normalizedMatchText(`${item.description} ${item.specification}`);
  if (source === requestedFull || source.includes(requestedFull) || (!item.specification.trim() && source === requestedDescription)) return "exact";
  if (source === requestedDescription || requestedFull.includes(source)) return "possible";

  const requestedWords = new Set(requestedFull.split(" ").filter((word) => word.length > 1));
  const sourceWords = new Set(source.split(" ").filter((word) => word.length > 1));
  const overlap = [...requestedWords].filter((word) => sourceWords.has(word)).length;
  const confidence = overlap / Math.max(requestedWords.size, sourceWords.size, 1);
  return confidence >= 0.5 ? "possible" : "review";
}

export function buildClientQuoteSummary(
  items: QuoteComparisonItemRecord[],
  selectedBid: QuoteComparisonBidRecord | null | undefined,
  clientDeliveryCharge: number,
  clientTaxPercent = 8.875,
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
  const supplierDelivery = positiveNumber(selectedBid?.delivery_charge);
  const supplierDeliveryAndTax = supplierDelivery + calculateQuoteTax(supplierMaterialCost + supplierDelivery, selectedBid?.tax_percent);
  const supplierLandedCost = supplierMaterialCost + supplierDeliveryAndTax;
  const clientMaterialSubtotal = lines.reduce((total, line) => total + line.clientLineTotal, 0);
  const safeClientDeliveryCharge = positiveNumber(clientDeliveryCharge);
  const safeClientTaxPercent = Math.min(100, positiveNumber(clientTaxPercent));
  const clientTaxAmount = calculateQuoteTax(clientMaterialSubtotal + safeClientDeliveryCharge, safeClientTaxPercent);
  const clientTotal = clientMaterialSubtotal + safeClientDeliveryCharge + clientTaxAmount;
  const taxableClientSubtotal = clientMaterialSubtotal + safeClientDeliveryCharge;
  const profit = taxableClientSubtotal - supplierLandedCost;

  return {
    lines,
    supplierMaterialCost,
    supplierDeliveryAndTax,
    supplierLandedCost,
    clientMaterialSubtotal,
    clientDeliveryCharge: safeClientDeliveryCharge,
    clientTaxPercent: safeClientTaxPercent,
    clientTaxAmount,
    clientTotal,
    profit,
    marginPercent: taxableClientSubtotal > 0 ? (profit / taxableClientSubtotal) * 100 : 0,
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
