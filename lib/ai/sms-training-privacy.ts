export const SMS_CORRECTION_REASONS = [
  "tone",
  "too_long",
  "repeated_question",
  "wrong_or_missing_fact",
  "wrong_item_or_quantity",
  "safety_or_commitment",
] as const

export type SmsCorrectionReason = (typeof SMS_CORRECTION_REASONS)[number]

export function isSmsCorrectionReason(value: unknown): value is SmsCorrectionReason {
  return typeof value === "string" && (SMS_CORRECTION_REASONS as readonly string[]).includes(value)
}

export function smsTrainingLanguage(value: string) {
  if (/[\u0590-\u05ff]/.test(value)) return "he"
  if (/[áéíóúñ¿¡]/i.test(value) || /\b(?:hola|gracias|necesito|precio|entrega|cotizaci[oó]n)\b/i.test(value)) return "es"
  return "en"
}

export function smsTrainingIntent(value: string) {
  if (/\b(?:refund|cancel|complain|lawyer|attorney|payment|credit card)\b|(?:החזר|ביטול|תלונה|תשלום)|\b(?:reembolso|cancelar|pago|queja)\b/i.test(value)) return "sensitive"
  if (/\b(?:price|pricing|cost|quote|how much)\b|(?:מחיר|הצעת מחיר)|\b(?:precio|cotizaci[oó]n)\b/i.test(value)) return "pricing"
  if (/\b(?:delivery|deliver|jobsite)\b|(?:משלוח|אספקה|כתובת)|\b(?:entrega|direcci[oó]n)\b/i.test(value)) return "delivery"
  if (/\b(?:status|update|following up|any news)\b|(?:סטטוס|עדכון|מה קורה)|\b(?:estado|actualizaci[oó]n)\b/i.test(value)) return "follow_up"
  if (/\b(?:photo|image|plan|attachment|drawing)\b|(?:תמונה|תכנית|קובץ)|\b(?:foto|imagen|plano|archivo)\b/i.test(value)) return "image_or_plan"
  if (/\b(?:need|material|sheet|stud|bag|box|bucket|roll|order)\b|(?:צריך|חומר|לוח|שק|ארגז)|\b(?:necesito|material|bolsa|caja)\b/i.test(value)) return "material_request"
  if (/^\s*(?:hi|hello|hey|hola|שלום|היי|good (?:morning|afternoon|evening))[!.?\s]*$/i.test(value)) return "greeting"
  return "general"
}

/** Remove customer-specific values before an approved reply becomes a reusable style example. */
export function redactSmsTrainingText(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[PHONE]")
    .replace(/\$\s?\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*(?:\.\d{2})?\s*(?:dollars?|usd)\b/gi, "[PRICE]")
    .replace(/\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,5}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Parkway|Pkwy)\b(?:[^\n,]*,?\s*[A-Za-z .'-]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?/gi, "[FULL_ADDRESS]")
    .replace(/\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/](?:\d{2}|\d{4})\b/g, "[DATE]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1600)
}
