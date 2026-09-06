function canonicalDocumentValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalDocumentValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalDocumentValue(entry)]),
    )
  }
  if (typeof value === "number" && Object.is(value, -0)) return 0
  return value
}

export function requestClientDocumentContentMatches(current: unknown, next: unknown) {
  return JSON.stringify(canonicalDocumentValue(current)) === JSON.stringify(canonicalDocumentValue(next))
}
