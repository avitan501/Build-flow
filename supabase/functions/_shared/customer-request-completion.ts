export function customerFinishedMaterialList(message: string) {
  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim();
  return /^(?:no|nope|done|finished|nothing else|that'?s all|that is all|all set|no more|לא|לא תודה|זה הכל|סיימתי|אין עוד|no m[aá]s|nada m[aá]s|eso es todo|termin[eé])$/iu.test(
    normalized,
  );
}

export function customerWantsAnotherItem(message: string) {
  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim();
  return /^(?:yes|yeah|yep|כן|si|s[ií])$/iu.test(normalized);
}

export function additionalItemsQuestion(message: string) {
  if (/\p{Script=Hebrew}/u.test(message))
    return "האם צריך להוסיף עוד משהו לרשימה?";
  if (
    /\b(?:hola|gracias|necesito|precio|entrega|direcci[oó]n|s[ií]|no m[aá]s|nada m[aá]s|eso es todo)\b/iu.test(
      message,
    )
  )
    return "¿Necesita agregar algo más a la lista?";
  return "Do you need anything else on this list?";
}

export function additionalItemPrompt(message: string) {
  if (/\p{Script=Hebrew}/u.test(message))
    return "כן—שלח את הפריט הנוסף עם הכמות.";
  if (
    /\b(?:hola|gracias|necesito|precio|entrega|direcci[oó]n|s[ií]|no m[aá]s|nada m[aá]s|eso es todo)\b/iu.test(
      message,
    )
  )
    return "Sí—envíe el artículo adicional y la cantidad.";
  return "Yes—send the additional item and quantity.";
}

export function deliveryAddressQuestion(message: string) {
  if (/\p{Script=Hebrew}/u.test(message)) return "מה כתובת המשלוח המלאה?";
  if (
    /\b(?:hola|gracias|necesito|precio|entrega|direcci[oó]n|s[ií]|no m[aá]s|nada m[aá]s|eso es todo)\b/iu.test(
      message,
    )
  )
    return "¿Cuál es la dirección de entrega completa?";
  return "What is the full delivery address?";
}

export function activeRequestUpdateReply(
  message: string,
  update: "item" | "correction" | "address",
) {
  if (/\p{Script=Hebrew}/u.test(message)) {
    if (update === "address")
      return "הכתובת עודכנה באותה בקשה. צריך להוסיף עוד משהו?";
    if (update === "correction")
      return "התיקון נוסף לאותה בקשה לבדיקה. צריך לשנות עוד משהו?";
    return "הפריט נוסף לאותה בקשה לבדיקה. צריך להוסיף עוד משהו?";
  }
  if (
    /\b(?:hola|gracias|necesito|precio|entrega|direcci[oó]n|s[ií]|agrega|agregar|a[nñ]ade|corrige|corregir|cambia|cambiar)\b/iu.test(
      message,
    )
  ) {
    if (update === "address")
      return "La dirección se actualizó en la misma solicitud. ¿Necesita agregar algo más?";
    if (update === "correction")
      return "La corrección se agregó a la misma solicitud para revisión. ¿Necesita cambiar algo más?";
    return "El artículo se agregó a la misma solicitud para revisión. ¿Necesita agregar algo más?";
  }
  if (update === "address")
    return "The address was updated on the same request. Do you need anything else?";
  if (update === "correction")
    return "The correction was added to the same request for review. Do you need to change anything else?";
  return "The item was added to the same request for review. Do you need anything else?";
}

export function activeRequestUpdateKind(input: {
  event: string;
  hasAddress: boolean;
  looksLikeMaterialList: boolean;
}): "item" | "correction" | "address" {
  if (
    input.hasAddress &&
    !input.looksLikeMaterialList &&
    input.event !== "correction"
  )
    return "address";
  if (input.event === "correction") return "correction";
  return "item";
}

export function managerRequestAcceptsCustomerUpdates(status: string) {
  return status !== "closed";
}
