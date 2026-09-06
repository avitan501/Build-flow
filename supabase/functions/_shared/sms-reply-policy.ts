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

const SMS_OPT_OUT_PATTERN =
  /^\s*(?:stop|unsubscribe|end|quit|baja|parar|cancelar|הסר|הפסק)\s*[.!?¿¡。！？]?\s*$/iu;

export function isSmsOptOutMessage(value: string) {
  return SMS_OPT_OUT_PATTERN.test(value);
}

const MATERIAL_TERMS =
  /\b(?:aggregates?|appliances?|baseboards?|batts?|blocks?|breakers?|cabinets?|cables?|cement|cladding|compound|concrete|containers?|doors?|drywal+l?|dumpsters?|ducts?|electrical|fittings?|flooring|grout|hardwood|hvac|insulation|lumber|lvl|materials?|mesh|moldings?|mortar|paint|panels?|pipes?|plumbing|plywood|primer|rebar|registers?|rolls?|roofing|sheetrock|sheets?|shingles?|siding|screws?|studs?|thinset|tiles?|tracks?|trim|valves?|vinyl|windows?|wires?|bags?|boards?|boxes?|buckets?)\b|(?:חומר(?:ים)?|לוחות?|שקים?|ארגזים?|ברגים|בידוד|גבס|רעפים|חלונות|דלתות|צבע|ריצוף|ארונות|צנרת|חשמל|מפסקים?|מפסקי(?:ם)?)|\b(?:aislamiento|azulejos?|baldosas?|bolsas?|cables?|cajas?|cemento|concreto|contenedores?|gabinetes?|interruptores?|material(?:es)?|paneles?|placas?|pintura|plomer[ií]a|puertas?|techo|tornillos?|tuber[ií]a|ventanas?|yeso|mortero)\b/i;

export function smsReplyLanguage(value: string) {
  if (/[\u0590-\u05ff]/.test(value)) return "he";
  if (
    /[áéíóúñ¿¡]/i.test(value) ||
    /\b(?:hola|gracias|necesito|quiero|precio|entrega|cotizaci[oó]n|direcci[oó]n|paneles?|piezas?|hojas?|cajas?|bolsas?|pulgadas?|correcto|confirmo|por favor)\b/i.test(
      value,
    )
  )
    return "es";
  return "en";
}

const SMS_MATERIAL_SPELLING_WORDS = [
  "address", "available", "availability", "cabinet", "cabinets", "cement", "compound", "concrete", "delivery", "drywall", "electrical", "flooring", "insulation", "lumber", "material", "materials", "moisture", "paint", "plumbing", "plywood", "primer", "quantity", "regular", "resistant", "screws", "sheetrock", "shingles", "tomorrow", "windows",
  "aislamiento", "cantidad", "cemento", "concreto", "direccion", "disponible", "electrico", "entrega", "gabinetes", "humedad", "madera", "materiales", "necesito", "paneles", "pintura", "plomeria", "precio", "puertas", "resistente", "tornillos", "ventanas", "yeso",
] as const;

const SMS_MATERIAL_SPELLING_ALIASES: Record<string, string> = {
  adress: "address", adres: "address", avalable: "available", availble: "available",
  delivary: "delivery", delivry: "delivery", drywal: "drywall", drywll: "drywall",
  plywod: "plywood", quntity: "quantity", quantaty: "quantity", sheetrok: "sheetrock",
  tomorow: "tomorrow", tommorow: "tomorrow",
  direcsion: "dirección", dirrecion: "dirección", direccion: "dirección",
  disponivle: "disponible", entreja: "entrega", maniana: "mañana", manana: "mañana",
  nececito: "necesito", nesecito: "necesito", nesesito: "necesito", plomeria: "plomería",
  presio: "precio", tornilos: "tornillos", umedad: "humedad",
  yesso: "yeso", yesoo: "yeso", draywall: "drywall", sheetrokc: "sheetrock",
  peices: "pieces", peice: "piece",
};

const SMS_SPOKEN_DIMENSION_NUMBERS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", twelve: "12",
  sixteen: "16", uno: "1", una: "1", dos: "2", tres: "3", cuatro: "4",
  cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9", diez: "10",
  doce: "12", dieciseis: "16", dieciséis: "16",
};

const SMS_SPOKEN_QUANTITY_NUMBERS: Record<string, string> = {
  ...SMS_SPOKEN_DIMENSION_NUMBERS,
  eleven: "11", thirteen: "13", fourteen: "14", fifteen: "15", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70",
  eighty: "80", ninety: "90", hundred: "100", once: "11", trece: "13",
  catorce: "14", quince: "15", veinte: "20", treinta: "30", cuarenta: "40",
  cincuenta: "50", sesenta: "60", setenta: "70", ochenta: "80", noventa: "90",
  cien: "100",
};

function normalizeSmsSpokenQuantityCounts(value: string) {
  const words = Object.keys(SMS_SPOKEN_QUANTITY_NUMBERS).join("|");
  return value.replace(
    new RegExp(`\\b(${words})\\s+(?=(?:pcs?|pieces?|peace|pees|sheets?|hojas?|panels?|paneles?|boxes?|cajas?|bags?|bolsas?|buckets?|cubetas?|rolls?|rollos?|gallons?|galones?|units?|unidades?|drywall|sheetrock|yeso|lumber|studs?)\\b)`, "gi"),
    (_match, count: string) =>
      `${SMS_SPOKEN_QUANTITY_NUMBERS[count.toLocaleLowerCase("en-US")] || count} `,
  );
}

function normalizeSmsSpokenDimensions(value: string) {
  const number =
    "(?:\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|twelve|sixteen|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|dieciseis|dieciséis)";
  const canonicalNumber = (part: string) =>
    SMS_SPOKEN_DIMENSION_NUMBERS[part.toLocaleLowerCase("en-US")] || part;
  return value
    .replace(/\b(?:five\s+eighths?|cinco\s+octavos?)\b/gi, "5/8")
    .replace(/\b(?:one\s+half|un(?:a)?\s+mitad|medio)\b/gi, "1/2")
    .replace(/\b(?:three\s+quarters?|tres\s+cuartos?)\b/gi, "3/4")
    .replace(
      new RegExp(`\\b(${number})\\s*(?:by|por|x|×)\\s*(${number})\\s*(?:by|por|x|×)\\s*(${number})\\b`, "gi"),
      (_match, first: string, second: string, third: string) =>
        `${canonicalNumber(first)}x${canonicalNumber(second)}x${canonicalNumber(third)}`,
    )
    .replace(
      new RegExp(`\\b(${number})\\s*(?:by|por|x|×)\\s*(${number})\\b`, "gi"),
      (_match, first: string, second: string) =>
        `${canonicalNumber(first)}x${canonicalNumber(second)}`,
    );
}

function smsSpellingDistance(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 2) return 3;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const held = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = held;
    }
  }
  return row[right.length];
}

function normalizeSmsConstructionWord(word: string) {
  const lowered = word.toLocaleLowerCase("en-US");
  if (SMS_MATERIAL_SPELLING_ALIASES[lowered]) return SMS_MATERIAL_SPELLING_ALIASES[lowered];
  if (lowered.length < 5 || /\d/.test(lowered) || SMS_MATERIAL_SPELLING_WORDS.includes(lowered as typeof SMS_MATERIAL_SPELLING_WORDS[number])) return word;
  const maximumDistance = lowered.length >= 8 ? 2 : 1;
  const matches = SMS_MATERIAL_SPELLING_WORDS
    .map((candidate) => ({ candidate, distance: smsSpellingDistance(lowered, candidate) }))
    .filter((entry) => entry.distance <= maximumDistance)
    .sort((left, right) => left.distance - right.distance);
  if (!matches.length || (matches[1] && matches[1].distance === matches[0].distance)) return word;
  return matches[0].candidate;
}

export function normalizeSmsMaterialAnswerTypos(value: string) {
  return normalizeSmsSpokenQuantityCounts(normalizeSmsSpokenDimensions(value))
    .replace(/\b(?:sheet\s+rock|sheet\s+rack)\b/gi, "sheetrock")
    .replace(/\b(?:dry\s+wall|try\s+wall)\b/gi, "drywall")
    .replace(/\b(?:home\s+line)\b/gi, "Homeline")
    .replace(/\b(?:queue|cue)\s+oh\b|\bq\s+o\b/gi, "QO")
    .replace(/\b(?:sherman|shermon)\s+williams?\b/gi, "Sherwin Williams")
    .replace(/\b(\d+(?:\.\d+)?)\s+(?:peace|pees)\b/gi, "$1 pieces")
    .replace(/\bpiezas?\b/gi, "pieces")
    .replace(/\bhojas?\b/gi, "sheets")
    .replace(/\bcajas?\b/gi, "boxes")
    .replace(/\bbolsas?\b/gi, "bags")
    .replace(/\bcubetas?\b/gi, "buckets")
    .replace(/\brollos?\b/gi, "rolls")
    .replace(/\bpulgadas?\b/gi, "in.")
    .replace(/\bpies\b/gi, "ft")
    .replace(/\b(?:relugar|regualr|reglar|reguler)\b/gi, "regular")
    .replace(/\b(?:tyep\s*x|typex)\b/gi, "Type X")
    .replace(/\bmoist(?:er|ure)\s+resist(?:ent|ant)\b/gi, "moisture-resistant")
    .replace(/\bfire\s+rat(?:ted|ed)\b/gi, "fire-rated")
    .replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g, normalizeSmsConstructionWord);
}

function canonicalMaterialText(value: string) {
  return normalizeSmsMaterialAnswerTypos(value)
    .replace(/\b(?:paneles?|placas?)\s+de\s+yeso\b|\byeso\b/gi, "drywall")
    .replace(/(?:לוחות?\s+גבס|גבס)/g, "drywall")
    .replace(/\binterruptores?\b/gi, "breakers")
    .replace(/מפסקים?|מפסקי(?:ם)?/g, "breakers");
}

export function looksLikeSmsMaterialRequest(value: string) {
  const meaningfulLines = value
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
  const quantifiedMaterial =
    /\b\d+(?:\.\d+)?\s*(?:x\s*)?(?:ea|each|pcs?|pieces?|boxes?|sheets?|ft|feet|rolls?|bags?|buckets?|units?)?\s*[a-z]/i.test(
      value,
    ) && MATERIAL_TERMS.test(value);
  const structuredList =
    meaningfulLines.length >= 3 &&
    meaningfulLines.filter(
      (line) => /\d/.test(line) || MATERIAL_TERMS.test(line),
    ).length >= 3;
  return (
    quantifiedMaterial ||
    structuredList ||
    (/\b(?:need|order|send)\b.{0,80}/i.test(value) &&
      MATERIAL_TERMS.test(value)) ||
    (/(?:צריך|צריכ(?:ה|ים)|להזמין).{0,80}/i.test(value) &&
      MATERIAL_TERMS.test(value)) ||
    (/\b(?:necesito|ordenar|mandar)\b.{0,80}/i.test(value) &&
      MATERIAL_TERMS.test(value))
  );
}

