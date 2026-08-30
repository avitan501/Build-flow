export type SmsReplyIntent =
  | "greeting"
  | "material_request"
  | "image_or_plan"
  | "pricing"
  | "availability"
  | "delivery"
  | "follow_up"
  | "supplier"
  | "correction"
  | "cancellation"
  | "sensitive"
  | "general";

export type SmsReplyExample = {
  customer_message: string;
  approved_reply: string;
  language: string | null;
  intent: string;
};

const MATERIAL_TERMS = /\b(?:drywal+l?|sheetrock|plywood|lumber|studs?|tracks?|boards?|sheets?|bags?|boxes?|buckets?|rolls?|cement|concrete|compound|screws?|insulation|material(?:s)?)\b|(?:חומר(?:ים)?|לוחות?|שקים?|ארגזים?|ברגים|בידוד|גבס)|\b(?:material(?:es)?|paneles?|placas?|bolsas?|cajas?|tornillos?|aislamiento|yeso)\b/i;

export function smsReplyLanguage(value: string) {
  if (/[\u0590-\u05ff]/.test(value)) return "he";
  if (/[áéíóúñ¿¡]/i.test(value) || /\b(?:hola|gracias|necesito|precio|entrega|cotizaci[oó]n|direcci[oó]n)\b/i.test(value)) return "es";
  return "en";
}

export function looksLikeSmsMaterialRequest(value: string) {
  const meaningfulLines = value.split(/\r?\n|;/).map((line) => line.trim()).filter(Boolean);
  const quantifiedMaterial = /\b\d+(?:\.\d+)?\s*(?:x\s*)?(?:ea|each|pcs?|pieces?|boxes?|sheets?|ft|feet|rolls?|bags?|buckets?|units?)?\s*[a-z]/i.test(value) && MATERIAL_TERMS.test(value);
  const structuredList = meaningfulLines.length >= 3 && meaningfulLines.filter((line) => /\d/.test(line) || MATERIAL_TERMS.test(line)).length >= 3;
  return quantifiedMaterial || structuredList || /\b(?:need|order|send)\b.{0,80}/i.test(value) && MATERIAL_TERMS.test(value) || /(?:צריך|צריכ(?:ה|ים)|להזמין).{0,80}/i.test(value) && MATERIAL_TERMS.test(value) || /\b(?:necesito|ordenar|mandar)\b.{0,80}/i.test(value) && MATERIAL_TERMS.test(value);
}

