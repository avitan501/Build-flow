import type { SupplierRoutingOption } from "@/lib/shop-qualification"

function collectSearchValues(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [String(value)]
  if (Array.isArray(value)) return value.flatMap(collectSearchValues)
  if (value && typeof value === "object") return Object.values(value).flatMap(collectSearchValues)
  return []
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function supplierMatchesDirectorySearch(supplier: SupplierRoutingOption, query: string) {
  const terms = normalizeSearchValue(query).trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true

  const searchableText = normalizeSearchValue(collectSearchValues(supplier).join(" "))
  const compactSearchableText = searchableText.replace(/[^a-z0-9]+/g, "")

  return terms.every((term) => {
    if (searchableText.includes(term)) return true
    const compactTerm = term.replace(/[^a-z0-9]+/g, "")
    return compactTerm.length > 0 && compactSearchableText.includes(compactTerm)
  })
}