export function smsReferencesPriorAttachment(value: string) {
  return /\b(?:what(?:'s| is)\s+(?:this|that)|what\s+product\s+is\s+(?:this|that)|can\s+you\s+(?:identify|confirm)(?:\s+(?:this|that|it))?|do\s+you\s+know\s+what\s+(?:this|that|it)\s+is|is\s+(?:this|that)\s+(?:the\s+)?(?:right|correct)\s+(?:item|product)?)\b|(?:מה\s+זה|מהו\s+המוצר|אתה\s+יכול\s+(?:לזהות|לאשר)|אפשר\s+(?:לזהות|לאשר)|זה\s+המוצר\s+הנכון)|\b(?:qu[eé]\s+es\s+(?:esto|eso)|puede\s+(?:identificar|confirmar)(?:lo)?|cu[aá]l\s+es\s+este\s+producto)\b/i.test(
    value,
  );
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
  const deliveryMention =
    /\b(?:delivery|deliver|jobsite|address)\b|(?:משלוח|אספקה|כתובת)|\b(?:entrega|direcci[oó]n)\b/i.test(
      message,
    );
  const strongMaterialIdentity =
    /\b(?:breakers?|circuit\s+breakers?|sheetrock|drywall|thinset|lumber|plywood|osb|studs?|screws?|compound|mortar|concrete|rebar|wire|pipe|tile|shingles?)\b|(?:גבס|מפסקים?|ברגים|בטון|רעפים)|\b(?:yeso|interruptores?|mortero|concreto|tornillos?)\b/i.test(
      message,
    );
  if (params.event === "correction") return "correction";
  if (params.event === "cancellation") return "cancellation";
  if (params.participantRole === "supplier") return "supplier";
  if (params.forbiddenTopic) return "sensitive";
  if (
    params.hasImage ||
    /\b(?:photo|image|plan|attachment|drawing)\b|(?:תמונה|תכנית|קובץ)|\b(?:foto|imagen|plano|archivo)\b/i.test(
      message,
    )
  )
    return "image_or_plan";

  // A status question stays a follow-up even when it mentions a quote, price, order, or delivery.
  if (
    /\b(?:status|update|following up|follow up|any news|where is|what(?:'s| is) happening)\b|(?:סטטוס|עדכון|מה\s*קורה)|\b(?:estado|actualizaci[oó]n|alguna novedad|qu[eé] pasa)\b/i.test(
      message,
    )
  )
    return "follow_up";
  if (
    /\b(?:price|pric|pricing|cost|quote|quot|how much)\b|(?:מחיר|הצעת\s*מחיר)|\b(?:precio|cotizaci[oó]n|cu[aá]nto cuesta)\b/i.test(
      message,
    )
  )
    return "pricing";
  if (
    /\b(?:in stock|available|availability|inventory|do you (?:sell|carry|have|source)|you guys (?:sell|carry|have|source))\b|(?:במלאי|זמין|זמינות)|\b(?:en stock|disponible|disponibilidad|inventario)\b/i.test(
      message,
    )
  )
    return "availability";
  // A material list can include its delivery address. The address is a field
  // on the request, not evidence that the whole turn is merely a delivery
  // question. Prefer the explicit request so its items are preserved.
  if (
    (params.isMaterialRequest || looksLikeSmsMaterialRequest(message)) &&
    (!deliveryMention ||
      strongMaterialIdentity ||
      smsHasFullDeliveryAddress(message) ||
      /[;\n]/.test(message))
  )
    return "material_request";
  if (deliveryMention) return "delivery";
  if (params.isMaterialRequest || looksLikeSmsMaterialRequest(message))
    return "material_request";
  if (
    /^\s*(?:hi|hello|hey|hola|שלום|היי|good (?:morning|afternoon|evening))[!.?\s]*$/i.test(
      message,
    )
  )
    return "greeting";
  return "general";
}

export function smsRequiresExactList(value: string) {
  return (
    /\b(?:only (?:what|the items?|the list)|exact(?:ly)? (?:what|the items?|the list)|exact list only|no (?:extras?|accessories|suggestions)|nothing else)\b/i.test(
      value,
    ) ||
    /\b(?:solo (?:lo que|la lista|los art[ií]culos)|exactamente (?:lo que|la lista)|sin (?:extras|accesorios|sugerencias)|nada m[aá]s)\b/i.test(
      value,
    ) ||
    /(?:רק\s*(?:מה\s*שכתבתי|את\s*הרשימה|מה\s*שביקשתי)|בדיוק\s*(?:מה\s*שכתבתי|הרשימה)|רשימה\s*מדויקת\s*בלבד|בלי\s*(?:תוספות|אביזרים|הצעות)|שום\s*דבר\s*נוסף)/i.test(
      value,
    )
  );
}

export function smsHasFullDeliveryAddress(value: string) {
  return (
    /\b\d{1,6}\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,5}\s+(?:st(?:reet)?|ave(?:nue)?|rd|road|blvd|boulevard|dr(?:ive)?|ln|lane|ct|court|way|pkwy|parkway)\b[^\n]{0,100}\b[a-z.'-]+(?:\s+[a-z.'-]+){0,4},?\s+[a-z]{2}\s+\d{5}(?:-\d{4})?\b/i.test(
      value,
    ) ||
    /\b(?:calle|avenida|camino|ruta)\s+[\p{L}0-9.'-]+(?:\s+[\p{L}0-9.'-]+){0,5}\s+\d{1,6}\b[^\n]{0,100}\b[\p{L}.'-]+(?:\s+[\p{L}.'-]+){0,4},?\s+[a-z]{2}\s+\d{5}(?:-\d{4})?\b/iu.test(
      value,
    ) ||
    /(?:רחוב\s+[\p{L}"׳״'-]+(?:\s+[\p{L}"׳״'-]+){0,4}\s+\d{1,5})[^\n]{0,100}\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/u.test(
      value,
    )
  );
}

export function smsReplySuggestsOptionalItems(value: string) {
  return (
    /\b(?:also (?:consider|add|include)|do you also need|would you like (?:to add|any)|related items?|accessories|optional items?|you may (?:also )?need|you(?:'ll| will| might| probably)? also need|we (?:recommend|suggest) (?:adding|including)|don['’]?t forget)\b/i.test(
      value,
    ) ||
    /\b(?:is|are) (?:also )?(?:useful|recommended)\b/i.test(value) ||
    /\b(?:tambi[eé]n (?:considere|agregue|incluya)|accesorios|art[ií]culos opcionales)\b/i.test(
      value,
    ) ||
    /(?:כדאי\s*גם|להוסיף\s*גם|אביזרים|פריטים\s*נוספים|תוספות\s*אופציונליות)/i.test(
      value,
    )
  );
}

export function enforceSmsQuestionLimit(value: string) {
  const trimmed = value.trim().slice(0, 1600);
  if (!trimmed) return trimmed;
  // The production intake is intentionally one-blocker-at-a-time. Keep any
  // short acknowledgement that precedes the first question, but never let a
  // model or deterministic fallback send a second question in the same SMS.
  return trimmed.match(/^[\s\S]*?[?？]/)?.[0]?.trim() || trimmed;
}

export type SmsRequestedField =
  | "size"
  | "thickness"
  | "quantity"
  | "address"
  | "needed_by"
  | "brand"
  | "color"
  | "finish"
  | "specification"
  | "source";

const REQUESTED_FIELD_PATTERNS: Array<{
  field: SmsRequestedField;
  pattern: RegExp;
}> = [
  {
    field: "size",
    pattern:
      /\b(?:size|length|dimensions?|medida|tama[nñ]o)\b|(?:גודל|אורך|מידות?)/i,
  },
  {
    field: "thickness",
    pattern: /\b(?:thickness|gauge|espesor)\b|\b\d+\s*\/\s*\d+\b|(?:עובי)/i,
  },
  {
    field: "quantity",
    pattern:
      /\b(?:quantity|how many|how much|cantidad|cu[aá]nt[oa]s?)\b|(?:כמה|כמות|יחידות?)/i,
  },
  {
    field: "address",
    pattern:
      /\b(?:full )?(?:delivery )?address\b|\b(?:direcci[oó]n (?:completa )?(?:de entrega)?)\b|(?:כתובת (?:המשלוח )?המלאה)/i,
  },
  {
    field: "needed_by",
    pattern:
      /\b(?:needed-by date|needed by|when do you need|delivery date|time window|what date|fecha de entrega|para qu[eé] fecha|para cu[aá]ndo|ventana de tiempo)\b|(?:תאריך משלוח|חלון זמן|לאיזה תאריך|מתי)/i,
  },
  {
    field: "brand",
    pattern: /\b(?:brand|manufacturer|marca|fabricante)\b|(?:מותג|יצרן)/i,
  },
  { field: "color", pattern: /\b(?:color|colour)\b|\bcolor\b|(?:צבע)/i },
  { field: "finish", pattern: /\b(?:finish|sheen|acabado)\b|(?:גימור)/i },
  {
    field: "specification",
    pattern:
      /\bproduct specification\b|\b(?:substrate|installation location|product name|model number)\b|\b(?:what|which)\s+(?:[a-z/-]+\s+){0,4}?(?:model|type|style|line|series)\b|\b(?:confirm|choose|select)\b[^?？]{0,60}\b(?:model|type|style|line|series)\b|\b(?:model|type|style|line|series)\s+(?:do|does|would|should|is|are|did)\b|\b(?:regular|type\s*x|fire[- ]rated|moisture[- ]resistant|homeline|q\s*o)\b[^?？]*[?？]|\bwhich\s+(?:item|product|thinset|compound|primer|paint|adhesive|mortar|concrete|lumber|stud|drywall|sheetrock|shingle|brick|block|tile)\b|\b(?:qu[eé]|cu[aá]l)\s+(?:[a-záéíóúñ/-]+\s+){0,4}?(?:modelo|tipo|estilo|l[ií]nea|serie)\b|\b(?:sustrato|ubicaci[oó]n de instalaci[oó]n|nombre del producto|n[uú]mero de modelo|resistente al fuego|resistente a la humedad)\b|(?:איזה|איזו|מה)\s+(?:דגם|סוג|סדרה)|(?:תשתית|מיקום ההתקנה|שם המוצר|רגיל|עמיד אש|עמיד רטיבות)/i,
  },
  {
    field: "source",
    pattern:
      /\b(?:material list|photo|image|plan|drawing|product link|lista de materiales|foto|imagen|plano)\b|(?:רשימת חומרים|תמונה|תכנית|קישור למוצר)/i,
  },
];

export function inspectSmsQuestionStructure(
  value: string,
  knownFields: SmsRequestedField[] = [],
) {
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
  const fieldsByQuestion = questions.map((question) => {
    const matched = REQUESTED_FIELD_PATTERNS.filter(({ pattern }) =>
      pattern.test(question),
    ).map(({ field }) => field);
    // This asks which product a supplied number belongs to; it does not ask
    // the customer to provide the quantity again.
    if (
      /\bwhich\s+(?:item|product)\s+is\s+(?:that|this|the)\s+quantity\s+for\b/i.test(
        question,
      )
    ) {
      return matched.filter((field) => field !== "quantity");
    }
    return matched;
  });
  const fields = fieldsByQuestion.flat();
  const essentialQuestions = fieldsByQuestion.filter(
    (questionFields) => questionFields.length > 0,
  ).length;
  const subjectFor = (question: string) =>
    question
      .match(
        /\b(?:appliances?|cabinets?|cables?|concrete|doors?|drywall|dumpsters?|flooring|hvac|insulation|lumber|moldings?|paint|pipes?|plumbing|primer|roofing|sheetrock|shingles?|siding|studs?|screws?|corner\s+bead|tape|compound|thinset|tile|trim|windows?|wires?|yeso)\b|(?:גבס|מפסקים?|ברגים|לוחות?)/i,
      )?.[0]
      ?.toLowerCase()
      .replace(/\s+/g, "_") || "generic";
  const safeDeliveryPair = fieldsByQuestion.some(
    (questionFields, index) =>
      questionFields.length === 2 &&
      questionFields.includes("address") &&
      questionFields.includes("needed_by") &&
      /\b(?:and|y)\b|(?:ו)/i.test(questions[index] || ""),
  );
  const safeProductBundle = fieldsByQuestion.some(
    (questionFields, index) =>
      questionFields.length > 1 &&
      (subjectFor(questions[index] || "") !== "generic" ||
        (questionFields.length === 2 &&
          questionFields.includes("color") &&
          questionFields.includes("finish"))),
  );
  const bundled =
    fieldsByQuestion.some((questionFields) => questionFields.length > 1) &&
    !safeDeliveryPair &&
    !safeProductBundle;
  // The same kind of detail can be required for two different products in one
  // short list (for example primer type and paint finish). Treat that as two
  // distinct questions, while still blocking a repeated question about the
  // same product or a repeated generic field.
  const fieldKeys = fieldsByQuestion.flatMap((questionFields, index) =>
    questionFields.map(
      (field) => `${field}:${subjectFor(questions[index] || "")}`,
    ),
  );
  const repeated = new Set(fieldKeys).size !== fieldKeys.length;
  const asksKnownField = fields.some((field) => knownFields.includes(field));
  return {
    valid:
      questionMarks <= 1 &&
      essentialQuestions <= 1 &&
      !bundled &&
      !repeated &&
      !asksKnownField,
    questionMarks,
    requestedFields: fields.length,
    fields,
    reason:
      questionMarks > 1 || essentialQuestions > 1
        ? "more than one blocker question"
        : bundled
          ? "bundled requested fields"
          : repeated
            ? "repeated requested field"
            : asksKnownField
              ? "question repeats an already-known field"
              : null,
  };
}

function isApprovedSheetrockRelatedSuggestion(
  message: string,
  reply: string,
  exactListOnly = false,
) {
  if (
    exactListOnly ||
    (!looksLikeSheetrock(message) && !/drywall/i.test(message))
  )
    return false;
  return /do you also need joint compound, tape, corner bead, or drywall screws\?/i.test(
    reply,
  );
}

