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

const SMS_OPT_OUT_PATTERN = /^\s*(?:stop|unsubscribe|end|quit|baja|parar|cancelar|הסר|הפסק)\s*[.!?¿¡。！？]?\s*$/iu;

export function isSmsOptOutMessage(value: string) {
  return SMS_OPT_OUT_PATTERN.test(value);
}

const MATERIAL_TERMS = /\b(?:aggregates?|appliances?|baseboards?|batts?|blocks?|breakers?|cabinets?|cables?|cement|cladding|compound|concrete|containers?|doors?|drywal+l?|dumpsters?|ducts?|electrical|fittings?|flooring|grout|hardwood|hvac|insulation|lumber|lvl|materials?|mesh|moldings?|mortar|paint|panels?|pipes?|plumbing|plywood|primer|rebar|registers?|rolls?|roofing|sheetrock|sheets?|shingles?|siding|screws?|studs?|thinset|tiles?|tracks?|trim|valves?|vinyl|windows?|wires?|bags?|boards?|boxes?|buckets?)\b|(?:חומר(?:ים)?|לוחות?|שקים?|ארגזים?|ברגים|בידוד|גבס|רעפים|חלונות|דלתות|צבע|ריצוף|ארונות|צנרת|חשמל)|\b(?:aislamiento|azulejos?|baldosas?|bolsas?|cables?|cajas?|cemento|concreto|contenedores?|gabinetes?|material(?:es)?|paneles?|placas?|pintura|plomer[ií]a|puertas?|techo|tornillos?|tuber[ií]a|ventanas?|yeso|mortero)\b/i;

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
  return /\b(?:also (?:consider|add|include)|do you also need|would you like (?:to add|any)|related items?|accessories|optional items?|you may (?:also )?need|you(?:'ll| will| might| probably)? also need|we (?:recommend|suggest) (?:adding|including)|don['’]?t forget)\b/i.test(value) ||
    /\b(?:is|are) (?:also )?(?:useful|recommended)\b/i.test(value) ||
    /\b(?:tambi[eé]n (?:considere|agregue|incluya)|accesorios|art[ií]culos opcionales)\b/i.test(value) ||
    /(?:כדאי\s*גם|להוסיף\s*גם|אביזרים|פריטים\s*נוספים|תוספות\s*אופציונליות)/i.test(value);
}

export function enforceSmsQuestionLimit(value: string) {
  return value.trim().slice(0, 1600);
}

export type SmsRequestedField = "size" | "thickness" | "quantity" | "address" | "needed_by" | "brand" | "color" | "finish" | "specification" | "source";

const REQUESTED_FIELD_PATTERNS: Array<{ field: SmsRequestedField; pattern: RegExp }> = [
  { field: "size", pattern: /\b(?:size|length|dimensions?|medida|tama[nñ]o)\b|(?:גודל|אורך|מידות?)/i },
  { field: "thickness", pattern: /\b(?:thickness|gauge|espesor)\b|\b\d+\s*\/\s*\d+\b|(?:עובי)/i },
  { field: "quantity", pattern: /\b(?:quantity|how many|how much|cantidad|cu[aá]nt[oa]s?)\b|(?:כמה|כמות|יחידות?)/i },
  { field: "address", pattern: /\b(?:full )?(?:delivery )?address\b|\b(?:direcci[oó]n (?:completa )?(?:de entrega)?)\b|(?:כתובת (?:המשלוח )?המלאה)/i },
  { field: "needed_by", pattern: /\b(?:needed-by date|needed by|when do you need|delivery date|time window|what date|fecha de entrega|para qu[eé] fecha|para cu[aá]ndo|ventana de tiempo)\b|(?:תאריך משלוח|חלון זמן|לאיזה תאריך|מתי)/i },
  { field: "brand", pattern: /\b(?:brand|manufacturer|marca|fabricante)\b|(?:מותג|יצרן)/i },
  { field: "color", pattern: /\b(?:color|colour)\b|\bcolor\b|(?:צבע)/i },
  { field: "finish", pattern: /\b(?:finish|sheen|acabado)\b|(?:גימור)/i },
  { field: "specification", pattern: /\b(?:product specification|model|type|style|modelo|tipo)\b|(?:דגם|סוג)/i },
  { field: "source", pattern: /\b(?:material list|photo|image|plan|drawing|product link|lista de materiales|foto|imagen|plano)\b|(?:רשימת חומרים|תמונה|תכנית|קישור למוצר)/i },
];

