export type RequestCommunicationDeliveryStatus =
  "accepted" | "delivered" | "read" | "failed";

export function requestCommunicationDeliveryTransition(
  current: RequestCommunicationDeliveryStatus,
  incoming: "delivered" | "read" | "failed",
) {
  if (incoming === "failed") {
    return current === "accepted"
      ? { status: "failed" as const, countQuestion: false }
      : { status: current, countQuestion: false };
  }
  if (current === "read")
    return { status: "read" as const, countQuestion: false };
  if (current === "delivered")
    return {
      status: incoming === "read" ? ("read" as const) : ("delivered" as const),
      countQuestion: false,
    };
  return {
    status: incoming,
    countQuestion: true,
  };
}

export function deliveredQuestionRetryAllowed(
  attempts: Record<string, number> | null | undefined,
  questionKeys: string[],
  maximumDeliveredAttempts = 2,
) {
  return !questionKeys.some(
    (key) =>
      Math.max(0, Number(attempts?.[key]) || 0) >= maximumDeliveredAttempts,
  );
}

export function questionSlotsFromReply(reply: string) {
  const slots: string[] = [];
  if (
    /\b(?:how many|how much|quantity|cu[aá]nt[oa]s?|cantidad)\b|(?:כמה|כמות)/iu.test(
      reply,
    )
  )
    slots.push("quantity");
  if (
    /\b(?:full )?(?:delivery )?address\b|direcci[oó]n (?:completa|de entrega)|(?:כתובת (?:מלאה|המשלוח))/iu.test(
      reply,
    )
  )
    slots.push("delivery_address");
  if (
    /\b(?:when|needed by|need (?:it|this|them) by|delivery date|cu[aá]ndo|fecha)\b|(?:מתי|תאריך)/iu.test(
      reply,
    )
  )
    slots.push("needed_by");
  if (/\b(?:type|kind|tipo|clase)\b|(?:סוג)/iu.test(reply)) slots.push("type");
  if (
    /\b(?:panel (?:brand|manufacturer|compatibility)|manufacturer of (?:the )?panel|marca (?:tiene )?(?:el |del )?panel|fabricante (?:del )?panel|compatibilidad (?:del )?panel|square d|homeline|qo)\b|(?=.*(?:לוח))(?=.*(?:יצרן|מותג|סדרה))/iu.test(
      reply,
    )
  )
    slots.push("panel_compatibility");
  else if (
    /\b(?:sheet size|dimensions?|tama[nñ]o (?:de la )?hoja|dimensiones)\b|(?:גודל (?:הלוח|הדף)|מידות)/iu.test(
      reply,
    )
  )
    slots.push("sheet_size");
  else if (
    /\b(?:substrate|surface|subfloor|sustrato|superficie|base)\b|(?:תשתית|משטח)/iu.test(
      reply,
    )
  )
    slots.push("application_surface");
  else if (
    /\b(?:size|length|thickness|gauge|model|tama[nñ]o|largo|espesor|calibre|modelo)\b|(?:גודל|אורך|עובי|דגם)/iu.test(
      reply,
    )
  )
    slots.push("specification");
  if (/\b(?:color|finish|acabado)\b|(?:צבע|גימור)/iu.test(reply))
    slots.push("finish");
  if (/anything else|something else|algo m[aá]s|עוד משהו/iu.test(reply))
    slots.push("additional_items");
  if (slots.length === 0 && /[?¿]|(?:מה|איזה|האם)/u.test(reply))
    slots.push("clarification");
  return [...new Set(slots)].slice(0, 3);
}
