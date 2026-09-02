// A Sentry DSN is an intentionally public ingest address. Keeping the Avantia
// project DSN here makes browser and server error delivery independent of a
// stale local Vercel link; it does not grant access to read issues or settings.
export const AVANTIA_SENTRY_DSN =
  "https://45b2da8e9e345f6a4e9bea6d53e3c952@o4512014536343552.ingest.us.sentry.io/4512014542110720";

export function getSentryDsn() {
  return (
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    AVANTIA_SENTRY_DSN
  );
}

export function getBrowserSentryDsn() {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || AVANTIA_SENTRY_DSN;
}

export function getSentryEnvironment() {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function getSentryRelease() {
  return (
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.SENTRY_RELEASE ||
    undefined
  );
}

export function isSentryEnabled(
  dsn: string | undefined,
  environment: string,
  allowTestTransport = false,
) {
  return Boolean(dsn) && (environment === "production" || allowTestTransport);
}
