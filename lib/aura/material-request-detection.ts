export function looksLikeMaterialRequestMessage(channel: string, direction: string | null, rawText: string) {
  if (channel !== "sms" || direction !== "incoming") return false
  const text = rawText.trim()
  if (text.length < 8) return false
  const normalized = text.toLowerCase().replace(/[.!?]+$/g, "").trim()
  // Follow-up acknowledgements belong to the surrounding conversation, but
  // they are not requests by themselves. Keep the review action on the actual
  // material list instead of repeating it on timing or delivery follow-ups.
  if (/^(?:yes|no|ok(?:ay)?|thanks?(?: you)?|asap|tomorrow|today|confirmed?|sounds good|got it)$/i.test(normalized)) return false
  if (/^(?:can you|could you|please)?\s*(?:confirm|check|update)\s+(?:the\s+)?(?:delivery|pickup|time|date)\b/i.test(normalized)) return false
  const hasRequestIntent = /\b(?:need|needs|looking for|quote|pricing|price|order|material(?:s)?|supply|supplies|send me|deliver)\b/i.test(text)
  const hasMaterial = /\b(?:drywall|sheet\s*rock|sheetrock|lumber|studs?|plywood|osb|concrete|cement|mortar|thinset|tile|flooring|roofing|shingles?|siding|window|doors?|molding|paint|primer|compound|tape|corner\s+(?:bead|bit)|screws?|nails?|wire|breaker|outlet|pipe|fitting|heater|hvac|insulation)\b/i.test(text)
  const hasQuantityOrSize = /(?:^|\s)\d+(?:\.\d+)?\s*(?:pc|pcs|piece|pieces|box|boxes|sheet|sheets|roll|rolls|bag|bags|bucket|buckets|ea|each|ft|lb|gal)\b|\b\d+\s*[x×]\s*\d+/im.test(text)
  const looksLikeList = text.split(/\r?\n/).filter((line) => line.trim()).length >= 2 && (hasMaterial || hasQuantityOrSize)
  return looksLikeList || (hasRequestIntent && (hasMaterial || hasQuantityOrSize))
}