export function inspectSmsQuestionStructure(value: string, knownFields: SmsRequestedField[] = []) {
  const questionMarks = (value.match(/[?？]/g) || []).length;
  // Do not treat construction-unit abbreviations as sentence boundaries. In
  // copy such as `keep 1/2-in., or change to 5/8-in.?`, splitting on `in.`
  // stripped the actual thickness question down to a bare `?` and the safety
  // gate incorrectly blocked it.
  const normalizedQuestionText = value.replace(/\b(in|ft)\.(?=[,;:?])/gi, "$1");
  // Only inspect the clause that actually contains each question. Without this
  // sentence boundary, an acknowledgement such as "I have the material list."
  // is incorrectly bundled with the following address question.
  const questions = normalizedQuestionText
    .split(/[.!。！\n]+/)
    .flatMap((sentence) => sentence.match(/[^?？]*[?？]/g) || []);
  const fieldsByQuestion = questions.map((question) => REQUESTED_FIELD_PATTERNS.filter(({ pattern }) => pattern.test(question)).map(({ field }) => field));
  const fields = fieldsByQuestion.flat();
  const essentialQuestions = fieldsByQuestion.filter((questionFields) => questionFields.length > 0).length;
  const subjectFor = (question: string) => question.match(/\b(?:appliances?|cabinets?|cables?|concrete|doors?|drywall|dumpsters?|flooring|hvac|insulation|lumber|moldings?|paint|pipes?|plumbing|primer|roofing|sheetrock|shingles?|siding|studs?|screws?|corner\s+bead|tape|compound|thinset|tile|trim|windows?|wires?)\b/i)?.[0]?.toLowerCase().replace(/\s+/g, "_") || "generic";
  const safeDeliveryPair = fieldsByQuestion.some((questionFields, index) => questionFields.length === 2 && questionFields.includes("address") && questionFields.includes("needed_by") && /\b(?:and|y)\b|(?:ו)/i.test(questions[index] || ""));
  const safeProductBundle = fieldsByQuestion.some((questionFields, index) =>
    questionFields.length > 1 && (
      subjectFor(questions[index] || "") !== "generic" ||
      (questionFields.length === 2 && questionFields.includes("color") && questionFields.includes("finish"))
    )
  );
  const bundled = fieldsByQuestion.some((questionFields) => questionFields.length > 1) && !safeDeliveryPair && !safeProductBundle;
  // The same kind of detail can be required for two different products in one
  // short list (for example primer type and paint finish). Treat that as two
  // distinct questions, while still blocking a repeated question about the
  // same product or a repeated generic field.
  const fieldKeys = fieldsByQuestion.flatMap((questionFields, index) => questionFields.map((field) => `${field}:${subjectFor(questions[index] || "")}`));
  const repeated = new Set(fieldKeys).size !== fieldKeys.length;
  const asksKnownField = fields.some((field) => knownFields.includes(field));
  return {
    valid: questionMarks <= 3 && essentialQuestions <= 3 && !bundled && !repeated && !asksKnownField,
    questionMarks,
    requestedFields: fields.length,
    fields,
    reason: questionMarks > 3 || essentialQuestions > 3 ? "more than three questions" : bundled ? "bundled requested fields" : repeated ? "repeated requested field" : asksKnownField ? "question repeats an already-known field" : null,
  };
}

function isApprovedSheetrockRelatedSuggestion(message: string, reply: string, exactListOnly = false) {
  if (exactListOnly || (!looksLikeSheetrock(message) && !/drywall/i.test(message))) return false;
  return /do you also need joint compound, tape, corner bead, or drywall screws\?/i.test(reply);
}

