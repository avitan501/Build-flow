// Dependency-free planning so page coverage, limits and resume behavior are testable.
export const MATERIAL_PAGES_PER_CHUNK = 3
export const MAX_MATERIAL_CHUNKS = 64

export function materialPageRanges(pageCount: number) {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MATERIAL_PAGES_PER_CHUNK * MAX_MATERIAL_CHUNKS) throw new Error("document_page_limit")
  return Array.from({ length: Math.ceil(pageCount / MATERIAL_PAGES_PER_CHUNK) }, (_, index) => ({
    first: index * MATERIAL_PAGES_PER_CHUNK,
    last: Math.min(pageCount, (index + 1) * MATERIAL_PAGES_PER_CHUNK) - 1,
  }))
}

export function nextMissingMaterialChunk(results: Record<string, unknown>, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_MATERIAL_CHUNKS) throw new Error("document_page_limit")
  for (let index = 0; index < count; index += 1) if (!Object.hasOwn(results, String(index))) return index
  return null
}

export function materialChunkInstruction(index: number, count: number, label: string) {
  return `Document part ${index + 1} of ${count}: ${label}. Extract every explicit material row on these pages, retaining exact supporting sourceText and section headings. This is one part of a mixed packet: extract explicit RFQ/shopping rows even when architectural plans are elsewhere in the packet. Plans alone still require takeoff; never infer their quantities. Preserve HOLD, provisional, unverified and conflicting quantities as review-required, never ready. ${index === 0 ? "Include independently requested typed-note rows; merge a typed repetition of a visible row only once." : "Typed notes are context only in this part; do not repeat their material rows. Only emit rows evidenced on the attached pages."}`
}
