export function firstListedPrice(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY

  const currencyMatch = value.match(/(?:US\s*)?\$\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i)
  const plainMatch = value.match(/\b([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\b/)
  const candidate = currencyMatch?.[1] ?? plainMatch?.[1]
  if (!candidate) return Number.POSITIVE_INFINITY

  const parsed = Number(candidate.replaceAll(",", ""))
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}