export function smsOutputSafetySignals(params: { message?: string; reply: string; intent: SmsReplyIntent; knownFields?: SmsRequestedField[]; exactListOnly?: boolean }) {
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
  if (smsReplySuggestsOptionalItems(reply) && !isApprovedSheetrockRelatedSuggestion(params.message || "", reply, params.exactListOnly)) signals.push("reply asks an accessory or optional-item question");
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
  exactListOnly?: boolean;
}): SmsReplyGateDecision {
  const signals: string[] = [];
  const protectedEvent = params.event === "correction" || params.event === "cancellation";
  const supplier = params.participantRole === "supplier" || params.intent === "supplier";
  if (params.protectedTopic) signals.push("protected customer topic");
  if (protectedEvent) signals.push(`${params.event} requires manager confirmation`);
  if (supplier) signals.push("supplier routed to manager");
  if (/\bzip(?:\s+code)?\b/i.test(params.reply)) signals.push("reply asks for ZIP instead of full address");
  if (!params.modelAutoSafe) signals.push("model requested manager review");
  signals.push(...smsOutputSafetySignals({ message: params.message, reply: params.reply, intent: params.intent, knownFields: params.knownFields, exactListOnly: params.exactListOnly }));
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
  if (/\b(?:not|don['’]?t|do\s+not|is\s+this|is\s+that|should\s+(?:this|that|i|we))\b.{0,40}\b(?:new|separate|different)\s+(?:order|job|project|request|material list)\b/i.test(value) ||
    /(?:לא|אל)\s+(?:לפתוח|תפתח|ליצור|תיצור).{0,30}(?:הזמנה|עבודה|פרויקט|בקשה)\s+(?:חדשה|חדש|נפרדת|נפרד)/i.test(value) ||
    /\b(?:no|not?)\s+(?:abra|crear|cree).{0,30}\b(?:nuevo|nueva|separado|separada)\s+(?:pedido|trabajo|proyecto|solicitud)\b/i.test(value)) return false;
  return /\b(?:new|separate|different)\s+(?:order|job|project|request|material list)\b|(?:הזמנה|עבודה|פרויקט|בקשה|רשימת חומרים)\s+(?:חדשה|חדש|נפרדת|נפרד|אחרת|אחר)|\b(?:nuevo|nueva|separado|separada|diferente)\s+(?:pedido|trabajo|proyecto|solicitud|lista de materiales)\b/i.test(value);
}

export function resolveSmsDeliveryAddressKnown(params: { storedDraft?: boolean | null; conversationText?: string; latestMessage?: string; startsNewRequest?: boolean }) {
  const suppliedNow = smsHasFullDeliveryAddress(params.latestMessage || "") || smsHasFullDeliveryAddress(params.conversationText || "");
  return Boolean(suppliedNow || (!params.startsNewRequest && params.storedDraft));
}

// A bare two-part fraction such as 5/8 is a common construction specification,
// not a delivery date. Two-part numeric dates therefore require an explicit
// timing cue; a three-part date is unambiguous enough to stand alone.
const SMS_NEEDED_BY_TIMING_PATTERN = /\b(?:asap|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+(?:week|month)|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:need(?:ed)?(?:\s+it)?\s+(?:by|on|for)|by|delivery(?:\s+(?:on|for))?)\s+\d{1,2}[/-]\d{1,2})\b|(?:דחוף|בהקדם|היום|מחר|יום\s+(?:ראשון|שני|שלישי|רביעי|חמישי|שישי)|שבוע\s+הבא)|\b(?:hoy|ma[nñ]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|pr[oó]xima\s+semana)\b/i;

export function smsNeededByTimingValue(value: string) {
  const matches = [...value.matchAll(new RegExp(SMS_NEEDED_BY_TIMING_PATTERN.source, "gi"))];
  const match = matches.at(-1)?.[0]?.trim();
  if (!match) return null;
  return match.replace(/^(?:need(?:ed)?(?:\s+it)?\s+(?:by|on|for)|by|delivery(?:\s+(?:on|for))?)\s+/i, "");
}

export function smsHasNeededByTiming(value: string) {
  return Boolean(smsNeededByTimingValue(value));
}

export function smsHasExplicitQuantity(value: string) {
  return /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:[a-z][a-z/-]*\s+)?(?:ea|each|pcs?|pieces?|boxes?|sheets?|ft|feet|rolls?|bags?|buckets?|bundles?|cartons?|gallons?|packs?|pallets?|squares?|yards?|units?|appliances?|batts?|beams?|blocks?|cabinets?|containers?|doors?|drywall|dumpsters?|fixtures?|hvac|insulation|lumber|lvl|panels?|shingles?|studs?|thinset|tiles?|windows?)\b/i.test(value) ||
    /\b\d+(?:\.\d+)?\s+\d+(?:\s*[-x×/]\s*\d+){1,2}\s*(?:wood|metal)?\s*(?:studs?|lumber|boards?)\b/i.test(value) ||
    /(?:^|\s)(?:אחד|אחת|שניים|שתיים|שלושה|שלוש|\d+(?:\.\d+)?)\s*(?:יחידות?|ארגזים?|לוחות?|שקים?|דלתות?|גבס)/i.test(value) ||
    /\b(?:uno|una|dos|tres|cuatro|cinco|\d+(?:\.\d+)?)\s*(?:unidades?|cajas?|paneles?|placas?|bolsas?|puertas?|yeso)\b/i.test(value);
}

