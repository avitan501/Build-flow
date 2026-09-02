import type { ErrorEvent } from "@sentry/nextjs";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const LONG_TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g;
const GENERIC_ERROR_MESSAGE = "Unexpected application error";
const DYNAMIC_RESOURCE_ROUTES = [
  "/owner/materials/requests",
  "/admin/documents",
  "/admin/quote-comparison",
  "/admin/supplier-approvals",
  "/admin/vendors",
  "/admin/customers",
  "/admin/users",
  "/projects",
  "/orders",
  "/requests",
] as const;
const DISABLED_INTEGRATIONS = new Set([
  "Breadcrumbs",
  "BrowserSession",
  "Console",
  "ConversationId",
  "ContextLines",
  "CultureContext",
  "HttpContext",
  "LocalVariables",
  "ProcessSession",
]);
const ALLOWED_TAGS = new Set([
  "application",
  "feature",
  "operation",
  "provider",
  "runtime",
  "safe_code",
]);

export function redactPrivateText(value: string) {
  return value
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]")
    .replace(UUID_PATTERN, "[redacted-id]")
    .replace(LONG_TOKEN_PATTERN, "[redacted-token]");
}

function pathnameOnly(value: string | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value, "https://build.avantiap.com");
    return url.pathname;
  } catch {
    return redactPrivateText(value.split(/[?#]/, 1)[0] ?? value);
  }
}

function safeRoute(value: string | undefined) {
  const pathname = pathnameOnly(value);
  if (!pathname) return undefined;

  for (const prefix of DYNAMIC_RESOURCE_ROUTES) {
    if (pathname.startsWith(`${prefix}/`)) {
      const rest = pathname.slice(prefix.length + 1).split("/");
      const trailing = rest.slice(1).join("/");
      return `${prefix}/:id${trailing ? `/${strictRouteSegments(trailing)}` : ""}`;
    }
  }

  return strictRouteSegments(pathname);
}

function strictRouteSegments(value: string) {
  return value
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (segment.startsWith(":")) return segment;
      if (/^\[[.\w-]+\]$/.test(segment)) return segment;
      if (/^[a-z][a-z-]{0,31}$/i.test(segment)) return segment;
      return ":segment";
    })
    .join("/");
}

function safeStackPath(value: string | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return redactPrivateText(
      `${url.origin === "null" ? "" : url.origin}${url.pathname}`,
    );
  } catch {
    return redactPrivateText(value.split(/[?#]/, 1)[0] ?? value);
  }
}

function safeExceptionType(value: string | undefined) {
  return value && /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(value)
    ? value
    : "Error";
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  const sanitized: ErrorEvent = {
    ...event,
    breadcrumbs: undefined,
    contexts: undefined,
    extra: undefined,
    fingerprint: undefined,
    server_name: undefined,
    tags: event.tags
      ? Object.fromEntries(
          Object.entries(event.tags).filter(([key]) =>
            ALLOWED_TAGS.has(key),
          ),
        )
      : undefined,
    transaction: safeRoute(event.transaction),
    threads: undefined,
    user: undefined,
  };

  if (event.message) {
    sanitized.message = GENERIC_ERROR_MESSAGE;
  }

  if (event.logentry?.message) {
    sanitized.logentry = {
      ...event.logentry,
      message: GENERIC_ERROR_MESSAGE,
      params: undefined,
    };
  }

  if (event.exception?.values) {
    sanitized.exception = {
      ...event.exception,
      values: event.exception.values.map((exception) => ({
        ...exception,
        mechanism: exception.mechanism
          ? { ...exception.mechanism, data: undefined }
          : undefined,
        stacktrace: exception.stacktrace
          ? {
              ...exception.stacktrace,
              frames: exception.stacktrace.frames?.map((frame) => ({
                ...frame,
                abs_path: safeStackPath(frame.abs_path),
                context_line: undefined,
                filename: safeStackPath(frame.filename),
                post_context: undefined,
                pre_context: undefined,
                vars: undefined,
              })),
            }
          : undefined,
        type: safeExceptionType(exception.type),
        value: exception.value ? GENERIC_ERROR_MESSAGE : exception.value,
      })),
    };
  }

  if (event.request) {
    sanitized.request = {
      method: event.request.method,
    };
  }

  return sanitized;
}

export function privacySafeSentryIntegrations<T extends { name: string }>(
  defaultIntegrations: T[],
): T[] {
  return defaultIntegrations.filter(
    (integration) => !DISABLED_INTEGRATIONS.has(integration.name),
  );
}

export const sentryPrivacyOptions = {
  beforeBreadcrumb: () => null,
  beforeSend: sanitizeSentryEvent,
  dataCollection: {
    cookies: false,
    databaseQueryData: false,
    frameContextLines: 0,
    genAI: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
    httpBodies: [],
    httpHeaders: { request: false, response: false },
    stackFrameVariables: false,
    urlQueryParams: false,
    userInfo: false,
  },
  enableLogs: false,
  enableMetrics: false,
  enhanceFetchErrorMessages: false as const,
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,
  sendClientReports: false,
  sendDefaultPii: false,
  tracesSampleRate: 0,
};