export function smsOutputSafetySignals(params: {
  message?: string;
  reply: string;
  intent: SmsReplyIntent;
  knownFields?: SmsRequestedField[];
  exactListOnly?: boolean;
}) {
  const signals: string[] = [];
  const reply = params.reply;
  const numericPrice =
    /(?:[$€£]\s*\d|\b\d[\d,.]*\s*(?:usd|dollars?|euros?|shekels?|₪|each|ea\b|\/\s*ea\b|per\s+(?:unit|piece|sheet|bag|box))|\b(?:price|cost|total|מחיר|עלות|סה[״']?כ|precio|costo|total)\s*(?:is|:|הוא|es)?\s*[$€£₪]?\s*\d)/i.test(
      reply,
    );
  const stockAssertion =
    /\b(?:is|are|it's|they're)\s+(?:currently\s+)?(?:in stock|available)|\bwe\s+have\s+(?:it|them|this|those)?\s*(?:in stock|available)|\b(?:currently\s+)?available\s+(?:now|today)|\b(?:out of stock|sold out)|\b(?:stock|availability)\s+(?:is|:)?\s*(?:confirmed|available|yes)|(?:יש\s+(?:לנו\s+)?במלאי|זמין\s+(?:כעת|עכשיו|במלאי)|אזל\s+מהמלאי|המלאי\s+אושר)|\b(?:est[aá]|hay|tenemos)\s+(?:disponible|en stock)\b/i.test(
      reply,
    );
  const unverifiedSellerAssertion =
    params.intent === "availability" &&
    (/^\s*(?:yes|yeah|yep)\b/i.test(reply) ||
      /\bwe\s+(?:have|carry|sell|stock)\b/i.test(reply));
  const deliveryOrOrderPromise =
    /\b(?:we|i|avantia)\s+(?:will|can|guarantee|promise)\s+(?:deliver|place|process|complete|confirm)\b|\b(?:order|delivery)\s+(?:is|has been)\s+(?:confirmed|placed|scheduled|guaranteed|ready|today|tomorrow)|\bdelivery\s+is\s+(?:today|tomorrow|on\s+\w+)|(?:נ(?:ספק|בצע|אשר)|המשלוח\s+(?:מאושר|נקבע|מחר|היום)|ההזמנה\s+(?:אושרה|בוצעה|מוכנה))|\b(?:vamos a|podemos|garantizamos)\s+(?:entregar|procesar|confirmar)|\b(?:pedido|entrega)\s+(?:est[aá]|ha sido)\s+(?:confirmad[oa]|programad[oa]|list[oa]|hoy|ma[nñ]ana)\b/i.test(
      reply,
    );
  const transactionalStatusAssertion =
    /\b(?:your|the)\s+(?:order|quote|delivery|request)\s+(?:is|was|has been)\s+(?:ready|approved|confirmed|shipped|dispatched|scheduled|completed|processed)|\b(?:supplier|vendor)\s+(?:confirmed|approved|replied)|(?:ההזמנה|ההצעה|המשלוח|הבקשה)\s+(?:מוכנה|אושרה|נשלחה|נקבעה|הושלמה)|\b(?:su|el|la)\s+(?:pedido|cotizaci[oó]n|entrega|solicitud)\s+(?:est[aá]|fue|ha sido)\s+(?:list[oa]|aprobad[oa]|confirmad[oa]|enviad[oa]|programad[oa]|completad[oa])/i.test(
      reply,
    );
  const unrequestedSolution =
    /\b(?:you should use|the best (?:choice|option|solution) is|i (?:recommend|suggest) (?:using|choosing)|we (?:recommend|suggest) (?:using|choosing)|the right product is)\b|\b(?:debe usar|la mejor (?:opci[oó]n|soluci[oó]n) es|recomiendo (?:usar|elegir)|recomendamos (?:usar|elegir))\b/i.test(
      reply,
    );
  const question = inspectSmsQuestionStructure(reply, params.knownFields);
  const listCompletionQuestion =
    /\bdo you need anything else(?: on this list)?\b|\banything else(?: on this list)?\b|\b(?:necesita|quieres?) (?:agregar )?algo m[aá]s\b|(?:צריך|צריכה|צריכים) להוסיף עוד משהו|(?:האם )?צריך עוד משהו/i.test(
      reply,
    );
  const requiresEssentialField = [
    "material_request",
    "image_or_plan",
    "pricing",
    "availability",
    "delivery",
  ].includes(params.intent);
  if (numericPrice) signals.push("reply contains an unapproved numeric price");
  if (stockAssertion || unverifiedSellerAssertion)
    signals.push("reply asserts stock or availability");
  if (deliveryOrOrderPromise)
    signals.push("reply makes a delivery or order promise");
  if (transactionalStatusAssertion)
    signals.push("reply asserts an unsupported transactional status");
  if (unrequestedSolution)
    signals.push("reply proposes an unrequested product solution");
  if (
    smsReplySuggestsOptionalItems(reply) &&
    !isApprovedSheetrockRelatedSuggestion(
      params.message || "",
      reply,
      params.exactListOnly,
    )
  )
    signals.push("reply asks an accessory or optional-item question");
  if (
    requiresEssentialField &&
    question.questionMarks > 0 &&
    !listCompletionQuestion &&
    question.requestedFields === 0
  )
    signals.push("question is not an essential request field");
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
  const protectedEvent =
    params.event === "correction" || params.event === "cancellation";
  const supplier =
    params.participantRole === "supplier" || params.intent === "supplier";
  if (params.protectedTopic) signals.push("protected customer topic");
  if (protectedEvent)
    signals.push(`${params.event} requires manager confirmation`);
  if (supplier) signals.push("supplier routed to manager");
  if (/\bzip(?:\s+code)?\b/i.test(params.reply))
    signals.push("reply asks for ZIP instead of full address");
  if (!params.modelAutoSafe) signals.push("model requested manager review");
  signals.push(
    ...smsOutputSafetySignals({
      message: params.message,
      reply: params.reply,
      intent: params.intent,
      knownFields: params.knownFields,
      exactListOnly: params.exactListOnly,
    }),
  );
  const hardBlock = Boolean(
    params.protectedTopic ||
    protectedEvent ||
    supplier ||
    signals.some((signal) => signal !== "model requested manager review"),
  );
  if (hardBlock)
    return {
      level: "red",
      signals,
      explanation: signals.join(" · ") || "Manager review is required.",
      gateAutoSafe: false,
    };
  if (!params.modelAutoSafe)
    return {
      level: "yellow",
      signals,
      explanation: signals.join(" · ") || "Review this draft before sending.",
      gateAutoSafe: false,
    };
  signals.push(
    `allowed ${params.intent} playbook`,
    "no protected topic or commitment",
    "one-to-three essential-question rule enforced",
  );
  return {
    level: "green",
    signals,
    explanation: signals.join(" · "),
    gateAutoSafe: true,
  };
}

export function resolveSmsExactListPreference(params: {
  storedContact?: boolean | null;
  storedDraft?: boolean | null;
  conversationText?: string;
  latestMessage?: string;
}) {
  return Boolean(
    params.storedContact ||
    params.storedDraft ||
    smsRequiresExactList(params.latestMessage || "") ||
    smsRequiresExactList(params.conversationText || ""),
  );
}

export function smsStartsNewMaterialRequest(value: string) {
  if (
    /\b(?:not|don['’]?t|do\s+not|is\s+this|is\s+that|should\s+(?:this|that|i|we))\b.{0,40}\b(?:new|separate|different)\s+(?:order|job|project|request|material list)\b/i.test(
      value,
    ) ||
    /(?:לא|אל)\s+(?:לפתוח|תפתח|ליצור|תיצור).{0,30}(?:הזמנה|עבודה|פרויקט|בקשה)\s+(?:חדשה|חדש|נפרדת|נפרד)/i.test(
      value,
    ) ||
    /\b(?:no|not?)\s+(?:abra|crear|cree).{0,30}\b(?:nuevo|nueva|separado|separada)\s+(?:pedido|trabajo|proyecto|solicitud)\b/i.test(
      value,
    )
  )
    return false;
  return /\b(?:new|separate|different)\s+(?:order|job|project|request|material list)\b|(?:הזמנה|עבודה|פרויקט|בקשה|רשימת חומרים)\s+(?:חדשה|חדש|נפרדת|נפרד|אחרת|אחר)|\b(?:nuevo|nueva|separado|separada|diferente)\s+(?:pedido|trabajo|proyecto|solicitud|lista de materiales)\b/i.test(
    value,
  );
}

export function resolveSmsDeliveryAddressKnown(params: {
  storedDraft?: boolean | null;
  conversationText?: string;
  latestMessage?: string;
  startsNewRequest?: boolean;
}) {
  const suppliedNow =
    smsHasFullDeliveryAddress(params.latestMessage || "") ||
    smsHasFullDeliveryAddress(params.conversationText || "");
  return Boolean(
    suppliedNow || (!params.startsNewRequest && params.storedDraft),
  );
}

// A bare two-part fraction such as 5/8 is a common construction specification,
// not a delivery date. Two-part numeric dates therefore require an explicit
// timing cue; a three-part date is unambiguous enough to stand alone.
const SMS_NEEDED_BY_TIMING_PATTERN =
  /\b(?:asap|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\s+(?:week|month)|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:need(?:ed)?(?:\s+it)?\s+(?:by|on|for)|by|delivery(?:\s+(?:on|for))?)\s+\d{1,2}[/-]\d{1,2})\b|(?:דחוף|בהקדם|היום|מחר|יום\s+(?:ראשון|שני|שלישי|רביעי|חמישי|שישי)|שבוע\s+הבא)|\b(?:hoy|ma[nñ]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|pr[oó]xima\s+semana)\b/i;

export function smsNeededByTimingValue(value: string) {
  const matches = [
    ...value.matchAll(new RegExp(SMS_NEEDED_BY_TIMING_PATTERN.source, "gi")),
  ];
  const match = matches.at(-1)?.[0]?.trim();
  if (!match) return null;
  return match.replace(
    /^(?:need(?:ed)?(?:\s+it)?\s+(?:by|on|for)|by|delivery(?:\s+(?:on|for))?)\s+/i,
    "",
  );
}

export function smsHasNeededByTiming(value: string) {
  return Boolean(smsNeededByTimingValue(value));
}

export function smsHasExplicitQuantity(value: string) {
  return (
    /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\s*(?:[a-z][a-z/-]*\s+){0,4}?(?:ea|each|pcs?|pieces?|boxes?|sheets?|sheetrocks?|bricks?|breakers?|ft|feet|foot|linear\s+ft|lf|sq\.?\s*ft|sf|rolls?|bags?|buckets?|bundles?|cans?|cartons?|gallons?|gals?|quarts?|qts?|liters?|litres?|ounces?|oz|pounds?|lbs?|packs?|pallets?|squares?|yards?|units?|appliances?|batts?|beams?|blocks?|cabinets?|containers?|doors?|drywall|dumpsters?|fixtures?|hvac|insulation|lumber|lvl|panels?|shingles?|studs?|thinset|tiles?|windows?)\b/i.test(
      value,
    ) ||
    /\b\d+(?:\.\d+)?\s+\d+(?:\s*[-x×/]\s*\d+){1,2}\s*(?:wood|metal)?\s*(?:studs?|lumber|boards?)\b/i.test(
      value,
    ) ||
    /(?:^|\s)(?:אחד|אחת|שניים|שתיים|שלושה|שלוש|\d+(?:\.\d+)?)\s*(?:יחידות?|ארגזים?|לוחות?|שקים?|דליים?|גלונים?|דלתות?|גבס|מפסקים?)/i.test(
      value,
    ) ||
    /\b(?:uno|una|dos|tres|cuatro|cinco|\d+(?:\.\d+)?)\s*(?:unidades?|cajas?|paneles?|placas?|bolsas?|bloques?|cubetas?|galones?|interruptores?|puertas?|yeso)\b/i.test(
      value,
    )
  );
}

export function smsAnsweredQuantityGuardReply(
  latestMessage: string,
  proposedReply: string,
) {
  if (!inspectSmsQuestionStructure(proposedReply).fields.includes("quantity"))
    return null;
  const sheetrock = latestMessage.match(
    /\b(\d{1,6})\s*(?:sheets?\s+(?:of\s+)?)?(?:sheetrocks?|drywall)\b/i,
  )?.[1];
  const bricks = latestMessage.match(/\b(\d{1,6})\s*bricks?\b/i)?.[1];
  if (sheetrock && bricks)
    return `Got it—${sheetrock} Sheetrock sheets and ${bricks} bricks. Can you confirm 5/8 in. Sheetrock?`;
  if (smsHasExplicitQuantity(latestMessage))
    return "Got it—I have the quantities. What product specifications still need to be confirmed?";
  const standalone = latestMessage.match(
    /^(?:i\s+(?:need|want)\s+)?(?:about|around|like|approximately)?\s*(\d{1,6})(?:\s*(?:pcs?|pieces?|each|ea))?[.!]?$/i,
  )?.[1];
  if (standalone)
    return `Got it—${standalone}. Which item is that quantity for?`;
  return null;
}

export function splitSmsMaterialClauses(value: string) {
  return value.split(/\r?\n|;/).flatMap((line) =>
    line
      // Preserve thousands separators such as 1,000 while accepting the
      // comma/"and" lists contractors commonly send from a phone.
      .split(/,(?!\d)|\s+(?:and|plus|y|e)\s+(?=(?:\d|[a-z]))/i)
      .map((clause) => clause.trim())
      .filter(Boolean),
  );
}

type SmsRequestItem = {
  name: string;
  quantity: number;
  unit: string;
  quantityExplicit: boolean;
};

function materialIdentityTokens(value: string) {
  const ignored = new Set([
    "a",
    "an",
    "and",
    "box",
    "each",
    "in",
    "of",
    "piece",
    "pieces",
    "the",
  ]);
  return new Set(
    value
      .toLowerCase()
      .match(/[a-z]+|\d+x\d+(?:x\d+)?/g)
      ?.filter((token) => token.length > 1 && !ignored.has(token)) || [],
  );
}

function materialIdentityScore(left: string, right: string) {
  const leftTokens = materialIdentityTokens(left);
  const rightTokens = materialIdentityTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  return overlap.length / Math.max(leftTokens.size, rightTokens.size);
}

function mergeCorrectedMaterialName(existing: string, candidate: string) {
  const correctedDimensions = candidate.match(
    /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\b/i,
  )?.[0];
  if (!correctedDimensions) return existing;
  const existingDimensions =
    /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\b/i;
  return existingDimensions.test(existing)
    ? existing.replace(existingDimensions, correctedDimensions)
    : `${existing} ${correctedDimensions}`.trim();
}

export function mergeSmsCorrectionItems(
  previous: SmsRequestItem[],
  incoming: SmsRequestItem[],
  latestMessage: string,
  event: "message" | "duplicate" | "correction" | "cancellation",
) {
  if (event !== "correction" || previous.length === 0) return incoming;
  const quantityCorrectionEvidence = latestMessage
    .replace(
      /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\b/gi,
      "SPEC",
    )
    .replace(/\b\d+\s*[- ]\s*\d+\s*\/\s*\d+\b|\b\d+\s*\/\s*\d+\b/g, "SPEC");
  const correctionNumbers = [
    ...quantityCorrectionEvidence.matchAll(
      /\b(?:make it|change (?:it|that)(?:\s+to)?|instead of|not|(?:i\s+)?(?:wrote|said))\s+(\d+(?:,\d{3})*(?:\.\d+)?)\b/gi,
    ),
  ].map((match) => match[1].replaceAll(",", ""));
  const correctedQuantity = correctionNumbers.at(-1);

  if (previous.length === 1 && correctedQuantity) {
    return [
      {
        ...previous[0],
        quantity: Number(correctedQuantity),
        quantityExplicit: true,
      },
    ];
  }
  if (!incoming.length) return previous;

  const merged = previous.map((item) => ({ ...item }));
  const minimumIdentityScore =
    previous.length === 1 && incoming.length === 1 ? 0.2 : 0.34;
  for (const candidate of incoming) {
    let bestIndex = -1;
    let bestScore = 0;
    for (const [index, existing] of merged.entries()) {
      const score = materialIdentityScore(existing.name, candidate.name);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    }
    if (bestIndex >= 0 && bestScore >= minimumIdentityScore) {
      const existing = merged[bestIndex];
      merged[bestIndex] = {
        ...existing,
        name: mergeCorrectedMaterialName(existing.name, candidate.name),
        quantity: candidate.quantityExplicit
          ? candidate.quantity
          : existing.quantity,
        unit: candidate.quantityExplicit
          ? candidate.unit || existing.unit
          : existing.unit,
        quantityExplicit:
          existing.quantityExplicit || candidate.quantityExplicit,
      };
    } else {
      merged.push({ ...candidate });
    }
  }
  return merged;
}

export function smsMaterialClarificationQuestions(
  value: string,
  options: { exactListOnly?: boolean; includeAll?: boolean } = {},
) {
  const replyLanguage = smsReplyLanguage(value);
  value = canonicalMaterialText(value);
  const localized = (english: string, spanish: string, hebrew: string) =>
    replyLanguage === "es"
      ? spanish
      : replyLanguage === "he"
        ? hebrew
        : english;
  const questions: string[] = [];
  const sheetrockEvidence = value.replace(
    /^.*\b(?:drywall|sheetrock)\s+screws?\b.*$/gim,
    (line) =>
      line.replace(
        /\b\d+\s*[- ]\s*\d+\s*\/\s*\d+\b|\b\d+\s*\/\s*\d+\b/g,
        "SCREW-SPEC",
      ),
  );
  const textAfter = (pattern: RegExp, source = value) => {
    const match = pattern.exec(source);
    return match ? source.slice((match.index || 0) + match[0].length) : "";
  };
  const customerLines = value
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^Customer:\s*/i, "")
        .replace(
          /^(?:(?:i|we)\s+(?:need|want|would\s+like)|(?:yo\s+)?(?:necesito|quiero)|(?:אני|אנחנו)?\s*(?:צריך|צריכה|צריכים|רוצה|רוצים))\s+/i,
          "",
        ),
    )
    .filter((line) => line && !/^Avantia:/i.test(line));
  const quantityClauses = splitSmsMaterialClauses(customerLines.join("\n"));
  const quantityProductPredicates: Array<(text: string) => boolean> = [
    (text) =>
      looksLikeSheetrock(text) ||
      /\bsheet\s*rock\b|\bdrywall(?!\s+screws?)/i.test(text),
    (text) =>
      /\bmetal\s+(?:studs?|framing)\b|\bstuds?\b[^\n]{0,30}\b(?:gauge|ga\.?|metal)\b/i.test(
        text,
      ),
    (text) =>
      /\bthin\s*set\b|\bthinset\b|\btile\s+(?:mortar|adhesive)\b/i.test(text),
    (text) => /\bpaint\b/i.test(text),
    (text) => /\bcorner\s+(?:bit|bead)\b/i.test(text),
    (text) =>
      /\binsulation\b|\b(?:fiberglass|mineral\s+wool|rockwool)\b/i.test(text),
    (text) => /\b(?:plywood|osb|oriented\s+strand\s+board)\b/i.test(text),
    (text) => /\bdoors?\b/i.test(text) && !/\bgarage\s+doors?\b/i.test(text),
    (text) => /\bwindows?\b/i.test(text),
    (text) =>
      /\b(?:wood\s+)?lumber\b|\b\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\b[^\n]{0,30}\b(?:wood|studs?|lumber|boards?)?\b/i.test(
        text,
      ),
    (text) =>
      /\b(?:drywall|sheetrock)\s+screws?\b|\bscrews?\b[^\n]{0,30}\b(?:drywall|sheetrock)\b/i.test(
        text,
      ),
    (text) => /\b(?:circuit\s+)?breakers?\b|\binterruptores?\b/i.test(text),
  ];
  const quantityProductCount = quantityProductPredicates.filter((predicate) =>
    predicate(value),
  ).length;
  const standaloneQuantityAnswer =
    quantityProductCount === 1 &&
    customerLines.some((line) =>
      /^\s*\d{1,6}\s*(?:pcs?|pieces?|each|ea|sheets?|bags?|buckets?|bundles?|cans?|gallons?|gals?|rolls?|packs?)?\s*[.!]?\s*$/i.test(
        line,
      ),
    );
  const hasProductQuantity = (predicate: (text: string) => boolean) =>
    standaloneQuantityAnswer ||
    quantityClauses.some((clause) => {
      if (!predicate(clause)) return false;
      // A denominator in a construction fraction is a specification, never a
      // count. Without removing it, `5/8 regular Sheetrock` looked like eight
      // pieces and could pass the request-creation gate without a quantity.
      const quantityText = clause.replace(/\b\d+\s*\/\s*\d+\b/g, "SPEC");
      return (
        /\b\d{1,6}\s*(?:breakers?|interruptores?)\b|(?:^|\s)\d{1,6}\s*מפסקים?/i.test(
          quantityText,
        ) ||
        /\b\d{1,6}\s*(?:pcs?|pieces?|each|ea|sheets?|bags?|buckets?|bundles?|cans?|gallons?|gals?|rolls?|packs?)\b/i.test(
          quantityText,
        ) ||
        /^\s*\d{1,6}\s+/.test(quantityText)
      );
    });

  const paintMatches = [...value.matchAll(/\bpaint\b/gi)];
  const postListAnswer =
    paintMatches.length > 1
      ? value.slice((paintMatches[0].index || 0) + paintMatches[0][0].length)
      : "";
  const halfInchSheetrock =
    /\b(?:drywall(?!\s+screws?)|sheetrock)\b[^\n]{0,40}\b(?:4\s*[x×]\s*8\s*[x×]\s*)?1\s*\/\s*2\b|\b1\s*\/\s*2\b[^\n]{0,40}\b(?:drywall(?!\s+screws?)|sheetrock)\b/i;
  if (
    !options.exactListOnly &&
    !postListAnswer &&
    halfInchSheetrock.test(sheetrockEvidence) &&
    !/\b(?:keep|confirm(?:ed)?|yes|use|make|change|actually)?\s*(?:1\s*\/\s*2|5\s*\/\s*8)\b/i.test(
      textAfter(halfInchSheetrock, sheetrockEvidence),
    )
  ) {
    questions.push(
      "Sheetrock thickness: keep 1/2-in., or change to our standard 5/8-in.?",
    );
  }
  const hasSheetrock =
    looksLikeSheetrock(sheetrockEvidence) ||
    /\bsheet\s*rock\b|\bdrywall(?!\s+screws?)\b/i.test(sheetrockEvidence);
  const sheetrockThickness =
    sheetrockEvidence.match(
      /\b(?:1\s*\/\s*4|3\s*\/\s*8|1\s*\/\s*2|5\s*\/\s*8)\s*(?:in(?:ch(?:es)?)?\.?|["”])?/i,
    )?.[0] || "";
  const hasSheetrockType =
    /\b(?:regular|type\s*x|fire[- ]?rated|moisture[- ]?resistant|mold[- ]?resistant|green\s*board|purple\s*board)\b/i.test(
      sheetrockEvidence,
    );
  if (
    hasSheetrock &&
    !halfInchSheetrock.test(sheetrockEvidence) &&
    (!sheetrockThickness || !hasSheetrockType)
  ) {
    questions.push(
      !sheetrockThickness && !hasSheetrockType
        ? localized(
            "Can we do 5/8-in. regular Sheetrock, or do you need Type X/fire-rated or moisture-resistant?",
            "¿Podemos usar panel de yeso regular de 5/8 pulg., o necesita Type X/resistente al fuego o a la humedad?",
            "אפשר להשתמש בלוח גבס רגיל 5/8 אינץ׳, או שצריך Type X/עמיד אש או עמיד רטיבות?",
          )
        : !sheetrockThickness
          ? localized(
              "Can we do 5/8-in. Sheetrock?",
              "¿Podemos usar panel de yeso de 5/8 pulg.?",
              "אפשר להשתמש בלוח גבס 5/8 אינץ׳?",
            )
          : localized(
              `For the ${sheetrockThickness.match(/(?:1\s*\/\s*4|3\s*\/\s*8|1\s*\/\s*2|5\s*\/\s*8)/i)?.[0]?.replace(/\s+/g, "") || sheetrockThickness}-in. Sheetrock: regular, Type X/fire-rated, or moisture-resistant?`,
              `Para el panel de yeso de ${sheetrockThickness}-pulg.: ¿regular, Type X/resistente al fuego o resistente a la humedad?`,
              `ללוח גבס ${sheetrockThickness} אינץ׳: רגיל, Type X/עמיד אש או עמיד רטיבות?`,
            ),
    );
  }
  if (hasSheetrock && !hasProductQuantity(quantityProductPredicates[0])) {
    questions.push(
      localized(
        "How many sheets of Sheetrock do you need?",
        "¿Cuántos paneles de yeso necesita?",
        "כמה לוחות גבס צריך?",
      ),
    );
  }

  const cornerBit = /\bcorner\s+(?:bit|bead)\b/i;
  const cornerAnswer = value;
  const hasCornerType = /\b(?:metal|vinyl|paper[- ]faced)\b/i.test(
    cornerAnswer,
  );
  const hasCornerLength =
    /\b(?:8|10)[-\s]*(?:ft|feet|foot|['’])\b/i.test(cornerAnswer) ||
    /(?:^|\n)\s*(?:8|10)\b[^\n]*\bpaint\b/i.test(cornerAnswer);
  if (cornerBit.test(value) && !(hasCornerType && hasCornerLength)) {
    questions.push(
      hasCornerLength
        ? "For “corner bit,” which corner bead type: metal or vinyl?"
        : hasCornerType
          ? "For “corner bit,” which length: 8 ft or 10 ft?"
          : "For “corner bit,” which corner bead type and length: metal or vinyl, 8 ft or 10 ft?",
    );
  }
  if (
    cornerBit.test(value) &&
    !hasProductQuantity(quantityProductPredicates[4])
  ) {
    questions.push("How many pieces of corner bead do you need?");
  }

  const paint = /\bpaint\b/i;
  const paintCustomerEvidence = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^Avantia:/i.test(line))
    .map((line) => line.replace(/^Customer:\s*/i, ""))
    .join("\n");
  const paintBrandMatch =
    paintCustomerEvidence.match(
      /\b(?:sherm(?:a|e)n[- ]?willi(?:am|ams)?|sherwin[- ]?williams?|benjamin\s+moore|behr|ppg)\b/i,
    )?.[0] || "";
  const paintBrand = /sherm|sherwin/i.test(paintBrandMatch)
    ? "Sherwin Williams"
    : paintBrandMatch;
  const latestCommonColor =
    [
      ...paintCustomerEvidence.matchAll(
        /\b(?:white|black|gray|grey|beige|tan|brown|blue|green|red|yellow|orange|cream|ivory)\b/gi,
      ),
    ].at(-1)?.[0] || "";
  const hasPaintFinish =
    /\b(?:flat|matte|eggshell|satin|semi[- ]gloss|gloss)\b/i.test(
      paintCustomerEvidence,
    );
  const hasPaintColor =
    /\b(?:white|black|gray|grey|beige|tan|brown|blue|green|red|yellow|orange|cream|ivory|color\s*(?:is|:)?\s*[a-z][a-z -]{1,30})\b/i.test(
      paintCustomerEvidence,
    ) ||
    /\b(?:sherm(?:a|e)n[- ]?willi(?:am|ams)?|sherwin[- ]?williams?|benjamin\s+moore|behr|ppg)\b[^\n]{0,30}\b[a-z]{1,4}[- ]?\d{1,5}\b/i.test(
      paintCustomerEvidence,
    ) ||
    /\b[A-Z]{1,4}-\d{1,5}\b/i.test(paintCustomerEvidence);
  if (paint.test(value) && !(hasPaintFinish && hasPaintColor)) {
    questions.push(
      hasPaintColor
        ? latestCommonColor
          ? `Got it—${latestCommonColor.toLowerCase()}. Which finish: flat, eggshell, satin, or semi-gloss?`
          : "Which paint finish: flat, eggshell, satin, or semi-gloss?"
        : hasPaintFinish
          ? "Got it. What paint color do you need?"
          : paintBrand
            ? `Got it—${paintBrand}. What paint color do you need?`
            : "What paint color do you need?",
    );
  }
  if (paint.test(value) && !hasProductQuantity(quantityProductPredicates[3])) {
    questions.push("How many gallons or cans of paint do you need?");
  }

  const addQuantityQuestion = (
    product: string,
    unit: string,
    predicate: (text: string) => boolean,
  ) => {
    if (!hasProductQuantity(predicate))
      questions.push(`How many ${unit} of ${product} do you need?`);
  };

  const metalStuds =
    /\bmetal\s+(?:studs?|framing)\b|\bstuds?\b[^\n]{0,30}\b(?:gauge|ga\.?|metal)\b/i.test(
      value,
    );
  if (metalStuds) {
    const hasSizeAndLength =
      /\b(?:1\s*[- ]?\s*5\/8|2\s*[- ]?\s*1\/2|3\s*[- ]?\s*5\/8|4|6)\s*(?:in\.?|inch(?:es)?|["”])?\b[^\n]{0,40}\b(?:8|10|12|14|16)\s*(?:ft|feet|foot|['’])\b|\b\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\b/i.test(
        value,
      );
    const hasGauge = /\b(?:14|16|18|20|22|25)\s*(?:ga\.?|gauge)\b/i.test(value);
    if (!hasSizeAndLength)
      questions.push("What metal-stud width and length do you need?");
    if (!hasGauge) questions.push("What gauge do you need?");
    addQuantityQuestion("metal studs", "pieces", quantityProductPredicates[1]);
  }

  const thinset =
    /\bthin\s*set\b|\bthinset\b|\btile\s+(?:mortar|adhesive)\b/i.test(value);
  if (thinset) {
    // A manufacturer + model is already the product decision. Once the
    // customer names MAPEI Ultraflex 1, asking about tile, substrate, or
    // location is redundant and makes the intake feel like a questionnaire.
    const hasExactThinsetProduct =
      /\b(?:mapei\s+)?ultra\s*flex\s*1\b|\b(?:mapei\s+)?ultraflex\s*1\b/i.test(
        value,
      );
    const hasTile =
      /\b(?:porcelain|ceramic|glass|marble|granite|stone|mosaic|tile)\b[^\n]{0,35}\b\d+(?:\.\d+)?\s*(?:x|×|in|inch)|\b\d+(?:\.\d+)?\s*(?:x|×)\s*\d+(?:\.\d+)?\b[^\n]{0,35}\b(?:tile|porcelain|ceramic|stone)\b/i.test(
        value,
      );
    const hasSubstrate =
      /\b(?:concrete|cement\s*board|backer\s*board|drywall|gypsum|plywood|osb|membrane|ditra)\b/i.test(
        value,
      );
    const hasLocation =
      /\b(?:floor|wall|shower|bathroom|kitchen|backsplash|indoor|interior|outdoor|exterior|pool)\b/i.test(
        value,
      );
    if (!hasExactThinsetProduct && !hasTile)
      questions.push("What tile type and size are you installing?");
    if (!hasExactThinsetProduct && !hasSubstrate)
      questions.push("What substrate is it for?");
    else if (!hasExactThinsetProduct && !hasLocation)
      questions.push("What installation location is it for?");
    addQuantityQuestion("thinset", "bags", quantityProductPredicates[2]);
  }

  const sand = /\b(?:sand|arena)\b/i.test(value);
  if (
    sand &&
    !/\b(?:mason(?:ry)?|concrete|fill|utility|torpedo|play)\s+sand\b|\bsand\s+(?:for\s+)?(?:masonry|concrete|fill)\b/i.test(
      value,
    )
  ) {
    questions.push(
      "Which sand do you need: mason sand, concrete sand, or fill sand?",
    );
  }

  const portlandCement = /\bportland\s+cement\b|\bcement\s+portland\b/i.test(
    value,
  );
  if (
    portlandCement &&
    !/\b(?:bags?|sacks?)\b|\b(?:47|50|80|92\.6|94)\s*(?:lb|lbs|pounds?)\b|\btype\s*(?:i|ii|iii|iv|v|1|2|3|4|5)(?:\s*\/\s*(?:i|ii|1|2))?\b/i.test(
      value,
    )
  ) {
    questions.push("Can we use standard 94-lb Type I/II Portland cement bags?");
  }

  const roofing = /\b(?:roofing\s+)?shingles?\b/i.test(value);
  if (roofing) {
    const hasRoofType =
      /\b(?:3[- ]tab|architectural|designer|asphalt|cedar|wood|metal)\b/i.test(
        value,
      );
    const hasRoofColor =
      /\b(?:black|brown|gray|grey|charcoal|slate|weathered\s+wood|driftwood|red|green|blue|color\s*[:#-]?\s*[a-z])\b/i.test(
        value,
      );
    const hasRoofArea =
      /\b\d+(?:\.\d+)?\s*(?:sq\.?\s*ft|square\s*feet|sf|squares?)\b/i.test(
        value,
      );
    if (!hasRoofType || !hasRoofColor)
      questions.push("What shingle type and color do you need?");
    if (!hasRoofArea)
      questions.push("How many square feet or roofing squares do you need?");
  }

  const insulation =
    /\binsulation\b|\b(?:fiberglass|mineral\s+wool|rockwool)\s+(?:batt|roll|insulation)\b/i.test(
      value,
    );
  if (insulation) {
    const hasRValue = /\bR[- ]?\d{1,2}\b/i.test(value);
    const hasInsulationType =
      /\b(?:batt|roll|rigid|foam\s*board|spray\s*foam|blown[- ]in|fiberglass|mineral\s+wool|rockwool)\b/i.test(
        value,
      );
    const hasInsulationSize =
      /\b(?:15|16|23|24)\s*(?:in\.?|inch(?:es)?|["”])\b|\b\d+(?:\.\d+)?\s*(?:sq\.?\s*ft|sf)\b/i.test(
        value,
      );
    if (!hasRValue || !hasInsulationType)
      questions.push("What insulation type and R-value do you need?");
    if (!hasInsulationSize)
      questions.push("What width or coverage do you need?");
    addQuantityQuestion("insulation", "packages", quantityProductPredicates[5]);
  }

  const panels = /\b(?:plywood|osb|oriented\s+strand\s+board)\b/i.test(value);
  if (panels) {
    const hasPanelThickness =
      /\b(?:1\/4|3\/8|7\/16|1\/2|5\/8|3\/4)\s*(?:in\.?|inch(?:es)?|["”])?\b/i.test(
        value,
      );
    const hasPanelSize =
      /\b(?:4\s*[x×]\s*8|4\s*[x×]\s*9|4\s*[x×]\s*10)\b/i.test(value);
    if (!hasPanelThickness || !hasPanelSize)
      questions.push("What panel thickness and sheet size do you need?");
    addQuantityQuestion("panels", "sheets", quantityProductPredicates[6]);
  }

  const doors =
    /\bdoors?\b/i.test(value) && !/\bgarage\s+doors?\b/i.test(value);
  if (doors) {
    const hasDoorSize =
      /\b(?:1|2|3|4|5|6|7|8)\s*[-x×]\s*(?:6|7|8)|\b\d{2,3}\s*[x×]\s*\d{2,3}\b|\b\d{4}\b/i.test(
        value,
      );
    const hasDoorUse =
      /\b(?:interior|exterior|entry|prehung|slab|fire[- ]rated)\b/i.test(value);
    const hasHanding =
      /\b(?:left|right)[- ]?hand|\bLH\b|\bRH\b|\binswing|\boutswing/i.test(
        value,
      );
    if (!hasDoorSize || !hasDoorUse)
      questions.push(
        "What door size and type do you need: interior, exterior, prehung, or slab?",
      );
    if (/\b(?:prehung|exterior|entry)\b/i.test(value) && !hasHanding)
      questions.push("What handing and swing do you need?");
    addQuantityQuestion("doors", "doors", quantityProductPredicates[7]);
  }

  const windows = /\bwindows?\b/i.test(value);
  if (windows) {
    const hasWindowSize =
      /\b\d{2,3}\s*[x×]\s*\d{2,3}\b|\b\d+\s*(?:ft|feet|foot|['’])\s*(?:x|×)\s*\d+|\b\d{4}\b/i.test(
        value,
      );
    const hasWindowType =
      /\b(?:double[- ]hung|single[- ]hung|casement|slider|sliding|picture|awning|hopper|fixed)\b/i.test(
        value,
      );
    if (!hasWindowSize || !hasWindowType)
      questions.push("What window size and operating type do you need?");
    addQuantityQuestion("windows", "windows", quantityProductPredicates[8]);
  }

  const dumpster = /\b(?:dumpsters?|roll[- ]?offs?|containers?)\b/i.test(value);
  if (dumpster) {
    const hasDumpsterSize = /\b(?:10|12|15|20|30|40)\s*(?:yd|yard)s?\b/i.test(
      value,
    );
    const hasDebris =
      /\b(?:construction|demolition|concrete|brick|dirt|soil|roofing|shingles|wood|mixed|household)\s+(?:debris|waste)|\b(?:concrete|brick|dirt|soil|shingles)\b/i.test(
        value,
      );
    const hasDuration = /\b\d+\s*(?:day|days|week|weeks)\b/i.test(value);
    if (!hasDumpsterSize)
      questions.push(
        "Which dumpster size do you need: 10, 20, 30, or 40 yards?",
      );
    if (!hasDebris) questions.push("What material or debris is going into it?");
    if (!hasDuration) questions.push("How long do you need the dumpster?");
  }

  const dimensionalLumber =
    /\b(?:wood\s+)?lumber\b|\b\d+\s*[x×]\s*\d+(?:\s*[x×]\s*\d+)?\b[^\n]{0,30}\b(?:wood|studs?|lumber|boards?)?\b/i.test(
      value,
    ) && !metalStuds;
  if (dimensionalLumber) {
    const hasLumberDimensions =
      /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\b/i.test(
        value,
      );
    if (!hasLumberDimensions)
      questions.push("What lumber dimensions and length do you need?");
    addQuantityQuestion("lumber", "pieces", quantityProductPredicates[9]);
  }

  const drywallFastener =
    /\b(?:drywall|sheetrock)\s+screws?\b|\bscrews?\b[^\n]{0,30}\b(?:drywall|sheetrock)\b/i.test(
      value,
    );
  if (drywallFastener) {
    const hasScrewLength =
      /\b(?:1|1\s*1\/4|1\s*5\/8|2|2\s*1\/2|3)\s*(?:in\.?|inch(?:es)?|["”])\b|\b1[- ]?1\/4\b|\b1[- ]?5\/8\b/i.test(
        value,
      );
    if (!hasScrewLength)
      questions.push("What drywall-screw length do you need?");
    addQuantityQuestion(
      "drywall screws",
      "pieces",
      quantityProductPredicates[10],
    );
  }

  const breaker = /\b(?:circuit\s+)?breakers?\b|\binterruptores?\b/i.test(
    value,
  );
  if (breaker) {
    const squareD = /\bsquare\s*d\b/i.test(value);
    const hasSquareDLine = /\b(?:homeline|q\s*o)\b/i.test(value);
    const hasPanelBrand =
      squareD ||
      /\b(?:siemens|eaton|cutler[- ]hammer|ge|general\s+electric|leviton|federal\s+pacific)\b/i.test(
        value,
      );
    const language = smsReplyLanguage(value);
    if (squareD && !hasSquareDLine) {
      questions.push(
        language === "es"
          ? "¿Qué línea de Square D necesita: Homeline o QO?"
          : language === "he"
            ? "איזו סדרת Square D צריך: Homeline או QO?"
            : "Which Square D line do you need: Homeline or QO?",
      );
    } else if (!hasPanelBrand) {
      questions.push(
        language === "es"
          ? "¿Qué marca tiene el panel eléctrico?"
          : language === "he"
            ? "מה יצרן לוח החשמל?"
            : "What is the electrical panel manufacturer?",
      );
    }
    if (!hasProductQuantity(quantityProductPredicates[11])) {
      questions.push(
        language === "es"
          ? "¿Cuántos interruptores necesita?"
          : language === "he"
            ? "כמה מפסקים צריך?"
            : "How many breakers do you need?",
      );
    }
  }

  const hasProductLink = /https?:\/\/\S+/i.test(value);
  const textWithoutLinks = value.replace(/https?:\/\/\S+/gi, " ");
  if (hasProductLink && !MATERIAL_TERMS.test(textWithoutLinks)) {
    questions.push(
      localized(
        "What product name or model is shown in that link?",
        "¿Qué nombre o modelo de producto aparece en ese enlace?",
        "איזה שם מוצר או דגם מופיע בקישור?",
      ),
    );
  }

  const uniqueQuestions = [...new Set(questions)];
  return options.includeAll ? uniqueQuestions : uniqueQuestions.slice(0, 1);
}

export function smsMaterialIntelligenceAssessment(
  value: string,
  options: { exactListOnly?: boolean } = {},
) {
  const canonicalValue = canonicalMaterialText(value);
  const questions = smsMaterialClarificationQuestions(value, {
    ...options,
    includeAll: true,
  });
  const matchedRules = [
    [
      (text: string) =>
        looksLikeSheetrock(text) ||
        /\bsheet\s*rock\b|\bdrywall(?!\s+screws?)/i.test(text),
      "drywall-sheet",
    ],
    [
      (text: string) => /\bmetal\s+(?:studs?|framing)\b/i.test(text),
      "metal-stud",
    ],
    [
      (text: string) =>
        /\b(?:thin\s*set|thinset|tile\s+(?:mortar|adhesive))\b/i.test(text),
      "thinset",
    ],
    [
      (text: string) => /\b(?:roofing\s+)?shingles?\b/i.test(text),
      "roofing-shingle",
    ],
    [(text: string) => /\bpaint\b/i.test(text), "paint"],
    [(text: string) => /\bcorner\s+(?:bit|bead)\b/i.test(text), "corner-bead"],
    [
      (text: string) =>
        /\binsulation\b|\b(?:fiberglass|rockwool|mineral\s+wool)\b/i.test(text),
      "insulation",
    ],
    [
      (text: string) =>
        /\b(?:plywood|osb|oriented\s+strand\s+board)\b/i.test(text),
      "structural-panel",
    ],
    [(text: string) => /\bdoors?\b/i.test(text), "door"],
    [(text: string) => /\bwindows?\b/i.test(text), "window"],
    [
      (text: string) =>
        /\b(?:dumpsters?|roll[- ]?offs?|containers?)\b/i.test(text),
      "dumpster",
    ],
    [
      (text: string) =>
        /\b(?:wood\s+)?lumber\b|\b\d+\s*[x×]\s*\d+\s*[x×]\s*\d+\b/i.test(text),
      "dimensional-lumber",
    ],
    [
      (text: string) =>
        /\b(?:drywall|sheetrock)\s+screws?\b|\bscrews?\b[^\n]{0,30}\b(?:drywall|sheetrock)\b/i.test(
          text,
        ),
      "drywall-fastener",
    ],
    [
      (text: string) =>
        /\b(?:circuit\s+)?breakers?\b|\binterruptores?\b/i.test(text),
      "circuit-breaker",
    ],
    [(text: string) => /https?:\/\/\S+/i.test(text), "external-product-link"],
  ]
    .filter(([matches]) =>
      (matches as (text: string) => boolean)(canonicalValue),
    )
    .map(([, key]) => key as string);
  const readyForConfirmation =
    matchedRules.length > 0 && questions.length === 0;
  const confidence =
    matchedRules.length === 0
      ? 0.45
      : readyForConfirmation
        ? 0.98
        : Math.max(0.5, 0.82 - questions.length * 0.1);
  return {
    matchedRules,
    questions,
    missingCriticalDetails: questions.length > 0,
    readyForConfirmation,
    confidence,
    sourcePriority: [
      "avantia_catalog",
      "owner_approved_rule",
      "manufacturer_document",
      "general_construction_knowledge",
    ] as const,
  };
}

export function smsMessagesAfterConfirmedRequest<
  T extends { occurred_at: string },
>(messages: T[], completedAt: string | null | undefined) {
  if (!completedAt) return messages;
  const boundary = Date.parse(completedAt);
  if (!Number.isFinite(boundary)) return messages;
  return messages.filter(
    (message) => Date.parse(message.occurred_at) > boundary,
  );
}

export const SMS_CONVERSATION_IDLE_LIMIT_MS = 24 * 60 * 60 * 1000;

export function smsMessagesAfterInactivityBoundary<
  T extends { occurred_at: string },
>(messages: T[], idleLimitMs = SMS_CONVERSATION_IDLE_LIMIT_MS) {
  if (messages.length < 2) return messages;
  let boundary = 0;
  for (let index = 1; index < messages.length; index += 1) {
    const previous = Date.parse(messages[index - 1].occurred_at);
    const current = Date.parse(messages[index].occurred_at);
    if (
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      current - previous > idleLimitMs
    )
      boundary = index;
  }
  return messages.slice(boundary);
}

export function smsBareOrderIntentReply(value: string) {
  const trimmed = value.trim();
  const withoutGreeting = trimmed.replace(
    /^(?:hi|hello|hey|שלום|היי|hola)[!.?\s]*/iu,
    "",
  );
  if (!(
    /^(?:(?:can|could)\s+i|i\s+(?:want|need|would\s+like)\s+to)\s+(?:order|buy)[?.!\s]*$/iu.test(withoutGreeting) ||
    /^(?:אפשר|אני רוצה|אני צריך)\s+(?:להזמין|לקנות)[?.!\s]*$/u.test(withoutGreeting) ||
    /^(?:puedo|quiero|necesito)\s+(?:pedir|comprar)[?.!\s]*$/iu.test(withoutGreeting)
  ))
    return null;
  const language = smsReplyLanguage(trimmed);
  if (language === "he")
    return "בהחלט. שלח את רשימת החומרים שלך, שורה אחת לכל מוצר, עם כמות ומידה אם ידועות. לדוגמה: 50 לוחות Sheetrock רגיל בעובי 5/8 אינץ'. נארגן את הבקשה ונשלח אותה לאישור שלך לפני שמזמינים משהו.";
  if (language === "es")
    return "Claro. Envíe su lista de materiales, un producto por línea, con la cantidad y la medida si las conoce. Ejemplo: 50 paneles de Sheetrock regular de 5/8 pulg. Organizaremos la solicitud y se la enviaremos para su aprobación antes de pedir nada.";
  return "Absolutely. Send your material list, one item per line, with the quantity and size if known. Example: 50 sheets of 5/8-in. regular Sheetrock. We’ll organize the request and send it back for your approval before anything is ordered.";
}

export function publicStartTextOpeningMessage() {
  return "Hi, Carlos from Avantia Build. Send your material list, photo, plan, or current quote. We’ll check pricing, availability, and delivery. See how it works (20 sec): https://build.avantiap.com/videos/avantia-request-material-whatsapp-en-clear-20s.mp4";
}

export function isSmsBareGreeting(value: string) {
  return /^\s*(?:hi|hello|hey|hola|shalom|שלום|היי|good (?:morning|afternoon|evening))[!.?\s]*$/iu.test(
    value,
  );
}

export function applyAvantiaMaterialDefaults<
  T extends { name: string; quantity: number; unit: string },
>(items: T[], customerText: string): T[] {
  const bareWood2x4 =
    /\b\d+\s*(?:pc|pcs|pieces?)?\s*2\s*x\s*4\s*x\s*8\b/i.test(customerText) &&
    !/\bmetal\b[^\n]{0,40}\b2\s*x\s*4\s*x\s*8\b|\b2\s*x\s*4\s*x\s*8\b[^\n]{0,40}\bmetal\b/i.test(
      customerText,
    );
  const oneThousandScrews =
    /\b1000\s*(?:pc|pcs|pieces?)\s+(?:box\s+)?(?:drywall\s+)?screws?\b|\b(?:drywall\s+)?screws?\b[^\n]{0,60}\b1000\s*(?:pc|pcs|pieces?)\b/i.test(
      customerText.replaceAll(",", ""),
    );
  const tapeWithoutQuantity =
    /^(?![^\n]*\d)[^\n]*\b(?:matching\s+)?tape\b[^\n]*$/im.test(customerText);
  const compoundWithoutType =
    /\b(?:1\s+)?bucket\b[^\n]{0,40}\bcompound\b/i.test(customerText) &&
    !/\b(?:all[- ]purpose|taping|finishing|lightweight|setting)\b[^\n]{0,40}\bcompound\b|\bcompound\b[^\n]{0,40}\b(?:all[- ]purpose|taping|finishing|lightweight|setting)\b/i.test(
      customerText,
    );
  const primerWithoutType =
    /\b(?:1\s+)?bucket\b[^\n]{0,40}\bprimer\b/i.test(customerText) &&
    !/\b(?:drywall|interior|exterior|oil|latex|water[- ]based|shellac)\b[^\n]{0,30}\bprimer\b|\bprimer\b[^\n]{0,30}\b(?:drywall|interior|exterior|oil|latex|water[- ]based|shellac)\b/i.test(
      customerText,
    );

  return items.map((item) => {
    const normalized = { ...item };
    if (
      bareWood2x4 &&
      /\b2\s*x\s*4\s*x\s*8\b/i.test(normalized.name) &&
      !/\b(?:wood|metal)\b/i.test(normalized.name)
    ) {
      normalized.name = `Wood ${normalized.name}`;
    }
    if (oneThousandScrews && /\bscrews?\b/i.test(normalized.name)) {
      normalized.quantity = 1000;
      normalized.unit = "pieces";
      if (!/\b1,?000[- ]count\b/i.test(normalized.name))
        normalized.name = `${normalized.name} (one 1,000-count box)`;
    }
    if (tapeWithoutQuantity && /\btape\b/i.test(normalized.name)) {
      normalized.quantity = 1;
      normalized.unit = "roll";
    }
    if (
      compoundWithoutType &&
      /\bcompound\b/i.test(normalized.name) &&
      !/\ball[- ]purpose\b/i.test(normalized.name)
    ) {
      normalized.name = `All-purpose ${normalized.name}`;
      normalized.quantity = 1;
      normalized.unit = "bucket";
    }
    if (
      primerWithoutType &&
      /\bprimer\b/i.test(normalized.name) &&
      !/\bdrywall\b/i.test(normalized.name)
    ) {
      normalized.name = `Drywall ${normalized.name}`;
      normalized.quantity = 1;
      normalized.unit = "bucket";
    }
    return normalized;
  });
}

export function smsQuantityClarificationReply(message: string) {
  if (/[\u0590-\u05ff]/.test(message)) return "בטח—איזו כמות אתה צריך?";
  if (smsReplyLanguage(message) === "es")
    return "Claro—¿qué cantidad necesita?";
  if (/\bthinset\b/i.test(message))
    return "Sure — how much thinset do you need?";
  if (/\b(?:sheetrock|drywall)\b/i.test(message))
    return "How many sheets do you need?";
  return "Sure — how much do you need?";
}

function damerauLevenshteinDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, column) =>
      row === 0 ? column : column === 0 ? row : 0,
    ),
  );
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] +
          (left[row - 1] === right[column - 1] ? 0 : 1),
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        rows[row][column] = Math.min(
          rows[row][column],
          rows[row - 2][column - 2] + 1,
        );
      }
    }
  }
  return rows[left.length][right.length];
}

function looksLikeSheetrock(value: string) {
  return (
    value
      .toLowerCase()
      .match(/[a-z]+/g)
      ?.some(
        (token) =>
          token.length >= 7 &&
          token.length <= 10 &&
          damerauLevenshteinDistance(token, "sheetrock") <= 2,
      ) ?? false
  );
}

export function smsProductInquiryFallbackReply(
  message: string,
  _options: { allowRelatedSuggestion?: boolean } = {},
) {
  void _options;
  const value = message
    .trim()
    .replace(/^new\s+(?:request|order|job|project|material\s+list)\s*:\s*/i, "")
    .trim();
  const standardMatch = value.match(
    /^(?:do\s+)?(?:you(?:\s+guys)?|u)\s+(?:sell|carry|have|source)\s+(.+?)[?.!]*$/i,
  );
  const sheetrockGetMatch = value.match(
    /^(?:can|could)\s+(?:i|we)\s+(?:get|buy|order|source)\s+(.+?)[?.!]*$/i,
  );
  const needMatch = value.match(
    /^(?:i|we)\s+(?:need|want|am\s+looking\s+for|are\s+looking\s+for)\s+(.+?)[?.!]*$/i,
  );
  const neededMaterial =
    needMatch?.[1] &&
    /\b(?:sheetrock|drywall|thin\s*set|roof(?:ing)?\s+shingles?|shingles?|metal\s+studs?)\b/i.test(
      needMatch[1],
    )
      ? needMatch[1]
      : "";
  const rawProduct = (
    standardMatch?.[1] ||
    (sheetrockGetMatch?.[1] && looksLikeSheetrock(sheetrockGetMatch[1])
      ? sheetrockGetMatch[1]
      : "") ||
    neededMaterial
  )
    .trim()
    .slice(0, 80);
  if (!rawProduct) return null;
  // A message with a concrete quantity is an order/request, not a generic
  // product-availability question. Let the material-request pipeline extract
  // and preserve the supplied quantity/specifications, then ask only for the
  // next genuinely missing field. Treating it as a product inquiry caused the
  // deterministic fallback to ask for quantity and type a second time.
  if (smsHasExplicitQuantity(value)) return null;
  const product =
    looksLikeSheetrock(rawProduct) || /drywall/i.test(rawProduct)
      ? "Sheetrock"
      : /thin\s*set/i.test(rawProduct)
        ? "thinset"
        : /\b(?:roof(?:ing)?\s+shingles?|shingles?)\b/i.test(rawProduct)
          ? "roofing shingles"
          : /\bmetal\s+studs?\b/i.test(rawProduct)
            ? "metal studs"
            : rawProduct;
  if (product === "roofing shingles")
    return "Sure—we can help source roofing shingles. What shingle type do you need?";
  if (product === "thinset")
    return "Sure—we can help source thinset. What type do you need?";
  if (product === "metal studs")
    return "Sure—we can help source metal studs. What stud size do you need?";
  const specification =
    product === "Sheetrock"
      ? "Can you confirm 5/8 in.?"
      : "What type do you need?";
  const primary =
    product === "Sheetrock"
      ? `We can help source Sheetrock. ${specification}`
      : `We can help source ${product}. ${specification}`;
  return primary;
}

export function smsSheetrockSpecificationFollowUpReply(
  latestMessage: string,
  conversationText: string,
) {
  if (
    !looksLikeSheetrock(conversationText) &&
    !/drywall/i.test(conversationText)
  )
    return null;
  const asksThickness =
    /\b(?:what|which)\s+(?:thinn?est|thickness(?:es)?)\b|\b(?:thinn?est|thickness(?:es)?)\s+(?:do|can)\s+you\b/i.test(
      latestMessage,
    );
  const correctsQuantity =
    /\b(?:i\s+asked|asking)\b.{0,60}\b(?:what|which)\b.{0,30}\b(?:have|carry|thinn?est|thickness)\b.{0,50}\bnot\b.{0,20}\b(?:how\s+many|quantity)\b/i.test(
      latestMessage,
    );
  if (!asksThickness && !correctsQuantity) return null;
  return "5/8 in. is the standard Sheetrock option. Can you confirm 5/8 in.?";
}

export function smsShortMaterialAnswerReply(
  latestMessage: string,
  conversationText: string,
) {
  if (!/\bmetal\s+studs?\b/i.test(conversationText)) return null;
  const match = latestMessage
    .trim()
    .match(
      /^(\d+(?:\s*[-x×/]\s*\d+){1,2})\s*(?:,|x|×|-)?\s*(\d{1,6})(?:\s*(?:pcs?|pieces?|ea|each))?[.!]?$/i,
    );
  if (!match) return null;
  const size = match[1].replace(/\s+/g, "").replace("×", "x");
  const quantity = Number(match[2]);
  if (!Number.isFinite(quantity) || quantity < 1) return null;
  const hasLength = (size.match(/x/g) || []).length >= 2;
  return `Got it—${quantity} ${size} metal studs. ${hasLength ? "What gauge?" : "What length do you need?"}`;
}

export function smsContextualQuantityAnswerReply(
  latestMessage: string,
  conversationText: string,
) {
  const lines = conversationText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const latestAvantia =
    [...lines].reverse().find((line) => /^Avantia:/i.test(line)) || "";
  if (
    !/\b(?:how\s+many|how\s+much|quantity|square\s+feet|sq\.?\s*ft)\b/i.test(
      latestAvantia,
    )
  )
    return null;
  const customerHistory = lines
    .filter((line) => /^Customer:/i.test(line))
    .map((line) => line.replace(/^Customer:\s*/i, ""))
    .filter(
      (line) =>
        line.trim().toLowerCase() !== latestMessage.trim().toLowerCase(),
    );
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
  const questionFamilies = familyPatterns
    .filter(([, pattern]) => pattern.test(latestAvantia))
    .map(([family]) => family);
  const latestProductContext =
    [...customerHistory]
      .reverse()
      .find((line) =>
        familyPatterns.some(([, pattern]) => pattern.test(line)),
      ) || "";
  const contextFamilies = familyPatterns
    .filter(([, pattern]) => pattern.test(latestProductContext))
    .map(([family]) => family);
  const family =
    questionFamilies.length === 1 &&
    customerHistory.some((line) =>
      familyPatterns
        .find(([candidate]) => candidate === questionFamilies[0])?.[1]
        .test(line),
    )
      ? questionFamilies[0]
      : questionFamilies.length === 0 && contextFamilies.length === 1
        ? contextFamilies[0]
        : null;
  if (!family) return null;
  const value = latestMessage
    .trim()
    .replace(/[.!]+$/, "")
    .replace(/^i\s+(?:need|want)\s+/i, "")
    .replace(/^(?:about|around|like|approximately)\s+/i, "");
  const measured = value.match(
    /^(\d{1,3}(?:,\d{3})+|\d{1,6}(?:\.\d+)?)\s*(sq\.?\s*ft|sf|square\s+feet|sheets?|bags?|boxes?|buckets?|gallons?|pcs?|pieces?|peices?|each|ea)?$/i,
  );
  if (!measured) return null;
  const amount = Number(measured[1].replaceAll(",", ""));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return null;
  const suppliedUnit = (measured[2] || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^peices?$/, "pieces");
  if (family === "roofing") {
    const unit =
      suppliedUnit ||
      (/square\s+feet|sq\.?\s*ft/i.test(latestAvantia) ? "sq ft" : "");
    if (!/^(?:sq\.?\s*ft|sf|square feet)$/.test(unit)) return null;
    return `Got it—${amount} sq ft of roofing shingles. What shingle type do you need?`;
  }
  if (family === "thinset") {
    const unit = suppliedUnit || (/bags?/i.test(latestAvantia) ? "bags" : "");
    if (!/^bags?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "bag" : "bags"} of thinset. Which thinset do you need?`;
  }
  if (family === "sheetrock") {
    const unit =
      suppliedUnit || (/sheets?/i.test(latestAvantia) ? "sheets" : "");
    if (!/^sheets?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "sheet" : "sheets"} of Sheetrock. Can you confirm 5/8 in.?`;
  }
  if (family === "metal_studs") {
    const unit = suppliedUnit || "pcs";
    if (!/^(?:pcs?|pieces?|each|ea)$/.test(unit)) return null;
    return `Got it—${amount} metal studs. What stud size do you need?`;
  }
  if (family === "wood_studs") {
    const unit = suppliedUnit || "pcs";
    if (!/^(?:pcs?|pieces?|each|ea)$/.test(unit)) return null;
    return `Got it—${amount} wood studs. What stud size do you need?`;
  }
  if (family === "screws") {
    const unit = suppliedUnit || (/boxes?/i.test(latestAvantia) ? "boxes" : "");
    if (!/^(?:boxes?|pcs?|pieces?|each|ea)$/.test(unit)) return null;
    const label = /^boxes?$/.test(unit)
      ? amount === 1
        ? "box"
        : "boxes"
      : amount === 1
        ? "screw"
        : "screws";
    return `Got it—${amount} ${label}. What screw length do you need?`;
  }
  if (family === "compound") {
    const unit =
      suppliedUnit || (/buckets?/i.test(latestAvantia) ? "buckets" : "");
    if (!/^buckets?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "bucket" : "buckets"} of joint compound. Can you confirm the compound type: 5-gallon all-purpose?`;
  }
  if (family === "paint") {
    const unit =
      suppliedUnit || (/gallons?/i.test(latestAvantia) ? "gallons" : "");
    if (!/^gallons?$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "gallon" : "gallons"} of paint. What paint color do you need?`;
  }
  if (family === "corner_bead") {
    const unit = suppliedUnit || "pcs";
    if (!/^(?:pcs?|pieces?|each|ea)$/.test(unit)) return null;
    return `Got it—${amount} ${amount === 1 ? "piece" : "pieces"} of corner bead. What corner bead type do you need?`;
  }
  return null;
}

export function smsCorrectionPendingQuestionReply(
  latestMessage: string,
  conversationText: string,
) {
  if (
    !/\b(?:correction|correct(?:ion)?|change (?:it|that)|make it|instead of|replace .* with)\b|\bnot\s+\d+(?:\.\d+)?\b/i.test(
      latestMessage,
    )
  )
    return null;
  const lines = conversationText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const latestAvantia =
    [...lines]
      .reverse()
      .find((line) => /^Avantia:/i.test(line))
      ?.replace(/^Avantia:\s*/i, "") || "";
  if (!latestAvantia) return null;
  const questions =
    latestAvantia
      .replace(/\b(in|ft)\.(?=[,;:?])/gi, "$1")
      .match(/[^?？]*[?？]/g) || [];
  const unresolved = questions
    .filter((question) => {
      const fields = inspectSmsQuestionStructure(question).fields;
      return fields.length > 0 && fields.some((field) => field !== "quantity");
    })
    .map((question) => question.trim());
  if (!unresolved.length) return null;
  const correctedValue = latestMessage
    .match(
      /(?:make it|change (?:it|that) to|instead of\s+\d+(?:\.\d+)?\s*(?:,|use)?|correction[:,]?|correct(?:ion)?[:,]?)\s*(\d+(?:\.\d+)?(?:\s*(?:pcs?|pieces?|sheets?|bags?|boxes?|buckets?|gallons?|sq\.?\s*ft|sf))?)/i,
    )?.[1]
    ?.trim();
  const acknowledgement = correctedValue
    ? `Got it—I’ll note ${correctedValue} for review.`
    : "Got it—I’ll note the correction for review.";
  return `${acknowledgement} ${unresolved[0]}`;
}

export function smsReplyParts(params: {
  reply: string;
  deterministicProductInquiry: boolean;
  exactListOnly?: boolean;
}) {
  const reply = params.reply.trim();
  if (!reply) return [];
  if (!params.deterministicProductInquiry) return [reply];
  return [
    ...new Set(
      reply
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ].slice(0, 2);
}

export function smsDeliveryDetailsQuestionReply(message: string) {
  if (/[\u0590-\u05ff]/.test(message)) return "מה כתובת המשלוח המלאה?";
  if (smsReplyLanguage(message) === "es")
    return "¿Cuál es la dirección completa de entrega?";
  return "What’s the full delivery address?";
}

export function smsUnansweredFollowUpText(params: {
  originalMessage: string;
  questionReply: string;
}) {
  const language = smsReplyLanguage(
    `${params.originalMessage}\n${params.questionReply}`,
  );
  const question = params.questionReply;
  const asksQuantity = REQUESTED_FIELD_PATTERNS.find(
    ({ field }) => field === "quantity",
  )?.pattern.test(question);
  const asksAddress = REQUESTED_FIELD_PATTERNS.find(
    ({ field }) => field === "address",
  )?.pattern.test(question);
  const asksTiming = REQUESTED_FIELD_PATTERNS.find(
    ({ field }) => field === "needed_by",
  )?.pattern.test(question);
  const asksSpecification =
    /\b(?:thickness|walls?\s+or\s+(?:a\s+)?ceilings?|type|size|length|gauge|grade|color)\b|\b5\s*\/\s*8\b|(?:עובי|קיר|תקרה|סוג|מידה|אורך|צבע)|\b(?:grosor|pared|techo|tipo|tama[nñ]o|largo|calibre|color)\b/i.test(
      question,
    );
  if (language === "he") {
    if (asksAddress && asksTiming) return "עדיין צריך עזרה עם פרטי המשלוח?";
    if (asksSpecification && asksQuantity)
      return "עדיין צריך עזרה בבחירת המפרט או הכמות?";
    if (asksQuantity) return "עדיין צריך עזרה עם הכמות?";
    if (asksAddress) return "עדיין צריך עזרה עם כתובת המשלוח?";
    if (asksTiming) return "עדיין צריך עזרה עם מועד האספקה?";
    return "עדיין צריך עזרה עם הבקשה?";
  }
  if (language === "es") {
    if (asksAddress && asksTiming)
      return "¿Aún necesita ayuda con los detalles de entrega?";
    if (asksSpecification && asksQuantity)
      return "¿Aún necesita ayuda con la especificación o la cantidad?";
    if (asksQuantity) return "¿Aún necesita ayuda con la cantidad?";
    if (asksAddress) return "¿Aún necesita ayuda con la dirección de entrega?";
    if (asksTiming) return "¿Aún necesita ayuda con la fecha necesaria?";
    return "¿Aún necesita ayuda con esto?";
  }
  if (asksAddress && asksTiming)
    return "Still need help with the delivery details?";
  const productFamilies = (value: string, allowGenericStuds = false) =>
    [
      /\b(?:roofing|shingles?)\b/i.test(value) ? "roofing" : null,
      /\bmetal\s+studs?\b/i.test(value) ? "metal_studs" : null,
      /\b(?:sheetrock|drywall)\b/i.test(value) ? "sheetrock" : null,
      /\bwood(?:en)?\s+studs?\b/i.test(value) ? "wood_studs" : null,
      allowGenericStuds &&
      /\bstuds?\b/i.test(value) &&
      !/\b(?:metal|wood(?:en)?)\s+studs?\b/i.test(value)
        ? "studs"
        : null,
    ].filter(Boolean) as string[];
  const questionFamilies = productFamilies(params.questionReply, true);
  const originalFamilies = productFamilies(params.originalMessage);
  const originalStudFamilies = originalFamilies.filter(
    (family) => family === "metal_studs" || family === "wood_studs",
  );
  const sheetrockSpecificationQuestion =
    /\b5\s*\/\s*8\b/i.test(params.questionReply) &&
    originalFamilies.includes("sheetrock");
  const questionFamily = sheetrockSpecificationQuestion
    ? "sheetrock"
    : questionFamilies.length === 1
      ? questionFamilies[0]
      : null;
  const productFamily =
    questionFamily === "studs" && originalStudFamilies.length === 1
      ? originalStudFamilies[0]
      : questionFamily && questionFamily !== "studs"
        ? questionFamily
        : questionFamilies.length === 0 && originalFamilies.length === 1
          ? originalFamilies[0]
          : null;
  if (asksSpecification && asksQuantity) {
    if (productFamily === "roofing")
      return "Still need help with the shingle type, color, or quantity?";
    if (productFamily === "metal_studs")
      return "Still need help with the stud size, length, gauge, or quantity?";
    if (productFamily === "sheetrock")
      return "Can you confirm 5/8 in., type, and quantity?";
    if (productFamily === "wood_studs")
      return "Still need help with the stud size or quantity?";
    return "Still need help with the product details or quantity?";
  }
  if (asksSpecification) {
    if (productFamily === "roofing")
      return "Still need help with the shingle type or color?";
    if (
      productFamily === "metal_studs" &&
      /\bsize\b/i.test(question) &&
      /\blength\b/i.test(question) &&
      /\bgauge\b/i.test(question)
    )
      return "Still need help with the stud size, length, or gauge?";
    if (productFamily === "metal_studs")
      return "Still need help with the stud length or gauge?";
    if (productFamily === "sheetrock") return "Can you confirm 5/8 in.?";
    if (productFamily === "wood_studs" && /\blength\b/i.test(question))
      return "Still need help with the stud size or length?";
    if (productFamily === "wood_studs")
      return "Still need help with the stud size?";
    return "Still need help with the product details?";
  }
  if (asksQuantity) return "Still need help with the quantity?";
  if (asksAddress) return "Still need help with the delivery address?";
  if (asksTiming) return "Still need help with when you need it?";
  return "Still need help with this?";
}

export function smsUnansweredFollowUpStageText(params: {
  originalMessage: string;
  questionReply: string;
  stage: number;
}) {
  if (params.stage <= 1) return params.questionReply.trim();
  const language = smsReplyLanguage(
    `${params.originalMessage}\n${params.questionReply}`,
  );
  if (params.stage === 2) {
    if (language === "he")
      return "עדיין רוצה שנמשיך להכין את בקשת החומרים שלך?";
    if (language === "es")
      return "¿Quiere que sigamos preparando su solicitud de materiales?";
    return "Do you still want help completing this material request?";
  }
  if (language === "he") return "להשאיר את בקשת החומרים הזאת פתוחה עבורך?";
  if (language === "es")
    return "¿Quiere que mantengamos abierta esta solicitud de materiales?";
  return "Should we keep this material request open for you?";
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
  if (
    params.safetyLevel !== "green" ||
    !params.gateAutoSafe ||
    params.requestComplete
  )
    return false;
  if (params.event === "correction" || params.event === "cancellation")
    return false;
  if (
    params.participantRole === "supplier" ||
    [
      "supplier",
      "correction",
      "cancellation",
      "sensitive",
      "follow_up",
    ].includes(params.intent)
  )
    return false;
  if (params.intent === "greeting" || isSmsBareGreeting(params.originalMessage))
    return false;
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
  if (!params.autoSafeActive)
    return "contact auto-safe mode is no longer active";
  if (params.hasLaterInbound) return "customer replied after the AI question";
  if (params.hasLaterOutbound)
    return "a human or later outbound reply was sent";
  if (params.requestClosed)
    return "the material request is already complete or closed";
  return null;
}

export function smsUnknownContextFallback() {
  return {
    reply: "Automatic reply unavailable — manager review required.",
    autoSafe: false,
    safetyReason:
      "The request context is not clear enough for a useful automatic reply.",
  } as const;
}

export type SmsMaterialReplyStep =
  | "quantity"
  | "address"
  | "address_and_needed_by"
  | "needed_by"
  | "complete"
  | "proposed";

export function resolveSmsMaterialReplyStep(params: {
  isMaterialRequest: boolean;
  hasGroundedItems: boolean;
  quantityKnown?: boolean;
  addressKnown: boolean;
  neededByKnown: boolean;
  proposedReply: string;
}): SmsMaterialReplyStep {
  if (!params.isMaterialRequest || !params.hasGroundedItems) return "proposed";
  if (params.quantityKnown === false) return "quantity";
  // The semantic model may identify an essential unresolved product choice
  // (for example paint finish or stud gauge). Resolve that before delivery
  // logistics instead of replacing the useful question with an address prompt.
  const proposedFields = inspectSmsQuestionStructure(
    params.proposedReply,
  ).fields;
  if (
    proposedFields.some((field) =>
      [
        "size",
        "thickness",
        "brand",
        "color",
        "finish",
        "specification",
      ].includes(field),
    )
  )
    return "proposed";
  if (!params.addressKnown && !params.neededByKnown)
    return "address_and_needed_by";
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
  const singular = /(?:ss|us)$/i.test(lower)
    ? lower
    : lower
        .replace(/ies$/i, "y")
        .replace(/(?:ches|shes|xes|zes|ses)$/i, (ending) => ending.slice(0, -2))
        .replace(/s$/i, "");
  return APPROVED_ITEM_SYNONYMS[singular] || singular;
}

function rawItemWords(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
}

function normalizedItemWords(value: string) {
  return rawItemWords(value).map(singularItemWord);
}

export function filterSmsExactListItems<
  T extends { name: string; quantity: number; unit: string },
>(items: T[], customerText: string) {
  const rawTextWords = rawItemWords(customerText);
  const textWords = new Set(rawTextWords.map(singularItemWord));
  return items.filter((item) => {
    const nameWords = normalizedItemWords(item.name).filter(
      (word) => !/^(?:the|and|with|for|de|con|את|של)$/.test(word),
    );
    const nameGrounded =
      nameWords.length > 0 && nameWords.every((word) => textWords.has(word));
    const numericQuantityGrounded = new RegExp(
      `(?:^|[^0-9])${String(item.quantity).replace(".", "\\.")}(?:[^0-9]|$)`,
    ).test(customerText);
    const lastNameWord = nameWords.at(-1) || "";
    const singularNameGrounded = rawTextWords.some(
      (word) =>
        singularItemWord(word) === lastNameWord && !/(?:s|es)$/i.test(word),
    );
    const ambiguousPackageUnit =
      /^(?:boxes?|bags?|buckets?|rolls?|bundles?|pallets?|packs?|cases?|cartons?)$/i.test(
        item.unit.trim(),
      );
    const safeDefaultOne =
      item.quantity === 1 && singularNameGrounded && !ambiguousPackageUnit;
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
export function formatSmsRequestSummaryItem(item: {
  name: string;
  quantity: number;
  unit: string;
  quantityExplicit?: boolean;
}) {
  if (item.quantityExplicit === false)
    return `• Quantity not specified — ${item.name.trim()}`;
  const quantity =
    Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  const rawUnit = item.unit.trim() || "each";
  const singularUnit = rawUnit.toLowerCase().replace(/s$/i, "");
  const displayUnit =
    quantity === 1
      ? rawUnit
      : SMS_SUMMARY_UNIT_PLURALS[singularUnit] || rawUnit;
  const escapedUnit = singularUnit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const packagedName = item.name
    .trim()
    .match(
      new RegExp(
        `^(.+?),\\s*((?:one|two|three|four|five|\\d+(?:\\.\\d+)?)[-\\s](?:gallon|gal|quart|qt|liter|litre|ounce|oz|pound|lb))\\s+${escapedUnit}s?$`,
        "i",
      ),
    );
  if (packagedName)
    return `• ${quantity} ${packagedName[2]} ${displayUnit} — ${packagedName[1].trim()}`;
  return `• ${quantity} ${displayUnit} — ${item.name.trim()}`;
}

function exampleTokens(value: string) {
  return new Set(value.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
}

export function rankSmsReplyExamples<T extends SmsReplyExample>(
  examples: T[],
  params: { intent: SmsReplyIntent; language: string; message: string },
  limit = 3,
) {
  const queryTokens = exampleTokens(params.message);
  return examples
    .map((example, index) => {
      const overlap = [...exampleTokens(example.customer_message)].filter(
        (token) => queryTokens.has(token),
      ).length;
      const score =
        (example.intent === params.intent
          ? 100
          : example.intent === "general"
            ? 20
            : 0) +
        (example.language === params.language
          ? 30
          : example.language === null
            ? 5
            : 0) +
        overlap * 4;
      return { example, score, index };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ example }) => example);
}