export function smsMaterialClarificationQuestions(value: string, options: { exactListOnly?: boolean } = {}) {
  const questions: string[] = [];
  const textAfter = (pattern: RegExp) => {
    const match = pattern.exec(value);
    return match ? value.slice((match.index || 0) + match[0].length) : "";
  };

  const paintMatches = [...value.matchAll(/\bpaint\b/gi)];
  const postListAnswer = paintMatches.length > 1 ? value.slice((paintMatches[0].index || 0) + paintMatches[0][0].length) : "";
  const halfInchSheetrock = /\b(?:drywall(?!\s+screws?)|sheetrock)\b[^\n]{0,40}\b(?:4\s*[x×]\s*8\s*[x×]\s*)?1\s*\/\s*2\b|\b1\s*\/\s*2\b[^\n]{0,40}\b(?:drywall(?!\s+screws?)|sheetrock)\b/i;
  if (!options.exactListOnly && !postListAnswer && halfInchSheetrock.test(value) && !/\b(?:keep|confirm(?:ed)?|yes|use|make|change|actually)?\s*(?:1\s*\/\s*2|5\s*\/\s*8)\b/i.test(textAfter(halfInchSheetrock))) {
    questions.push("Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?");
  }

  const cornerBit = /\bcorner\s+bit\b/i;
  const cornerAnswer = textAfter(cornerBit);
  const hasCornerType = /\b(?:metal|vinyl|paper[- ]faced)\b/i.test(cornerAnswer);
  const hasCornerLength = /\b(?:8|10)[-\s]*(?:ft|feet|foot|['’])\b/i.test(cornerAnswer) ||
    /(?:^|\n)\s*(?:8|10)\b[^\n]*\bpaint\b/i.test(cornerAnswer);
  if (cornerBit.test(value) && !(hasCornerType && hasCornerLength)) {
    questions.push(hasCornerLength
      ? "For “corner bit,” which corner bead type: metal or vinyl?"
      : hasCornerType
        ? "For “corner bit,” which length: 8 ft or 10 ft?"
        : "For “corner bit,” which corner bead type and length: metal or vinyl, 8 ft or 10 ft?");
  }

  const paint = /\bpaint\b/i;
  const paintCustomerEvidence = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^Avantia:/i.test(line))
    .map((line) => line.replace(/^Customer:\s*/i, ""))
    .join("\n");
  const paintMatch = paint.exec(paintCustomerEvidence);
  const paintAnswer = paintMatch ? paintCustomerEvidence.slice((paintMatch.index || 0) + paintMatch[0].length) : "";
  const latestCustomerLine = paintCustomerEvidence.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1) || "";
  const paintBrandMatch = latestCustomerLine.match(/\b(?:sherm(?:a|e)n[- ]?willi(?:am|ams)?|sherwin[- ]?williams?|benjamin\s+moore|behr|ppg)\b/i)?.[0] || "";
  const paintBrand = /sherm|sherwin/i.test(paintBrandMatch) ? "Sherwin Williams" : paintBrandMatch;
  const latestCommonColor = latestCustomerLine.match(/\b(?:white|black|gray|grey|beige|tan|brown|blue|green|red|yellow|orange|cream|ivory)\b/i)?.[0] || "";
  const hasPaintFinish = /\b(?:flat|matte|eggshell|satin|semi[- ]gloss|gloss)\b/i.test(paintAnswer);
  const hasPaintColor = /\b(?:white|black|gray|grey|beige|tan|brown|blue|green|red|yellow|orange|cream|ivory|color\s*(?:is|:)?\s*[a-z][a-z -]{1,30})\b/i.test(paintAnswer) ||
    /\b(?:sherwin[- ]?williams?|benjamin\s+moore|behr|ppg)\b[^\n]{0,30}\b[a-z]{1,4}[- ]?\d{1,5}\b/i.test(paintAnswer) ||
    /\b[A-Z]{1,4}-\d{1,5}\b/i.test(paintAnswer);
  if (paint.test(value) && !(hasPaintFinish && hasPaintColor)) {
    questions.push(hasPaintColor
      ? latestCommonColor
        ? `Got it—${latestCommonColor.toLowerCase()}. Which finish: flat, eggshell, satin, or semi-gloss?`
        : "Which paint finish: flat, eggshell, satin, or semi-gloss?"
      : hasPaintFinish
        ? "Got it. What paint color do you need?"
        : paintBrand
          ? `Got it—${paintBrand}. What color, and which finish: flat, eggshell, satin, or semi-gloss?`
          : "What paint color, and which finish: flat, eggshell, satin, or semi-gloss?");
  }

  return [...new Set(questions)].slice(0, 3);
}

