export type PhoneIntakeDashboardDestination = "david" | "carlos";

function compact(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function trustedPhoneIntakeExternalMessageId(activityId: string) {
  return `quo:${activityId.trim()}`;
}

export function trustedPhoneDashboardTaskKey(intakeId: string) {
  return `phone-intake-${intakeId.trim()}`;
}

export function trustedPhoneAddCommandText(value: string | null | undefined) {
  const message = compact(value);
  const commandIndex = message.search(/\badd\b/iu);
  return commandIndex >= 0 ? message.slice(commandIndex) : null;
}

export function isExplicitTrustedPhoneAddCommand(
  value: string | null | undefined,
) {
  return trustedPhoneAddCommandText(value) !== null;
}

export function trustedPhoneIntakeDestination(
  value: string | null | undefined,
): PhoneIntakeDashboardDestination {
  const message = compact(value);
  const command = trustedPhoneAddCommandText(message);
  if (!command) return "david";
  const explicitlyForCarlos =
    /^add\b(?:\s+(?:task|to[\s-]?do))?\s+to\s+carlos\b/iu.test(command) ||
    /\b(?:assign|give|route|send)\s+(?:this|it|the\s+task)?\s*to\s+carlos\b/iu.test(
      command,
    ) ||
    /\bto\s+carlos\b[\s.!?,-]*(?:$|follow-up\s+message:)/iu.test(command);
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
  imageCount?: number;
  attachmentCount?: number;
  priorMessageText: string | null | undefined;
  priorMissingCount: number;
  priorAutoRouted: boolean;
}) {
  if (!isExplicitTrustedPhoneAddCommand(input.priorMessageText)) return false;
  if (isExplicitTrustedPhoneAddCommand(input.body)) return false;
  if (isTrustedPhoneIntakeContinuation(input.body)) return true;
  const attachmentCount = input.attachmentCount ?? input.imageCount ?? 0;
  const hasAttachments =
    Number.isFinite(attachmentCount) && attachmentCount > 0;
  if (!hasAttachments) return false;
  return (
    input.priorAutoRouted || input.priorMissingCount > 0 || !compact(input.body)
  );
}
