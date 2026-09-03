export type ClientQuoteExtractedItem = {
  itemCode?: string | null;
  description: string;
  specification?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

export type ClientQuoteComparisonItem = {
  id: string;
  description: string;
  specification?: string | null;
};

export type RequestClientQuoteAttachment = {
  id: string;
  request_id: string;
  owner_id?: string | null;
  project_id?: string | null;
};

export type RequestClientQuoteItemMatch = {
  sourceIndex: number;
  comparisonItemId: string;
  clientUnitPrice: number;
  score: number;
};

const MAX_PRICE = 100_000_000;

function normalizedText(value: string) {
  return value
    .toLowerCase()
    .replace(/[“”″]/g, " in ")
    .replace(/[‘’′]/g, " ft ")
    .replace(/\b(inches|inch)\b/g, "in")
    .replace(/\b(feet|foot)\b/g, "ft")
    .replace(/\b(pieces?|pcs?|ea|each)\b/g, "each")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value: string) {
  return new Set(normalizedText(value).split(" ").filter((word) => word.length > 1));
}

function rowText(item: ClientQuoteExtractedItem) {
  return `${item.description ?? ""} ${item.specification ?? ""}`.trim();
}

function comparisonText(item: ClientQuoteComparisonItem) {
  return `${item.description ?? ""} ${item.specification ?? ""}`.trim();
}

export function clientQuoteRowMatchScore(
  source: ClientQuoteExtractedItem,
  comparisonItem: ClientQuoteComparisonItem,
) {
  const sourceText = normalizedText(rowText(source));
  const targetText = normalizedText(comparisonText(comparisonItem));
  if (!sourceText || !targetText) return 0;
  if (sourceText === targetText) return 10;
  if (sourceText.includes(targetText) || targetText.includes(sourceText)) return 5;

  const sourceWords = words(sourceText);
  const targetWords = words(targetText);
  const overlap = [...sourceWords].filter((word) => targetWords.has(word)).length;
  const textScore = overlap / Math.max(sourceWords.size, targetWords.size, 1);

  const itemCode = normalizedText(source.itemCode ?? "");
  if (itemCode && (targetText === itemCode || targetText.includes(itemCode))) return Math.max(5, textScore);
  return textScore;
}

export function clientQuoteUnitPrice(item: ClientQuoteExtractedItem) {
  const direct = Number(item.unitPrice);
  if (item.unitPrice !== null && item.unitPrice !== undefined && Number.isFinite(direct) && direct >= 0 && direct <= MAX_PRICE) {
    return direct;
  }

  const quantity = Number(item.quantity);
  const lineTotal = Number(item.lineTotal);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(lineTotal) || lineTotal < 0) return null;
  const derived = lineTotal / quantity;
  return Number.isFinite(derived) && derived >= 0 && derived <= MAX_PRICE ? derived : null;
}

export function matchRequestClientQuoteItems(
  extractedItems: ClientQuoteExtractedItem[],
  comparisonItems: ClientQuoteComparisonItem[],
  minimumScore = 0.3,
) {
  const candidates = extractedItems.flatMap((source, sourceIndex) => {
    const clientUnitPrice = clientQuoteUnitPrice(source);
    if (clientUnitPrice === null) return [];
    return comparisonItems.map((comparisonItem) => ({
      sourceIndex,
      comparisonItemId: comparisonItem.id,
      clientUnitPrice,
      score: clientQuoteRowMatchScore(source, comparisonItem),
    }));
  });

  candidates.sort((left, right) => right.score - left.score || left.sourceIndex - right.sourceIndex);
  const usedSources = new Set<number>();
  const usedComparisonItems = new Set<string>();
  const matches: RequestClientQuoteItemMatch[] = [];
  for (const candidate of candidates) {
    if (candidate.score < minimumScore) break;
    if (usedSources.has(candidate.sourceIndex) || usedComparisonItems.has(candidate.comparisonItemId)) continue;
    usedSources.add(candidate.sourceIndex);
    usedComparisonItems.add(candidate.comparisonItemId);
    matches.push(candidate);
  }

  matches.sort((left, right) => left.sourceIndex - right.sourceIndex);
  return {
    matches,
    unmatchedSourceIndexes: extractedItems.map((_, index) => index).filter((index) => !usedSources.has(index)),
  };
}

export function findRequestScopedClientQuoteAttachment<T extends RequestClientQuoteAttachment>(
  attachments: T[],
  scope: { attachmentId: string; requestId: string; ownerId?: string; projectId?: string },
) {
  return attachments.find((attachment) => (
    attachment.id === scope.attachmentId
    && attachment.request_id === scope.requestId
    && (!scope.ownerId || attachment.owner_id === scope.ownerId)
    && (!scope.projectId || attachment.project_id === scope.projectId)
  )) ?? null;
}