export function applyAvantiaMaterialDefaults<T extends { name: string; quantity: number; unit: string }>(items: T[], customerText: string): T[] {
  const bareWood2x4 = /\b\d+\s*(?:pc|pcs|pieces?)?\s*2\s*x\s*4\s*x\s*8\b/i.test(customerText) &&
    !/\bmetal\b[^\n]{0,40}\b2\s*x\s*4\s*x\s*8\b|\b2\s*x\s*4\s*x\s*8\b[^\n]{0,40}\bmetal\b/i.test(customerText);
  const oneThousandScrews = /\b1000\s*(?:pc|pcs|pieces?)\s+(?:box\s+)?(?:drywall\s+)?screws?\b|\b(?:drywall\s+)?screws?\b[^\n]{0,60}\b1000\s*(?:pc|pcs|pieces?)\b/i.test(customerText.replaceAll(",", ""));
  const tapeWithoutQuantity = /^(?![^\n]*\d)[^\n]*\b(?:matching\s+)?tape\b[^\n]*$/im.test(customerText);
  const compoundWithoutType = /\b(?:1\s+)?bucket\b[^\n]{0,40}\bcompound\b/i.test(customerText) && !/\b(?:all[- ]purpose|taping|finishing|lightweight|setting)\b[^\n]{0,40}\bcompound\b|\bcompound\b[^\n]{0,40}\b(?:all[- ]purpose|taping|finishing|lightweight|setting)\b/i.test(customerText);
  const primerWithoutType = /\b(?:1\s+)?bucket\b[^\n]{0,40}\bprimer\b/i.test(customerText) && !/\b(?:drywall|interior|exterior|oil|latex|water[- ]based|shellac)\b[^\n]{0,30}\bprimer\b|\bprimer\b[^\n]{0,30}\b(?:drywall|interior|exterior|oil|latex|water[- ]based|shellac)\b/i.test(customerText);

  return items.map((item) => {
    const normalized = { ...item };
    if (bareWood2x4 && /\b2\s*x\s*4\s*x\s*8\b/i.test(normalized.name) && !/\b(?:wood|metal)\b/i.test(normalized.name)) {
      normalized.name = `Wood ${normalized.name}`;
    }
    if (oneThousandScrews && /\bscrews?\b/i.test(normalized.name)) {
      normalized.quantity = 1000;
      normalized.unit = "pieces";
      if (!/\b1,?000[- ]count\b/i.test(normalized.name)) normalized.name = `${normalized.name} (one 1,000-count box)`;
    }
    if (tapeWithoutQuantity && /\btape\b/i.test(normalized.name)) {
      normalized.quantity = 1;
      normalized.unit = "roll";
    }
    if (compoundWithoutType && /\bcompound\b/i.test(normalized.name) && !/\ball[- ]purpose\b/i.test(normalized.name)) {
      normalized.name = `All-purpose ${normalized.name}`;
      normalized.quantity = 1;
      normalized.unit = "bucket";
    }
    if (primerWithoutType && /\bprimer\b/i.test(normalized.name) && !/\bdrywall\b/i.test(normalized.name)) {
      normalized.name = `Drywall ${normalized.name}`;
      normalized.quantity = 1;
      normalized.unit = "bucket";
    }
    return normalized;
  });
}

export function smsQuantityClarificationReply(message: string) {
  if (/[\u0590-\u05ff]/.test(message)) return "בטח—איזו כמות אתה צריך?";
  if (/[áéíóúñ¿¡]/i.test(message)) return "Claro—¿qué cantidad necesita?";
  if (/\bthinset\b/i.test(message)) return "Sure — how much thinset do you need?";
  if (/\b(?:sheetrock|drywall)\b/i.test(message)) return "How many sheets do you need? Is 5/8 in. okay?";
  return "Sure — how much do you need?";
}

function damerauLevenshteinDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, column) =>
      row === 0 ? column : column === 0 ? row : 0
    )
  );
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        rows[row][column] = Math.min(rows[row][column], rows[row - 2][column - 2] + 1);
      }
    }
  }
  return rows[left.length][right.length];
}

function looksLikeSheetrock(value: string) {
  return value
    .toLowerCase()
    .match(/[a-z]+/g)
    ?.some((token) => token.length >= 7 && token.length <= 10 && damerauLevenshteinDistance(token, "sheetrock") <= 2) ?? false;
}

export function smsProductInquiryFallbackReply(message: string, _options: { allowRelatedSuggestion?: boolean } = {}) {
  void _options;
  const value = message
    .trim()
    .replace(/^new\s+(?:request|order|job|project|material\s+list)\s*:\s*/i, "")
    .trim();
  const standardMatch = value.match(/^(?:do\s+)?(?:you(?:\s+guys)?|u)\s+(?:sell|carry|have|source)\s+(.+?)[?.!]*$/i);
  const sheetrockGetMatch = value.match(/^(?:can|could)\s+(?:i|we)\s+(?:get|buy|order|source)\s+(.+?)[?.!]*$/i);
  const needMatch = value.match(/^(?:i|we)\s+(?:need|want|am\s+looking\s+for|are\s+looking\s+for)\s+(.+?)[?.!]*$/i);
  const neededMaterial = needMatch?.[1] && /\b(?:sheetrock|drywall|thin\s*set|roof(?:ing)?\s+shingles?|shingles?|metal\s+studs?)\b/i.test(needMatch[1]) ? needMatch[1] : "";
  const rawProduct = (standardMatch?.[1] || (sheetrockGetMatch?.[1] && looksLikeSheetrock(sheetrockGetMatch[1]) ? sheetrockGetMatch[1] : "") || neededMaterial)
    .trim()
    .slice(0, 80);
  if (!rawProduct) return null;
  // A message with a concrete quantity is an order/request, not a generic
  // product-availability question. Let the material-request pipeline extract
  // and preserve the supplied quantity/specifications, then ask only for the
  // next genuinely missing field. Treating it as a product inquiry caused the
  // deterministic fallback to ask for quantity and type a second time.
  if (smsHasExplicitQuantity(value)) return null;
  const product = looksLikeSheetrock(rawProduct) || /drywall/i.test(rawProduct)
    ? "Sheetrock"
    : /thin\s*set/i.test(rawProduct)
      ? "thinset"
      : /\b(?:roof(?:ing)?\s+shingles?|shingles?)\b/i.test(rawProduct)
        ? "roofing shingles"
        : /\bmetal\s+studs?\b/i.test(rawProduct)
          ? "metal studs"
      : rawProduct;
  if (product === "roofing shingles") return "Sure—we can help source roofing shingles.\n\nWhat shingle type and color? How many square feet do you need?";
  if (product === "thinset") return "Sure—we can help source thinset.\n\nWhat type do you need? How many bags do you need?";
  if (product === "metal studs") return "Sure—we can help source metal studs.\n\nWhat size and length? What gauge? How many do you need?";
  const specification = product === "Sheetrock"
    ? "Can you confirm 5/8 in.?\n\nRegular, Type X/fire-rated, or moisture-resistant?"
    : "What type do you need?";
  const quantity = product === "Sheetrock"
    ? "How many sheets do you need?"
    : `How much ${product} do you need?`;
  const primary = product === "Sheetrock"
    ? `Yes. ${specification} ${quantity}`
    : `Yes—we can help with ${product}. ${specification} ${quantity}`;
  return primary;
}

