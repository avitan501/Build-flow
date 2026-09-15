/** Reconstruct horizontal PDF rows from coordinates, not PDF paint order.
 * This is a text-layer aid, not OCR: rotated/empty pages still need visual AI.
 */
export function supplierQuotePageText(items: unknown[]): string {
  const spans = items.flatMap(value => {
    if (!value || typeof value !== "object") return []
    const item = value as { str?: unknown; transform?: unknown; height?: unknown }
    if (typeof item.str !== "string" || !item.str.trim() || !Array.isArray(item.transform)) return []
    const [a, b, c, d, x, y] = item.transform as number[]
    if (![a, b, c, d, x, y].every(Number.isFinite) || Math.abs(b) > 0.1 || Math.abs(c) > 0.1) return []
    return [{ text: item.str, x, y, height: Math.abs(Number(item.height) || d || 8) }]
  }).sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: Array<{ y: number; tolerance: number; spans: typeof spans }> = []
  for (const span of spans) {
    const tolerance = Math.max(1, Math.min(3, span.height * 0.4))
    const last = lines.at(-1)
    if (last && Math.abs(last.y - span.y) <= Math.min(last.tolerance, tolerance)) last.spans.push(span)
    else lines.push({ y: span.y, tolerance, spans: [span] })
  }
  return lines.map(line => line.spans.sort((a, b) => a.x - b.x).map(span => span.text).join(" ").replace(/\s+/g, " ").trim()).join("\n")
}
