export type SourceMappedComparisonItem = {
  sourceRequestItemId?: string | null
}

export function comparisonItemForRequestSources<T extends SourceMappedComparisonItem>(
  sourceIds: Array<string | null | undefined>,
  candidates: T[],
) {
  const exactSourceIds = new Set(sourceIds.filter((value): value is string => Boolean(value)))
  if (!exactSourceIds.size) return null
  return candidates.find((candidate) => Boolean(candidate.sourceRequestItemId && exactSourceIds.has(candidate.sourceRequestItemId))) ?? null
}
