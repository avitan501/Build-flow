import * as Sentry from "@sentry/nextjs";

type OperationalErrorContext = {
  feature: string;
  operation: string;
  provider?: string;
  safeCode: string;
};

function safeTag(value: string | undefined, fallback = "none") {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return normalized.slice(0, 64) || fallback;
}

export function shouldCaptureOperationalStatus(status: number) {
  return Number.isInteger(status) && status >= 500 && status <= 599;
}

export async function captureOperationalError(
  cause: unknown,
  context: OperationalErrorContext,
) {
  const error =
    cause instanceof Error
      ? cause
      : new Error(`Operational failure: ${safeTag(context.safeCode, "unknown")}`);

  const eventId = Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTags({
      feature: safeTag(context.feature),
      operation: safeTag(context.operation),
      provider: safeTag(context.provider),
      safe_code: safeTag(context.safeCode, "unknown"),
    });
    return Sentry.captureException(error);
  });

  await Sentry.flush(2_000);
  return eventId;
}
