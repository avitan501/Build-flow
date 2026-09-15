/** Stored responses count even before review, but never count a routed source twice. */
export function requestStoredQuoteCount(comparisons: Array<{ bids: Array<{ sourceQuoteId?: string | null }>; documents: Array<{ id?: string }> }>) {
  return comparisons.reduce((total, comparison) => {
    const ids = new Set(comparison.documents.map(document => document.id).filter(Boolean))
    return total + comparison.documents.length + comparison.bids.filter(bid => !bid.sourceQuoteId || !ids.has(bid.sourceQuoteId)).length
  }, 0)
}
