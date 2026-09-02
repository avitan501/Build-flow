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

function safeDatabaseDiagnostics(cause: unknown) {
  if (!cause || typeof cause !== "object") return {};
  const record = cause as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" && /^[A-Z0-9]{2,16}$/i.test(record.code)
    ? record.code.toLowerCase()
    : undefined;
  const message = typeof record.message === "string" ? record.message : "";
  const constraint = message.match(/constraint\s+["']([a-z0-9_]{1,63})["']/i)?.[1];
  return {
    ...(code ? { database_code: code } : {}),
    ...(constraint ? { database_constraint: constraint.toLowerCase() } : {}),
  };
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
      ...safeDatabaseDiagnostics(cause),
    });
    return Sentry.captureException(error);
  });

  await Sentry.flush(2_000);
  return eventId;
}
