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

export type SafeProviderFailure = {
  errorCode: string;
  message: string;
};

const WHATSAPP_WINDOW_MESSAGE =
  "This WhatsApp conversation is outside the 24-hour reply window. Ask the recipient to message Avantia first or use an approved WhatsApp template.";

/**
 * Converts a Meta response into an operator-safe error. Provider text is never
 * persisted verbatim: it may contain recipient data or other sensitive detail.
 */
export function safeWhatsAppProviderFailure(
  payload: Record<string, unknown>,
): SafeProviderFailure {
  const error = payload.error && typeof payload.error === "object"
    ? payload.error as Record<string, unknown>
    : {};
  const code = Number(error.code);
  const subcode = Number(error.error_subcode);
  const providerText = [
    typeof error.message === "string" ? error.message : "",
    error.error_data && typeof error.error_data === "object" &&
        typeof (error.error_data as Record<string, unknown>).details === "string"
      ? String((error.error_data as Record<string, unknown>).details)
      : "",
  ].join(" ");
  const outsideWindow = code === 131047 ||
    /24\s*-?\s*hour|re-?engagement|outside\s+(?:the\s+)?(?:customer service\s+)?window|template\s+(?:is\s+)?required/i.test(
      providerText,
    );
  if (outsideWindow) {
    return {
      errorCode: "meta_131047",
      message: WHATSAPP_WINDOW_MESSAGE,
    };
  }
  const safeCode = Number.isInteger(code) && code > 0
    ? `meta_${code}${Number.isInteger(subcode) && subcode > 0 ? `_${subcode}` : ""}`
        .slice(0, 100)
    : "meta_rejected";
  return {
    errorCode: safeCode,
    message: Number.isInteger(code) && code > 0
      ? `WhatsApp rejected this message (Meta code ${code}). Check the recipient number, approved templates, and business-number connection.`
      : "WhatsApp rejected this message. Check the recipient number, approved templates, and business-number connection.",
  };
}

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
