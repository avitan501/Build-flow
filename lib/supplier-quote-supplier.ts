import type { CatalogSupplier } from "@/lib/material-catalog"

function searchable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function detectSupplierMatch(suppliers: Array<Pick<CatalogSupplier, "id" | "name">>, detectedName: string, documentText: string) {
  const haystack = searchable(`${detectedName} ${documentText.slice(0, 5000)}`)
  if (!haystack) return null
  return suppliers
    .map((supplier) => {
      const name = searchable(supplier.name)
      const tokens = name.split(" ").filter((token) => token.length > 1)
      const score = name && haystack.includes(name) ? 100 : tokens.length && tokens.every((token) => haystack.includes(token)) ? 80 + tokens.length : 0
      return { supplier, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.supplier.name.length - a.supplier.name.length)[0]?.supplier ?? null
}

export function inferSupplierName(documentText: string) {
  const businessWord = /\b(?:doors?|lumber|supply|supplies|materials?|hardware|electric(?:al)?|plumbing|tile|floor(?:ing)?|roof(?:ing)?|siding|kitchen|cabinets?|glass|stone|concrete)\b/i
  const documentWord = /^(?:estimate|invoice|quote|receipt|statement|page)$/i
  for (const originalLine of documentText.split(/\r?\n/).slice(0, 20)) {
    const line = originalLine.replace(/[^a-zA-Z0-9&' -]+/g, " ").replace(/\s+/g, " ").trim()
    if (!businessWord.test(line) || /\b(?:subtotal|total|sales tax)\b/i.test(line)) continue
    const words = line.split(" ").filter((word) => word.length > 2 && !documentWord.test(word) && !/^\d+$/.test(word))
    const name = words.join(" ").trim().slice(0, 200)
    if (name.length >= 3) return name
  }
  return ""
}
