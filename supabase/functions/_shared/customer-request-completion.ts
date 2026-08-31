export function customerFinishedMaterialList(message: string) {
  const normalized = message.trim().toLowerCase().replace(/[.!?]+$/g, "").trim();
  return /^(?:no|nope|done|finished|nothing else|that'?s all|that is all|all set|no more|לא|לא תודה|זה הכל|סיימתי|אין עוד|no m[aá]s|nada m[aá]s|eso es todo|termin[eé])$/iu.test(normalized);
}

export function customerWantsAnotherItem(message: string) {
  const normalized = message.trim().toLowerCase().replace(/[.!?]+$/g, "").trim();
  return /^(?:yes|yeah|yep|כן|si|s[ií])$/iu.test(normalized);
}

export function additionalItemsQuestion(message: string) {
  if (/\p{Script=Hebrew}/u.test(message)) return "האם צריך להוסיף עוד משהו לרשימה?";
  if (/\b(?:hola|gracias|necesito|precio|entrega|direcci[oó]n|s[ií])\b/iu.test(message)) return "¿Necesita agregar algo más a la lista?";
  return "Do you need anything else on this list?";
}

export function additionalItemPrompt(message: string) {
  if (/\p{Script=Hebrew}/u.test(message)) return "כן—שלח את הפריט הנוסף עם הכמות.";
  if (/\b(?:hola|gracias|necesito|precio|entrega|direcci[oó]n|s[ií])\b/iu.test(message)) return "Sí—envíe el artículo adicional y la cantidad.";
  return "Yes—send the additional item and quantity.";
}

export function deliveryAddressQuestion(message: string) {
  if (/\p{Script=Hebrew}/u.test(message)) return "מה כתובת המשלוח המלאה?";
  if (/\b(?:hola|gracias|necesito|precio|entrega|direcci[oó]n|s[ií])\b/iu.test(message)) return "¿Cuál es la dirección de entrega completa?";
  return "What is the full delivery address?";
}