export function smsSheetrockSpecificationFollowUpReply(latestMessage: string, conversationText: string) {
  if (!looksLikeSheetrock(conversationText) && !/drywall/i.test(conversationText)) return null;
  const asksThickness = /\b(?:what|which)\s+(?:thinn?est|thickness(?:es)?)\b|\b(?:thinn?est|thickness(?:es)?)\s+(?:do|can)\s+you\b/i.test(latestMessage);
  const correctsQuantity = /\b(?:i\s+asked|asking)\b.{0,60}\b(?:what|which)\b.{0,30}\b(?:have|carry|thinn?est|thickness)\b.{0,50}\bnot\b.{0,20}\b(?:how\s+many|quantity)\b/i.test(latestMessage);
  if (!asksThickness && !correctsQuantity) return null;
  return "5/8 in. is the standard Sheetrock option. Can you confirm 5/8 in.? Regular, Type X/fire-rated, or moisture-resistant?";
}

export function smsShortMaterialAnswerReply(latestMessage: string, conversationText: string) {
  if (!/\bmetal\s+studs?\b/i.test(conversationText)) return null;
  const match = latestMessage.trim().match(/^(\d+(?:\s*[-x×/]\s*\d+){1,2})\s*(?:,|x|×|-)?\s*(\d{1,6})(?:\s*(?:pcs?|pieces?|ea|each))?[.!]?$/i);
  if (!match) return null;
  const size = match[1].replace(/\s+/g, "").replace("×", "x");
  const quantity = Number(match[2]);
  if (!Number.isFinite(quantity) || quantity < 1) return null;
  const hasLength = (size.match(/x/g) || []).length >= 2;
  return `Got it—${quantity} ${size} metal studs. ${hasLength ? "What gauge?" : "What length? What gauge?"}`;
}

