export type CommunicationHealth =
  | "Active"
  | "Waiting on Customer"
  | "Waiting on Avantia"
  | "Needs Carlos"
  | "At Risk"
  | "Do Not Contact"
  | "Completed"

export type CommunicationAction =
  | "Send welcome"
  | "Request material list"
  | "Review material list"
  | "Review supplier reply"
  | "Follow up"
  | "Resolve a problem"
  | "Call customer"
  | "Reply"
  | "Wait"
  | "Do not contact"

export type CommunicationActionMessage = {
  direction: "incoming" | "outgoing" | "internal" | null
  body?: string | null
  summary?: string | null
  transcript?: string | null
  status?: string | null
  occurredAt: string
}

export type CommunicationNextAction = {
  health: CommunicationHealth
  action: CommunicationAction
  reason: string
  suggestedMessage: string
}

export type CommunicationTemplate = {
  id: "welcome" | "request_list" | "received" | "missing_detail" | "quote_follow_up" | "delivery" | "supplier_quote" | "supplier_follow_up"
  label: string
  purpose: "service" | "quote" | "delivery" | "supplier"
  message: string
}

const STOP_WORDS = /^(?:stop|stopall|unsubscribe|cancel|end|quit|remove me|do not contact|don't contact|parar|detener|cancelar|no me escriba|no contactar|הפסק|תפסיק|אל תיצור קשר)(?:\s|$)/i
const PROBLEM_WORDS = /(?:\b(?:problem|issue|wrong|missing|damag(?:e|ed)|broken|late|delay(?:ed)?|never arrived|cancel(?:led)?|refund|complaint|problema|incorrecto|falta|faltante|dañad[oa]|roto|tarde|retrasad[oa]|reembolso|queja)\b|בעיה|חסר|שבור|איחור|לא הגיע)/i
const MATERIAL_WORDS = /(?:\b(?:qty|quantity|quote|price|material|sheetrock|drywall|lumber|door|window|pipe|valve|tile|floor|roof|paint|cantidad|cotizaci[oó]n|precio|materiales?|panel de yeso|madera|puerta|ventana|tuber[ií]a|v[aá]lvula|piso|techo|pintura)\b|כמות|הצעת מחיר|מחיר|חומרים?)/i

function messageText(message: CommunicationActionMessage) {
  return String(message.body || message.transcript || message.summary || "").trim()
}

function firstName(name: string) {
  const clean = name.trim()
  if (!clean || /unknown|ambiguous/i.test(clean)) return ""
  return clean.split(/\s+/)[0]
}

function greeting(name: string) {
  const first = firstName(name)
  return first ? `Hi ${first}, ` : "Hi, "
}

export function communicationTemplates(name: string, kind: "customer" | "lead" | "supplier" | "contact"): CommunicationTemplate[] {
  const hello = greeting(name)
  if (kind === "supplier") {
    return [
      { id: "supplier_quote", label: "Request quote", purpose: "supplier", message: `${hello}please send your best price, availability, and lead time for the attached material list. Thank you.` },
      { id: "supplier_follow_up", label: "Follow up", purpose: "supplier", message: `${hello}following up on the material quote. Please let me know when pricing will be available. Thank you.` },
      { id: "received", label: "Received", purpose: "supplier", message: "Received, thank you. I’m reviewing the quote now." },
    ]
  }
  return [
    { id: "welcome", label: "Welcome", purpose: "service", message: `${hello}this is Carlos from Avantia Build. Send any material list, photo, plan, link, or current quote. We’ll compare options and help you order.` },
    { id: "request_list", label: "Request list", purpose: "service", message: `${hello}send whatever you have—a list, photo, plan, product link, or current quote. I’ll organize it and let you know if anything else is needed.` },
    { id: "received", label: "Received", purpose: "service", message: "Received, thank you. I’m reviewing the items now and will let you know if one detail is missing." },
    { id: "missing_detail", label: "Missing detail", purpose: "service", message: `${hello}I need one detail before I can price this correctly: [add the missing detail].` },
    { id: "quote_follow_up", label: "Quote follow-up", purpose: "quote", message: `${hello}did you get a chance to review the estimate? Reply A) approve, B) change something, or C) not ready.` },
    { id: "delivery", label: "Delivery update", purpose: "delivery", message: `${hello}your delivery update is ready: [add the verified status and time].` },
  ]
}

export function recommendCommunicationAction(input: {
  name: string
  kind: "customer" | "lead" | "supplier" | "contact"
  messages: CommunicationActionMessage[]
  hasMaterialRequest: boolean
  materialRequestStatus?: string | null
  now?: Date
}): CommunicationNextAction {
  const ordered = [...input.messages]
    .filter((message) => message.occurredAt && Number.isFinite(Date.parse(message.occurredAt)))
    .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt))
  const latest = ordered.at(-1)
  const latestText = latest ? messageText(latest) : ""
  const templates = communicationTemplates(input.name, input.kind)
  const template = (id: CommunicationTemplate["id"]) => templates.find((item) => item.id === id)?.message || ""
  const requestComplete = /complete|delivered|closed|approved/i.test(String(input.materialRequestStatus || ""))

  if (latest?.direction === "incoming" && STOP_WORDS.test(latestText)) {
    return { health: "Do Not Contact", action: "Do not contact", reason: "The latest customer message contains an opt-out request.", suggestedMessage: "" }
  }
  if (requestComplete) {
    return { health: "Completed", action: "Wait", reason: "The linked request is complete. No follow-up is needed.", suggestedMessage: "" }
  }
  if (latest && ["failed", "undelivered"].includes(String(latest.status || "").toLowerCase())) {
    return { health: "Needs Carlos", action: "Call customer", reason: "The latest outgoing message was not delivered.", suggestedMessage: "" }
  }
  if (latest?.direction === "incoming" && PROBLEM_WORDS.test(latestText)) {
    return { health: "Needs Carlos", action: "Resolve a problem", reason: "The latest message reports a possible order or delivery problem.", suggestedMessage: `${greeting(input.name)}I received your message. I’m checking this now and will update you with the next step.` }
  }
  if (latest?.direction === "incoming" && input.kind === "supplier") {
    return { health: "Waiting on Avantia", action: "Review supplier reply", reason: "A supplier replied and is waiting for Avantia.", suggestedMessage: template("received") }
  }
  if (latest?.direction === "incoming" && !input.hasMaterialRequest && MATERIAL_WORDS.test(latestText)) {
    return { health: "Waiting on Avantia", action: "Review material list", reason: "The latest message appears to contain materials but is not linked to a request.", suggestedMessage: template("received") }
  }
  if (latest?.direction === "incoming") {
    return { health: "Waiting on Avantia", action: "Reply", reason: "The customer sent the latest message and is waiting for a response.", suggestedMessage: template("received") }
  }
  if (!latest) {
    return { health: "Active", action: "Send welcome", reason: "No conversation has started yet.", suggestedMessage: template(input.kind === "supplier" ? "supplier_quote" : "welcome") }
  }
  const ageMs = (input.now || new Date()).getTime() - Date.parse(latest.occurredAt)
  if (latest.direction === "outgoing" && ageMs >= 3 * 24 * 60 * 60 * 1000) {
    return { health: "At Risk", action: "Follow up", reason: "Avantia sent the last message at least three days ago and no reply is recorded.", suggestedMessage: template(input.kind === "supplier" ? "supplier_follow_up" : input.hasMaterialRequest ? "quote_follow_up" : "request_list") }
  }
  if (latest.direction === "outgoing") {
    return { health: "Waiting on Customer", action: "Wait", reason: "Avantia sent the latest message; no response is recorded yet.", suggestedMessage: "" }
  }
  return { health: "Active", action: "Reply", reason: "The conversation is active.", suggestedMessage: template("received") }
}
