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

const MATERIAL_TERMS = /\b(?:drywal+l?|sheetrock|plywood|lumber|studs?|tracks?|boards?|sheets?|bags?|boxes?|buckets?|rolls?|thinset|mortar|cement|concrete|compound|screws?|insulation|material(?:s)?)\b|(?:חומר(?:ים)?|לוחות?|שקים?|ארגזים?|ברגים|בידוד|גבס)|\b(?:material(?:es)?|paneles?|placas?|bolsas?|cajas?|tornillos?|aislamiento|yeso|mortero)\b/i;

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
  if (/\b(?:in stock|available|availability|inventory|do you (?:sell|carry|have|source)|you guys (?:sell|carry|have|source))\b|(?:במלאי|זמין|זמינות)|\b(?:en stock|disponible|disponibilidad|inventario)\b/i.test(message)) return "availability";
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

export function enforceSmsQuestionLimit(value: string) {
  return value.trim().slice(0, 1600);
}

export type SmsRequestedField = "size" | "thickness" | "quantity" | "address" | "needed_by" | "brand" | "specification" | "source";

const REQUESTED_FIELD_PATTERNS: Array<{ field: SmsRequestedField; pattern: RegExp }> = [
  { field: "size", pattern: /\b(?:size|dimensions?|medida|tama[nñ]o)\b|(?:גודל|מידות?)/i },
  { field: "thickness", pattern: /\b(?:thickness|gauge|espesor)\b|(?:עובי)/i },
  { field: "quantity", pattern: /\b(?:quantity|how many|how much|cantidad|cu[aá]nt[oa]s?)\b|(?:כמה|כמות|יחידות?)/i },
  { field: "address", pattern: /\b(?:full )?(?:delivery )?address\b|\b(?:direcci[oó]n (?:completa )?(?:de entrega)?)\b|(?:כתובת (?:המשלוח )?המלאה)/i },
  { field: "needed_by", pattern: /\b(?:needed-by date|needed by|when do you need|delivery date|time window|what date|fecha de entrega|para qu[eé] fecha|para cu[aá]ndo|ventana de tiempo)\b|(?:תאריך משלוח|חלון זמן|לאיזה תאריך|מתי)/i },
  { field: "brand", pattern: /\b(?:brand|manufacturer|marca|fabricante)\b|(?:מותג|יצרן)/i },
  { field: "specification", pattern: /\b(?:product specification|model|type|style|color|finish|modelo|tipo|color|acabado)\b|(?:דגם|סוג|צבע|גימור)/i },
  { field: "source", pattern: /\b(?:material list|photo|image|plan|drawing|product link|lista de materiales|foto|imagen|plano)\b|(?:רשימת חומרים|תמונה|תכנית|קישור למוצר)/i },
];

export function inspectSmsQuestionStructure(value: string, knownFields: SmsRequestedField[] = []) {
  const questionMarks = (value.match(/[?？]/g) || []).length;
  const questions = value.match(/[^?？]*[?？]/g) || [];
  const fieldsByQuestion = questions.map((question) => REQUESTED_FIELD_PATTERNS.filter(({ pattern }) => pattern.test(question)).map(({ field }) => field));
  const fields = fieldsByQuestion.flat();
  const safeDeliveryPair = fieldsByQuestion.some((questionFields, index) => questionFields.length === 2 && questionFields.includes("address") && questionFields.includes("needed_by") && /\b(?:and|y)\b|(?:ו)/i.test(questions[index] || ""));
  const bundled = fieldsByQuestion.some((questionFields) => questionFields.length > 1) && !safeDeliveryPair;
  const repeated = new Set(fields).size !== fields.length;
  const asksKnownField = fields.some((field) => knownFields.includes(field));
  return {
    valid: questionMarks <= 3 && fields.length <= 3 && !bundled && !repeated && !asksKnownField,
    questionMarks,
    requestedFields: fields.length,
    fields,
    reason: questionMarks > 3 || fields.length > 3 ? "more than three questions" : bundled ? "bundled requested fields" : repeated ? "repeated requested field" : asksKnownField ? "question repeats an already-known field" : null,
  };
}