export function classifySmsReplyIntent(params: {
  message: string;
  hasImage?: boolean;
  event?: "message" | "duplicate" | "correction" | "cancellation";
  participantRole?: "customer" | "lead" | "supplier" | "unknown";
  isMaterialRequest?: boolean;
  forbiddenTopic?: boolean;
}): SmsReplyIntent {
  const { message } = params;
  if (params.event === "correction") return "correction";
  if (params.event === "cancellation") return "cancellation";
  if (params.participantRole === "supplier") return "supplier";
  if (params.forbiddenTopic) return "sensitive";
  if (params.hasImage || /\b(?:photo|image|plan|attachment|drawing)\b|(?:תמונה|תכנית|קובץ)|\b(?:foto|imagen|plano|archivo)\b/i.test(message)) return "image_or_plan";

  // A status question stays a follow-up even when it mentions a quote, price, order, or delivery.
  if (/\b(?:status|update|following up|follow up|any news|where is|what(?:'s| is) happening)\b|(?:סטטוס|עדכון|מה\s*קורה)|\b(?:estado|actualizaci[oó]n|alguna novedad|qu[eé] pasa)\b/i.test(message)) return "follow_up";
  if (/\b(?:price|pric|pricing|cost|quote|quot|how much)\b|(?:מחיר|הצעת\s*מחיר)|\b(?:precio|cotizaci[oó]n|cu[aá]nto cuesta)\b/i.test(message)) return "pricing";
  if (/\b(?:in stock|available|availability|inventory)\b|(?:במלאי|זמין|זמינות)|\b(?:en stock|disponible|disponibilidad|inventario)\b/i.test(message)) return "availability";
  if (/\b(?:delivery|deliver|jobsite|address)\b|(?:משלוח|אספקה|כתובת)|\b(?:entrega|direcci[oó]n)\b/i.test(message)) return "delivery";
  if (params.isMaterialRequest || looksLikeSmsMaterialRequest(message)) return "material_request";
  if (/^\s*(?:hi|hello|hey|hola|שלום|היי|good (?:morning|afternoon|evening))[!.?\s]*$/i.test(message)) return "greeting";
  return "general";
}

export function smsRequiresExactList(value: string) {
  return /\b(?:only (?:what|the items?|the list)|exact(?:ly)? (?:what|the items?|the list)|exact list only|no (?:extras?|accessories|suggestions)|nothing else)\b/i.test(value) ||
    /\b(?:solo (?:lo que|la lista|los art[ií]culos)|exactamente (?:lo que|la lista)|sin (?:extras|accesorios|sugerencias)|nada m[aá]s)\b/i.test(value) ||
    /(?:רק\s*(?:מה\s*שכתבתי|את\s*הרשימה|מה\s*שביקשתי)|בדיוק\s*(?:מה\s*שכתבתי|הרשימה)|רשימה\s*מדויקת\s*בלבד|בלי\s*(?:תוספות|אביזרים|הצעות)|שום\s*דבר\s*נוסף)/i.test(value);
}

export function smsHasFullDeliveryAddress(value: string) {
  return /\b\d{1,6}\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,5}\s+(?:st(?:reet)?|ave(?:nue)?|rd|road|blvd|boulevard|dr(?:ive)?|ln|lane|ct|court|way|pkwy|parkway)\b/i.test(value) ||
    /\b(?:calle|avenida|camino|ruta)\s+[\p{L}0-9.'-]+(?:\s+[\p{L}0-9.'-]+){0,5}\s+\d{1,6}\b/iu.test(value) ||
    /(?:רחוב\s+[\p{L}"׳״'-]+(?:\s+[\p{L}"׳״'-]+){0,4}\s+\d{1,5})/u.test(value);
}

export function smsReplySuggestsOptionalItems(value: string) {
  return /\b(?:also (?:consider|add|include)|would you like (?:to add|any)|related items?|accessories|optional items?|you may (?:also )?need)\b/i.test(value) ||
    /\b(?:tambi[eé]n (?:considere|agregue|incluya)|accesorios|art[ií]culos opcionales)\b/i.test(value) ||
    /(?:כדאי\s*גם|להוסיף\s*גם|אביזרים|פריטים\s*נוספים|תוספות\s*אופציונליות)/i.test(value);
}

export function enforceSmsOneQuestion(value: string) {
  const sentences = value.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  let keptQuestion = false;
  return sentences.filter((sentence) => {
    const isQuestion = /[?？]/.test(sentence);
    if (!isQuestion) return true;
    if (keptQuestion) return false;
    keptQuestion = true;
    return true;
  }).slice(0, 2).join(" ").trim().slice(0, 1600);
}

const REQUESTED_FIELD_PATTERNS = [
  /\b(?:size|dimensions?|medida|tama[nñ]o)\b|(?:גודל|מידות?)/i,
  /\b(?:thickness|gauge|espesor)\b|(?:עובי)/i,
  /\b(?:quantity|how many|cantidad)\b|(?:כמה|כמות|יחידות?)/i,
  /\b(?:full )?(?:delivery )?address\b|\b(?:direcci[oó]n (?:completa )?(?:de entrega)?)\b|(?:כתובת (?:המשלוח )?המלאה)/i,
  /\b(?:delivery date|time window|fecha de entrega|ventana de tiempo)\b|(?:תאריך משלוח|חלון זמן)/i,
  /\b(?:brand|manufacturer|marca|fabricante|מותג|יצרן)\b/i,
];

export function inspectSmsQuestionStructure(value: string) {
  const questionMarks = (value.match(/[?？]/g) || []).length;
  const questionText = value.split(/(?<=[?？])/).find((part) => /[?？]/.test(part)) || "";
  const requestedFields = REQUESTED_FIELD_PATTERNS.reduce((count, pattern) => count + (pattern.test(questionText) ? 1 : 0), 0);
  const bundledConnector = requestedFields > 1 || /\b(?:and|or|y|o)\b|(?:ו(?:מה|איזה|מתי|כמה|כתובת|גודל|עובי))/i.test(questionText) && requestedFields > 0;
  return {
    valid: questionMarks <= 1 && requestedFields <= 1 && !bundledConnector,
    questionMarks,
    requestedFields,
    reason: questionMarks > 1 ? "multiple question marks" : requestedFields > 1 || bundledConnector ? "bundled requested fields" : null,
  };
}

export function smsOutputSafetySignals(params: { reply: string; intent: SmsReplyIntent }) {
  const signals: string[] = [];
  const reply = params.reply;
  const numericPrice = /(?:[$€£]\s*\d|\b\d[\d,.]*\s*(?:usd|dollars?|euros?|shekels?|₪|each|ea\b|\/\s*ea\b|per\s+(?:unit|piece|sheet|bag|box))|\b(?:price|cost|total|מחיר|עלות|סה[״']?כ|precio|costo|total)\s*(?:is|:|הוא|es)?\s*[$€£₪]?\s*\d)/i.test(reply);
  const stockAssertion = /\b(?:is|are|it's|they're)\s+(?:currently\s+)?(?:in stock|available)|\bwe\s+have\s+(?:it|them|this|those)?\s*(?:in stock|available)|\b(?:currently\s+)?available\s+(?:now|today)|\b(?:out of stock|sold out)|\b(?:stock|availability)\s+(?:is|:)?\s*(?:confirmed|available|yes)|(?:יש\s+(?:לנו\s+)?במלאי|זמין\s+(?:כעת|עכשיו|במלאי)|אזל\s+מהמלאי|המלאי\s+אושר)|\b(?:est[aá]|hay|tenemos)\s+(?:disponible|en stock)\b/i.test(reply);
  const deliveryOrOrderPromise = /\b(?:we|i|avantia)\s+(?:will|can|guarantee|promise)\s+(?:deliver|place|process|complete|confirm)\b|\b(?:order|delivery)\s+(?:is|has been)\s+(?:confirmed|placed|scheduled|guaranteed|ready|today|tomorrow)|\bdelivery\s+is\s+(?:today|tomorrow|on\s+\w+)|(?:נ(?:ספק|בצע|אשר)|המשלוח\s+(?:מאושר|נקבע|מחר|היום)|ההזמנה\s+(?:אושרה|בוצעה|מוכנה))|\b(?:vamos a|podemos|garantizamos)\s+(?:entregar|procesar|confirmar)|\b(?:pedido|entrega)\s+(?:est[aá]|ha sido)\s+(?:confirmad[oa]|programad[oa]|list[oa]|hoy|ma[nñ]ana)\b/i.test(reply);
  const question = inspectSmsQuestionStructure(reply);
  if (numericPrice) signals.push("reply contains an unapproved numeric price");
  if (stockAssertion) signals.push("reply asserts stock or availability");
  if (deliveryOrOrderPromise) signals.push("reply makes a delivery or order promise");
  if (!question.valid && question.reason) signals.push(question.reason);
  if (["pricing", "availability", "delivery"].includes(params.intent)) signals.push(`${params.intent} intent requires manager review`);
  return signals;
}

export function resolveSmsExactListPreference(params: { storedContact?: boolean | null; storedDraft?: boolean | null; conversationText?: string; latestMessage?: string }) {
  return Boolean(params.storedContact || params.storedDraft || smsRequiresExactList(params.latestMessage || "") || smsRequiresExactList(params.conversationText || ""));
}

export function resolveSmsDeliveryAddressKnown(params: { storedContact?: boolean | null; storedDraft?: boolean | null; conversationText?: string; latestMessage?: string }) {
  return Boolean(params.storedContact || params.storedDraft || smsHasFullDeliveryAddress(params.latestMessage || "") || smsHasFullDeliveryAddress(params.conversationText || ""));
}

function normalizedItemWords(value: string) {
  return (value.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).map((word) => word.replace(/(?:es|s)$/i, ""));
}

export function filterSmsExactListItems<T extends { name: string; quantity: number; unit: string }>(items: T[], customerText: string) {
  const textWords = new Set(normalizedItemWords(customerText));
  return items.filter((item) => {
    const nameWords = normalizedItemWords(item.name).filter((word) => !/^(?:the|and|with|for|de|con|את|של)$/.test(word));
    const nameGrounded = nameWords.length > 0 && nameWords.every((word) => textWords.has(word));
    const quantityGrounded = new RegExp(`(?:^|[^0-9])${String(item.quantity).replace(".", "\\.")}(?:[^0-9]|$)`).test(customerText);
    return nameGrounded && quantityGrounded;
  });
}

function exampleTokens(value: string) {
  return new Set(value.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
}

export function rankSmsReplyExamples<T extends SmsReplyExample>(examples: T[], params: { intent: SmsReplyIntent; language: string; message: string }, limit = 3) {
  const queryTokens = exampleTokens(params.message);
  return examples.map((example, index) => {
    const overlap = [...exampleTokens(example.customer_message)].filter((token) => queryTokens.has(token)).length;
    const score = (example.intent === params.intent ? 100 : example.intent === "general" ? 20 : 0) +
      (example.language === params.language ? 30 : example.language === null ? 5 : 0) + overlap * 4;
    return { example, score, index };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ example }) => example);
}