export function smsContextualQuantityAnswerReply(latestMessage: string, conversationText: string) {
  const lines = conversationText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const latestAvantia = [...lines].reverse().find((line) => /^Avantia:/i.test(line)) || "";
  if (!/\b(?:how\s+many|how\s+much|quantity|square\s+feet|sq\.?\s*ft)\b/i.test(latestAvantia)) return null;
  const customerHistory = lines
    .filter((line) => /^Customer:/i.test(line))
    .map((line) => line.replace(/^Customer:\s*/i, ""))
    .filter((line) => line.trim().toLowerCase() !== latestMessage.trim().toLowerCase());
  const familyPatterns = [
    ["roofing", /\b(?:roof(?:ing)?\s+shingles?|shingles?)\b/i],
    ["thinset", /\bthin\s*set\b/i],
    ["sheetrock", /\b(?:sheetrock|drywall(?!\s+screws?))\b/i],
    ["metal_studs", /\bmetal\s+studs?\b/i],
    ["wood_studs", /\b(?:wood(?:en)?\s+studs?|lumber\s+studs?)\b/i],
    ["screws", /\b(?:drywall\s+)?screws?\b/i],
    ["compound", /\b(?:joint\s+)?compound\b/i],
    ["paint", /\bpaint\b/i],
    ["corner_bead", /\bcorner\s+(?:bead|bit)\b/i],
  ] as const;
  const questionFamilies = familyPatterns.filter(([, pattern]) => pattern.test(latestAvantia)).map(([family]) => family);
  const latestProductContext = [...customerHistory].reverse().find((line) => familyPatterns.some(([, pattern]) => pattern.test(line))) || "";
  const contextFamilies = familyPatterns.filter(([, pattern]) => pattern.test(latestProductContext)).map(([family]) => family);
  const family = questionFamilies.length === 1 && customerHistory.some((line) => familyPatterns.find(([candidate]) => candidate === questionFamilies[0])?.[1].test(line))
    ? questionFamilies[0]
    : questionFamilies.length === 0 && contextFamilies.length === 1
      ? contextFamilies[0]
      : null;
  if (!family) return null;
  const value = latestMessage.trim().replace(/[.!]+$/, "");
  const measured = value.match(/^(\d{1,3}(?:,\d{3})+|\d{1,6}(?:\.\d+)?)\s*(sq\.?\s*ft|sf|square\s+feet|sheets?|bags?|boxes?|buckets?|gallons?|pcs?|pieces?|peices?|each|ea)?$/i);
  if (!measured) return null;
  const amount = Number(measured[1].replaceAll(",", ""));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return null;
  const suppliedUnit = (measured[2] || "").toLowerCase().replace(/\s+/g, " ").replace(/^peices?$/, "pieces");
  if (family === "roofing") {
    const unit = suppliedUnit || (/square\s+feet|sq\.?\s*ft/i.test(latestAvantia) ? "sq ft" : "");
    if (!/^(?:sq\.?\s*ft|sf|square feet)$/.test(unit)) return null;
    return `Got it—${amount} sq ft of roofing shingles. What shingle type and color?`;
  }
  if (family === "thinset") {
    const unit = suppliedUnit || (/bags?/i.test(latestAvantia) ? "bags" : "");
    if (!/^bags?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "bag" : "bags"} of thinset. Which thinset do you need?`;
  }
  if (family === "sheetrock") {
    const unit = suppliedUnit || (/sheets?/i.test(latestAvantia) ? "sheets" : "");
    if (!/^sheets?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "sheet" : "sheets"} of Sheetrock. Can you confirm 5/8 in.?`;
  }
  if (family === "metal_studs") {
    const unit = suppliedUnit || "pcs";
    if (!/^(?:pcs?|pieces?|each|ea)$/.test(unit)) return null;
    return `Got it—${amount} metal studs. What size and length? What gauge?`;
  }
  if (family === "wood_studs") {
    const unit = suppliedUnit || "pcs";
    if (!/^(?:pcs?|pieces?|each|ea)$/.test(unit)) return null;
    return `Got it—${amount} wood studs. What size and length?`;
  }
  if (family === "screws") {
    const unit = suppliedUnit || (/boxes?/i.test(latestAvantia) ? "boxes" : "");
    if (!/^(?:boxes?|pcs?|pieces?|each|ea)$/.test(unit)) return null;
    const label = /^boxes?$/.test(unit) ? (amount === 1 ? "box" : "boxes") : (amount === 1 ? "screw" : "screws");
    return `Got it—${amount} ${label}. What screw length? What thread type?`;
  }
  if (family === "compound") {
    const unit = suppliedUnit || (/buckets?/i.test(latestAvantia) ? "buckets" : "");
    if (!/^buckets?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "bucket" : "buckets"} of joint compound. Can you confirm the compound type: 5-gallon all-purpose?`;
  }
  if (family === "paint") {
    const unit = suppliedUnit || (/gallons?/i.test(latestAvantia) ? "gallons" : "");
    if (!/^gallons?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "gallon" : "gallons"} of paint. What color, and which finish: flat, eggshell, satin, or semi-gloss?`;
  }
  if (family === "corner_bead") {
    const unit = suppliedUnit || "pcs";
    if (!/^(?:pcs?|pieces?|each|ea)$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "piece" : "pieces"} of corner bead. What corner bead type? What length?`;
  }
  return null;
}

export function smsReplyParts(params: { reply: string; deterministicProductInquiry: boolean; exactListOnly?: boolean }) {
  const reply = params.reply.trim();
  if (!reply) return [];
  if (!params.deterministicProductInquiry) return [reply];
  return [...new Set(reply.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean))].slice(0, 2);
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
  const asksSpecification = /\b(?:thickness|walls?\s+or\s+(?:a\s+)?ceilings?|type|size|length|gauge|grade|color)\b|\b5\s*\/\s*8\b|(?:עובי|קיר|תקרה|סוג|מידה|אורך|צבע)|\b(?:grosor|pared|techo|tipo|tama[nñ]o|largo|calibre|color)\b/i.test(question);
  if (language === "he") {
    if (asksAddress && asksTiming) return "עדיין צריך עזרה עם פרטי המשלוח?";
    if (asksSpecification && asksQuantity) return "עדיין צריך עזרה בבחירת המפרט או הכמות?";
    if (asksQuantity) return "עדיין צריך עזרה עם הכמות?";
    if (asksAddress) return "עדיין צריך עזרה עם כתובת המשלוח?";
    if (asksTiming) return "עדיין צריך עזרה עם מועד האספקה?";
    return "עדיין צריך עזרה עם הבקשה?";
  }
  if (language === "es") {
    if (asksAddress && asksTiming) return "¿Aún necesita ayuda con los detalles de entrega?";
    if (asksSpecification && asksQuantity) return "¿Aún necesita ayuda con la especificación o la cantidad?";
    if (asksQuantity) return "¿Aún necesita ayuda con la cantidad?";
    if (asksAddress) return "¿Aún necesita ayuda con la dirección de entrega?";
    if (asksTiming) return "¿Aún necesita ayuda con la fecha necesaria?";
    return "¿Aún necesita ayuda con esto?";
  }
  if (asksAddress && asksTiming) return "Still need help with the delivery details?";
  const productFamilies = (value: string, allowGenericStuds = false) => [
    /\b(?:roofing|shingles?)\b/i.test(value) ? "roofing" : null,
    /\bmetal\s+studs?\b/i.test(value) ? "metal_studs" : null,
    /\b(?:sheetrock|drywall)\b/i.test(value) ? "sheetrock" : null,
    /\bwood(?:en)?\s+studs?\b/i.test(value) ? "wood_studs" : null,
    allowGenericStuds && /\bstuds?\b/i.test(value) && !/\b(?:metal|wood(?:en)?)\s+studs?\b/i.test(value) ? "studs" : null,
  ].filter(Boolean) as string[];
  const questionFamilies = productFamilies(params.questionReply, true);
  const originalFamilies = productFamilies(params.originalMessage);
  const originalStudFamilies = originalFamilies.filter((family) => family === "metal_studs" || family === "wood_studs");
  const sheetrockSpecificationQuestion = /\b5\s*\/\s*8\b/i.test(params.questionReply) && originalFamilies.includes("sheetrock");
  const questionFamily = sheetrockSpecificationQuestion ? "sheetrock" : questionFamilies.length === 1 ? questionFamilies[0] : null;
  const productFamily = questionFamily === "studs" && originalStudFamilies.length === 1
    ? originalStudFamilies[0]
    : questionFamily && questionFamily !== "studs"
      ? questionFamily
      : questionFamilies.length === 0 && originalFamilies.length === 1
        ? originalFamilies[0]
        : null;
  if (asksSpecification && asksQuantity) {
    if (productFamily === "roofing") return "Still need help with the shingle type, color, or quantity?";
    if (productFamily === "metal_studs") return "Still need help with the stud size, length, gauge, or quantity?";
    if (productFamily === "sheetrock") return "Can you confirm 5/8 in., type, and quantity?";
    if (productFamily === "wood_studs") return "Still need help with the stud size or quantity?";
    return "Still need help with the product details or quantity?";
  }
  if (asksSpecification) {
    if (productFamily === "roofing") return "Still need help with the shingle type or color?";
    if (productFamily === "metal_studs" && /\bsize\b/i.test(question) && /\blength\b/i.test(question) && /\bgauge\b/i.test(question)) return "Still need help with the stud size, length, or gauge?";
    if (productFamily === "metal_studs") return "Still need help with the stud length or gauge?";
    if (productFamily === "sheetrock") return "Can you confirm 5/8 in.?";
    if (productFamily === "wood_studs" && /\blength\b/i.test(question)) return "Still need help with the stud size or length?";
    if (productFamily === "wood_studs") return "Still need help with the stud size?";
    return "Still need help with the product details?";
  }
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
  if (isSmsOptOutMessage(params.originalMessage)) return false;
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
  // The semantic model may identify an essential unresolved product choice
  // (for example paint finish or stud gauge). Resolve that before delivery
  // logistics instead of replacing the useful question with an address prompt.
  const proposedFields = inspectSmsQuestionStructure(params.proposedReply).fields;
  if (proposedFields.some((field) => ["size", "thickness", "brand", "color", "finish", "specification"].includes(field))) return "proposed";
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

const SMS_SUMMARY_UNIT_PLURALS: Record<string, string> = {
  bag: "bags",
  box: "boxes",
  bucket: "buckets",
  can: "cans",
  carton: "cartons",
  case: "cases",
  pack: "packs",
  piece: "pieces",
  roll: "rolls",
  sheet: "sheets",
};

/** Keeps confirmation summaries natural without changing the stored request item. */
export function formatSmsRequestSummaryItem(item: { name: string; quantity: number; unit: string }) {
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  const rawUnit = item.unit.trim() || "each";
  const singularUnit = rawUnit.toLowerCase().replace(/s$/i, "");
  const displayUnit = quantity === 1 ? rawUnit : SMS_SUMMARY_UNIT_PLURALS[singularUnit] || rawUnit;
  const escapedUnit = singularUnit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const packagedName = item.name.trim().match(new RegExp(`^(.+?),\\s*((?:one|two|three|four|five|\\d+(?:\\.\\d+)?)[-\\s](?:gallon|gal|quart|qt|liter|litre|ounce|oz|pound|lb))\\s+${escapedUnit}s?$`, "i"));
  if (packagedName) return `• ${quantity} ${packagedName[2]} ${displayUnit} — ${packagedName[1].trim()}`;
  return `• ${quantity} ${displayUnit} — ${item.name.trim()}`;
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