export function smsOutputSafetySignals(params: { reply: string; intent: SmsReplyIntent; knownFields?: SmsRequestedField[] }) {
  const signals: string[] = [];
  const reply = params.reply;
  const numericPrice = /(?:[$€£]\s*\d|\b\d[\d,.]*\s*(?:usd|dollars?|euros?|shekels?|₪|each|ea\b|\/\s*ea\b|per\s+(?:unit|piece|sheet|bag|box))|\b(?:price|cost|total|מחיר|עלות|סה[״']?כ|precio|costo|total)\s*(?:is|:|הוא|es)?\s*[$€£₪]?\s*\d)/i.test(reply);
  const stockAssertion = /\b(?:is|are|it's|they're)\s+(?:currently\s+)?(?:in stock|available)|\bwe\s+have\s+(?:it|them|this|those)?\s*(?:in stock|available)|\b(?:currently\s+)?available\s+(?:now|today)|\b(?:out of stock|sold out)|\b(?:stock|availability)\s+(?:is|:)?\s*(?:confirmed|available|yes)|(?:יש\s+(?:לנו\s+)?במלאי|זמין\s+(?:כעת|עכשיו|במלאי)|אזל\s+מהמלאי|המלאי\s+אושר)|\b(?:est[aá]|hay|tenemos)\s+(?:disponible|en stock)\b/i.test(reply);
  const deliveryOrOrderPromise = /\b(?:we|i|avantia)\s+(?:will|can|guarantee|promise)\s+(?:deliver|place|process|complete|confirm)\b|\b(?:order|delivery)\s+(?:is|has been)\s+(?:confirmed|placed|scheduled|guaranteed|ready|today|tomorrow)|\bdelivery\s+is\s+(?:today|tomorrow|on\s+\w+)|(?:נ(?:ספק|בצע|אשר)|המשלוח\s+(?:מאושר|נקבע|מחר|היום)|ההזמנה\s+(?:אושרה|בוצעה|מוכנה))|\b(?:vamos a|podemos|garantizamos)\s+(?:entregar|procesar|confirmar)|\b(?:pedido|entrega)\s+(?:est[aá]|ha sido)\s+(?:confirmad[oa]|programad[oa]|list[oa]|hoy|ma[nñ]ana)\b/i.test(reply);
  const transactionalStatusAssertion = /\b(?:your|the)\s+(?:order|quote|delivery|request)\s+(?:is|was|has been)\s+(?:ready|approved|confirmed|shipped|dispatched|scheduled|completed|processed)|\b(?:supplier|vendor)\s+(?:confirmed|approved|replied)|(?:ההזמנה|ההצעה|המשלוח|הבקשה)\s+(?:מוכנה|אושרה|נשלחה|נקבעה|הושלמה)|\b(?:su|el|la)\s+(?:pedido|cotizaci[oó]n|entrega|solicitud)\s+(?:est[aá]|fue|ha sido)\s+(?:list[oa]|aprobad[oa]|confirmad[oa]|enviad[oa]|programad[oa]|completad[oa])/i.test(reply);
  const question = inspectSmsQuestionStructure(reply, params.knownFields);
  const requiresEssentialField = ["material_request", "image_or_plan", "pricing", "availability", "delivery"].includes(params.intent);
  if (numericPrice) signals.push("reply contains an unapproved numeric price");
  if (stockAssertion) signals.push("reply asserts stock or availability");
  if (deliveryOrOrderPromise) signals.push("reply makes a delivery or order promise");
  if (transactionalStatusAssertion) signals.push("reply asserts an unsupported transactional status");
  if (smsReplySuggestsOptionalItems(reply)) signals.push("reply asks an accessory or optional-item question");
  if (requiresEssentialField && question.questionMarks > 0 && question.requestedFields === 0) signals.push("question is not an essential request field");
  if (!question.valid && question.reason) signals.push(question.reason);
  return signals;
}

export type SmsReplyGateDecision = {
  level: "green" | "yellow" | "red";
  signals: string[];
  explanation: string;
  gateAutoSafe: boolean;
};

export function evaluateSmsReplyGate(params: {
  message: string;
  reply: string;
  intent: SmsReplyIntent;
  event?: "message" | "duplicate" | "correction" | "cancellation";
  participantRole?: "customer" | "lead" | "supplier" | "unknown";
  modelAutoSafe: boolean;
  protectedTopic?: boolean;
  knownFields?: SmsRequestedField[];
}): SmsReplyGateDecision {
  const signals: string[] = [];
  const protectedEvent = params.event === "correction" || params.event === "cancellation";
  const supplier = params.participantRole === "supplier" || params.intent === "supplier";
  if (params.protectedTopic) signals.push("protected customer topic");
  if (protectedEvent) signals.push(`${params.event} requires manager confirmation`);
  if (supplier) signals.push("supplier routed to manager");
  if (/\bzip(?:\s+code)?\b/i.test(params.reply)) signals.push("reply asks for ZIP instead of full address");
  if (!params.modelAutoSafe) signals.push("model requested manager review");
  signals.push(...smsOutputSafetySignals({ reply: params.reply, intent: params.intent, knownFields: params.knownFields }));
  const hardBlock = Boolean(params.protectedTopic || protectedEvent || supplier || signals.some((signal) => signal !== "model requested manager review"));
  if (hardBlock) return { level: "red", signals, explanation: signals.join(" · ") || "Manager review is required.", gateAutoSafe: false };
  if (!params.modelAutoSafe) return { level: "yellow", signals, explanation: signals.join(" · ") || "Review this draft before sending.", gateAutoSafe: false };
  signals.push(`allowed ${params.intent} playbook`, "no protected topic or commitment", "one-to-three essential-question rule enforced");
  return { level: "green", signals, explanation: signals.join(" · "), gateAutoSafe: true };
}

export function resolveSmsExactListPreference(params: { storedContact?: boolean | null; storedDraft?: boolean | null; conversationText?: string; latestMessage?: string }) {
  return Boolean(params.storedContact || params.storedDraft || smsRequiresExactList(params.latestMessage || "") || smsRequiresExactList(params.conversationText || ""));
}

export function smsStartsNewMaterialRequest(value: string) {
  return /\b(?:new|separate|different)\s+(?:order|job|project|request|material list)\b|(?:הזמנה|עבודה|פרויקט|בקשה|רשימת חומרים)\s+(?:חדשה|חדש|נפרדת|נפרד|אחרת|אחר)|\b(?:nuevo|nueva|separado|separada|diferente)\s+(?:pedido|trabajo|proyecto|solicitud|lista de materiales)\b/i.test(value);
}

export function resolveSmsDeliveryAddressKnown(params: { storedDraft?: boolean | null; conversationText?: string; latestMessage?: string; startsNewRequest?: boolean }) {
  const suppliedNow = smsHasFullDeliveryAddress(params.latestMessage || "") || smsHasFullDeliveryAddress(params.conversationText || "");
  return Boolean(suppliedNow || (!params.startsNewRequest && params.storedDraft));
}

export function smsHasNeededByTiming(value: string) {
  return /\b(?:asap|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+(?:week|month)|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b|(?:דחוף|בהקדם|היום|מחר|יום\s+(?:ראשון|שני|שלישי|רביעי|חמישי|שישי)|שבוע\s+הבא)|\b(?:hoy|ma[nñ]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|pr[oó]xima\s+semana)\b/i.test(value);
}

export function smsHasExplicitQuantity(value: string) {
  return /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:ea|each|pcs?|pieces?|boxes?|sheets?|ft|feet|rolls?|bags?|buckets?|units?|doors?|drywall|thinset|cement|lumber|studs?)\b/i.test(value) ||
    /(?:^|\s)(?:אחד|אחת|שניים|שתיים|שלושה|שלוש|\d+(?:\.\d+)?)\s*(?:יחידות?|ארגזים?|לוחות?|שקים?|דלתות?|גבס)/i.test(value) ||
    /\b(?:uno|una|dos|tres|cuatro|cinco|\d+(?:\.\d+)?)\s*(?:unidades?|cajas?|paneles?|placas?|bolsas?|puertas?|yeso)\b/i.test(value);
}

export function smsQuantityClarificationReply(message: string) {
  if (/[\u0590-\u05ff]/.test(message)) return "בטח—איזו כמות אתה צריך?";
  if (/[áéíóúñ¿¡]/i.test(message)) return "Claro—¿qué cantidad necesita?";
  if (/\bthinset\b/i.test(message)) return "Sure — how much thinset do you need?";
  return "Sure — how much do you need?";
}

export function smsProductInquiryFallbackReply(message: string) {
  const match = message.trim().match(/^(?:do\s+)?(?:you(?:\s+guys)?|u)\s+(?:sell|carry|have|source)\s+(.+?)[?.!]*$/i);
  if (!match?.[1]) return null;
  const rawProduct = match[1].trim().slice(0, 80);
  const product = /sheet\s*(?:rock|rok|ric[kgj]?|rick|trick)/i.test(rawProduct)
    ? "Sheetrock"
    : /thin\s*set/i.test(rawProduct)
      ? "thinset"
      : rawProduct;
  const specification = product === "Sheetrock"
    ? "What thickness do you need?"
    : "What type do you need?";
  const quantity = product === "Sheetrock"
    ? "How many sheets do you need?"
    : `How much ${product} do you need?`;
  return `Yes—we can help with ${product}. ${specification} ${quantity}`;
}

export function smsDeliveryDetailsQuestionReply(message: string) {
  if (/[\u0590-\u05ff]/.test(message)) return "מתי החומרים נדרשים, ומה כתובת המשלוח המלאה?";
  if (/[áéíóúñ¿¡]/i.test(message)) return "¿Para cuándo los necesita y cuál es la dirección completa de entrega?";
  return "When do you need it, and what’s the full delivery address?";
}

export function smsUnansweredFollowUpText(params: { originalMessage: string; questionReply: string }) {
  const language = smsReplyLanguage(`${params.originalMessage}\n${params.questionReply}`);
  const question = params.questionReply;
  const asksQuantity = REQUESTED_FIELD_PATTERNS.find(({ field }) => field === "quantity")?.pattern.test(question);
  const asksAddress = REQUESTED_FIELD_PATTERNS.find(({ field }) => field === "address")?.pattern.test(question);
  const asksTiming = REQUESTED_FIELD_PATTERNS.find(({ field }) => field === "needed_by")?.pattern.test(question);
  if (language === "he") {
    if (asksAddress && asksTiming) return "עדיין צריך עזרה עם פרטי המשלוח?";
    if (asksQuantity) return "עדיין צריך עזרה עם הכמות?";
    if (asksAddress) return "עדיין צריך עזרה עם כתובת המשלוח?";
    if (asksTiming) return "עדיין צריך עזרה עם מועד האספקה?";
    return "עדיין צריך עזרה עם הבקשה?";
  }
  if (language === "es") {
    if (asksAddress && asksTiming) return "¿Aún necesita ayuda con los detalles de entrega?";
    if (asksQuantity) return "¿Aún necesita ayuda con la cantidad?";
    if (asksAddress) return "¿Aún necesita ayuda con la dirección de entrega?";
    if (asksTiming) return "¿Aún necesita ayuda con la fecha necesaria?";
    return "¿Aún necesita ayuda con esto?";
  }
  if (asksAddress && asksTiming) return "Still need help with the delivery details?";
  if (asksQuantity) return "Still need help with the quantity?";
  if (asksAddress) return "Still need help with the delivery address?";
  if (asksTiming) return "Still need help with when you need it?";
  return "Still need help with this?";
}

export function smsUnansweredFollowUpEligible(params: {
  originalMessage: string;
  questionReply: string;
  intent: SmsReplyIntent;
  event?: "message" | "duplicate" | "correction" | "cancellation";
  participantRole?: "customer" | "lead" | "supplier" | "unknown";
  safetyLevel: "green" | "yellow" | "red";
  gateAutoSafe: boolean;
  requestComplete?: boolean;
}) {
  const reply = params.questionReply.trim();
  if (params.safetyLevel !== "green" || !params.gateAutoSafe || params.requestComplete) return false;
  if (params.event === "correction" || params.event === "cancellation") return false;
  if (params.participantRole === "supplier" || ["supplier", "correction", "cancellation", "sensitive", "follow_up"].includes(params.intent)) return false;
  if (/^\s*(?:stop|unsubscribe|end|quit)\s*[.!]?\s*$/i.test(params.originalMessage)) return false;
  if (!/[?？]/.test(reply) || /^\s*[?？]+\s*$/.test(reply)) return false;
  return inspectSmsQuestionStructure(reply).valid;
}

export function smsUnansweredFollowUpCancellationReason(params: {
  sourceExists: boolean;
  autoSafeActive: boolean;
  hasLaterInbound: boolean;
  hasLaterOutbound: boolean;
  requestClosed: boolean;
}) {
  if (!params.sourceExists) return "source message no longer exists";
  if (!params.autoSafeActive) return "contact auto-safe mode is no longer active";
  if (params.hasLaterInbound) return "customer replied after the AI question";
  if (params.hasLaterOutbound) return "a human or later outbound reply was sent";
  if (params.requestClosed) return "the material request is already complete or closed";
  return null;
}

export function smsUnknownContextFallback() {
  return {
    reply: "Automatic reply unavailable — manager review required.",
    autoSafe: false,
    safetyReason: "The request context is not clear enough for a useful automatic reply.",
  } as const;
}

export type SmsMaterialReplyStep = "quantity" | "address" | "address_and_needed_by" | "needed_by" | "complete" | "proposed";

export function resolveSmsMaterialReplyStep(params: {
  isMaterialRequest: boolean;
  hasGroundedItems: boolean;
  quantityKnown?: boolean;
  addressKnown: boolean;
  neededByKnown: boolean;
  proposedReply: string;
}) : SmsMaterialReplyStep {
  if (!params.isMaterialRequest || !params.hasGroundedItems) return "proposed";
  if (params.quantityKnown === false) return "quantity";
  if (!params.addressKnown && !params.neededByKnown) return "address_and_needed_by";
  if (!params.addressKnown) return "address";
  if (!params.neededByKnown) return "needed_by";
  if (smsReplySuggestsOptionalItems(params.proposedReply)) return "complete";
  return "proposed";
}

const APPROVED_ITEM_SYNONYMS: Record<string, string> = {
  sheetrock: "drywall",
  plasterboard: "drywall",
  wallboard: "drywall",
  pcs: "piece",
  pc: "piece",
};

function singularItemWord(value: string) {
  const lower = value.toLowerCase();
  const singular = /(?:ss|us)$/i.test(lower) ? lower : lower.replace(/ies$/i, "y").replace(/(?:ches|shes|xes|zes|ses)$/i, (ending) => ending.slice(0, -2)).replace(/s$/i, "");
  return APPROVED_ITEM_SYNONYMS[singular] || singular;
}

function rawItemWords(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
}

function normalizedItemWords(value: string) {
  return rawItemWords(value).map(singularItemWord);
}

export function filterSmsExactListItems<T extends { name: string; quantity: number; unit: string }>(items: T[], customerText: string) {
  const rawTextWords = rawItemWords(customerText);
  const textWords = new Set(rawTextWords.map(singularItemWord));
  return items.filter((item) => {
    const nameWords = normalizedItemWords(item.name).filter((word) => !/^(?:the|and|with|for|de|con|את|של)$/.test(word));
    const nameGrounded = nameWords.length > 0 && nameWords.every((word) => textWords.has(word));
    const numericQuantityGrounded = new RegExp(`(?:^|[^0-9])${String(item.quantity).replace(".", "\\.")}(?:[^0-9]|$)`).test(customerText);
    const lastNameWord = nameWords.at(-1) || "";
    const singularNameGrounded = rawTextWords.some((word) => singularItemWord(word) === lastNameWord && !/(?:s|es)$/i.test(word));
    const ambiguousPackageUnit = /^(?:boxes?|bags?|buckets?|rolls?|bundles?|pallets?|packs?|cases?|cartons?)$/i.test(item.unit.trim());
    const safeDefaultOne = item.quantity === 1 && singularNameGrounded && !ambiguousPackageUnit;
    const quantityGrounded = numericQuantityGrounded || safeDefaultOne;
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
