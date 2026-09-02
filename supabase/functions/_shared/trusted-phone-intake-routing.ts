export type PhoneIntakeDashboardDestination = "david" | "carlos";

function compact(value: string | null | undefined) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function isExplicitTrustedPhoneAddCommand(
  value: string | null | undefined,
) {
  return /^add\b/iu.test(compact(value));
}

export function trustedPhoneIntakeDestination(
  value: string | null | undefined,
): PhoneIntakeDashboardDestination {
  const message = compact(value);
  if (!isExplicitTrustedPhoneAddCommand(message)) return "david";
  const explicitlyForCarlos =
    /^add\b(?:\s+(?:task|to[\s-]?do))?\s+to\s+carlos\b/iu.test(message) ||
    /\b(?:assign|give|route|send)\s+(?:this|it|the\s+task)?\s*to\s+carlos\b/iu.test(
      message,
    ) ||
    /\bto\s+carlos\b[\s.!?,-]*(?:$|follow-up\s+message:)/iu.test(message);
  return explicitlyForCarlos ? "carlos" : "david";
}

export function stripCarlosRoutingPhrase(value: string) {
  return value
    .replace(/^\s*to\s+carlos\b[\s,:;-]*/iu, "")
    .replace(/[\s,:;-]+to\s+carlos\b[\s.!?]*$/iu, "")
    .trim();
}

export function isTrustedPhoneIntakeContinuation(
  value: string | null | undefined,
) {
  const message = compact(value);
  if (!message || isExplicitTrustedPhoneAddCommand(message)) return false;
  return (
    /^(?:and|also|plus|his|her|their|the\s+(?:number|phone|email|address)|use\s+this|this\s+is|add\s+him|add\s+her|same\s+(?:person|request)|here(?:'s|\s+is)\s+the\s+(?:photo|picture|document))/iu.test(
      message,
    ) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(message) ||
    /^\+?[\d().\s-]{7,}$/u.test(message)
  );
}

export function shouldJoinTrustedPhoneIntakeFollowUp(input: {
  body: string | null | undefined;
  imageCount: number;
  priorMessageText: string | null | undefined;
  priorMissingCount: number;
  priorAutoRouted: boolean;
}) {
  if (!isExplicitTrustedPhoneAddCommand(input.priorMessageText)) return false;
  if (isExplicitTrustedPhoneAddCommand(input.body)) return false;
  if (isTrustedPhoneIntakeContinuation(input.body)) return true;
  const hasImages = Number.isFinite(input.imageCount) && input.imageCount > 0;
  if (!hasImages) return false;
  return (
    input.priorAutoRouted ||
    input.priorMissingCount > 0 ||
    !compact(input.body)
  );
}
