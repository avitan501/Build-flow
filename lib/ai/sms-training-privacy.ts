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
  if (/\b(?:status|update|following up|follow up|any news|where is|what(?:'s| is) happening)\b|(?:סטטוס|עדכון|מה קורה)|\b(?:estado|actualizaci[oó]n|alguna novedad|qu[eé] pasa)\b/i.test(value)) return "follow_up"
  if (/\b(?:price|pric|pricing|cost|quote|quot|how much)\b|(?:מחיר|הצעת מחיר)|\b(?:precio|cotizaci[oó]n|cu[aá]nto cuesta)\b/i.test(value)) return "pricing"
  if (/\b(?:delivery|deliver|jobsite|address)\b|(?:משלוח|אספקה|כתובת)|\b(?:entrega|direcci[oó]n)\b/i.test(value)) return "delivery"
  if (/\b(?:photo|image|plan|attachment|drawing)\b|(?:תמונה|תכנית|קובץ)|\b(?:foto|imagen|plano|archivo)\b/i.test(value)) return "image_or_plan"
  if (/\b(?:need|material|sheet|stud|bag|box|bucket|roll|order|drywal+l?)\b|(?:צריך|חומר|לוח|שק|ארגז)|\b(?:necesito|material|bolsa|caja)\b/i.test(value)) return "material_request"
  if (/^\s*(?:hi|hello|hey|hola|שלום|היי|good (?:morning|afternoon|evening))[!.?\s]*$/i.test(value)) return "greeting"
  return "general"
}

/** Remove customer-specific values before an approved reply becomes a reusable style example. */
export function redactSmsTrainingText(value: string, privateValues: string[] = []) {
  const escapedPrivateValues = [...new Set(privateValues.map((entry) => entry.trim()).filter((entry) => entry.length >= 3))]
    .sort((left, right) => right.length - left.length)
  const contactSafeValue = escapedPrivateValues.reduce((current, privateValue) => current.replace(
    new RegExp(privateValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    "[PRIVATE_NAME]",
  ), value)
  return contactSafeValue
    .replace(/\b(?:customer|client|account|order|purchase order|p\.?o\.?)\s*(?:id|number|no\.?|#|ref(?:erence)?)?\s*[:#-]?\s*[A-Z0-9][A-Z0-9_-]{3,}\b/gi, "[REFERENCE]")
    .replace(/\b(?:cliente|cuenta|pedido|orden de compra)\s*(?:id|n[uú]mero|no\.?|#|referencia)?\s*[:#-]?\s*[A-Z0-9][A-Z0-9_-]{3,}\b/gi, "[REFERENCE]")
    .replace(/(?:לקוח|חשבון|הזמנה)\s*(?:מספר|מזהה|#)?\s*[:#-]?\s*[A-Z0-9][A-Z0-9_-]{3,}/gi, "[REFERENCE]")
    .replace(/\bP\.?O\.?\s+Box\s+\d+[A-Z0-9-]*\b/gi, "[FULL_ADDRESS]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[PHONE]")
    .replace(/\$\s?\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*(?:\.\d{2})?\s*(?:dollars?|usd)\b/gi, "[PRICE]")
    .replace(/\b\d{1,6}(?:-\d{1,6})?\s+[\p{L}0-9.'-]+(?:\s+[\p{L}0-9.'-]+){0,6}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Parkway|Pkwy|Calle|Avenida|Camino|Ruta)\b(?:[^\n]*?\b\d{5}(?:-\d{4})?)?/giu, "[FULL_ADDRESS]")
    .replace(/(?:רחוב\s+)?[\p{L}"׳״'-]+\s+\d{1,5}(?:\s*,\s*[\p{L}"׳״' -]+)?/gu, "[FULL_ADDRESS]")
    .replace(/\b(?:name|customer name|contact|company|business|project|job)\s*:\s*[^,;\n]{2,80}/gi, (match) => match.replace(/:.*/, ": [PRIVATE_NAME]"))
    .replace(/\b(?:my name is|this is|i am|i'm)\s+[A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+){0,3}/giu, "$1 [PRIVATE_NAME]")
    .replace(/\b(?:for|at)\s+[A-Z][\p{L}&'.-]+(?:\s+[A-Z][\p{L}&'.-]+){0,4}\s+(?:Construction|Builders?|Contracting|LLC|Inc\.?|Corp\.?|Project)\b/gu, "for [PRIVATE_ORGANIZATION]")
    .replace(/\b(?:proyecto|empresa|compa[nñ][ií]a|nombre)\s*:\s*[^,;\n]{2,80}/gi, (match) => match.replace(/:.*/, ": [PRIVATE_NAME]"))
    .replace(/(?:שם|חברה|פרויקט|איש קשר)\s*:\s*[^,;\n]{2,80}/g, (match) => match.replace(/:.*/, ": [PRIVATE_NAME]"))
    .replace(/\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/](?:\d{2}|\d{4})\b/g, "[DATE]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1600)
}
