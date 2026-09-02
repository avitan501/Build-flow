export type CommunicationOutboxChannel = "sms" | "whatsapp" | "email";
export type CommunicationOutboxStatus =
  | "pending"
  | "claimed"
  | "sending"
  | "retry_wait"
  | "accepted"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "bounced"
  | "complained"
  | "ambiguous"
  | "needs_review"
  | "cancelled";

export type ProviderOutcome = {
  kind: "accepted" | "retry" | "terminal" | "ambiguous";
  status: CommunicationOutboxStatus;
  errorCode?: string;
};

export function classifyProviderOutcome(httpStatus: number): ProviderOutcome {
  if (httpStatus >= 200 && httpStatus < 300)
    return { kind: "accepted", status: "accepted" };
  if (httpStatus === 429)
    return { kind: "retry", status: "retry_wait", errorCode: "rate_limited" };
  if ([400, 401, 402, 403, 404, 409, 413, 415, 422].includes(httpStatus))
    return { kind: "terminal", status: "failed", errorCode: "provider_rejected" };
  return {
    kind: "ambiguous",
    status: "ambiguous",
    errorCode: "provider_outcome_unknown",
  };
}

export function attachmentCapability(
  channel: CommunicationOutboxChannel,
  count: number,
) {
  if (count === 0) return { supported: true as const };
  if (channel === "sms")
    return {
      supported: false as const,
      reason: "quo_api_does_not_support_attachments" as const,
    };
  if (channel === "whatsapp" && count > 1)
    return {
      supported: false as const,
      reason: "two_chat_one_attachment_per_message" as const,
    };
  return { supported: true as const };
}

export function safeRetryDelaySeconds(attemptCount: number, retryAfter?: number) {
  if (Number.isFinite(retryAfter) && retryAfter && retryAfter > 0)
    return Math.max(5, Math.min(900, Math.round(retryAfter)));
  return Math.min(900, 10 * 2 ** Math.max(0, Math.min(6, attemptCount - 1)));
}
