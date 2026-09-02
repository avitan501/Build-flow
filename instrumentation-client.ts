import * as Sentry from "@sentry/nextjs";
import { markPrivateRouteTransition } from "@/lib/analytics/private-performance";
import {
  getBrowserSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  isSentryEnabled,
} from "@/lib/monitoring/sentry-config";
import {
  privacySafeSentryIntegrations,
  sentryPrivacyOptions,
} from "@/lib/monitoring/sentry-privacy";

const sentryDsn = getBrowserSentryDsn();
const sentryEnvironment = getSentryEnvironment();
const sentryRelease = getSentryRelease();
const sentryEnabled = isSentryEnabled(
  sentryDsn,
  sentryEnvironment,
  process.env.NEXT_PUBLIC_SENTRY_TEST_MODE === "true",
);

if (sentryEnabled) {
  try {
    Sentry.init({
      ...sentryPrivacyOptions,
      dsn: sentryDsn,
      enabled: true,
      environment: sentryEnvironment,
      ...(sentryRelease ? { release: sentryRelease } : {}),
      initialScope: {
        tags: { application: "avantia-build", runtime: "browser" },
      },
      integrations: privacySafeSentryIntegrations,
    });
  } catch {
    // Error monitoring must never prevent Avantia from loading.
  }
}

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  markPrivateRouteTransition(url, navigationType);
  Sentry.captureRouterTransitionStart(url, navigationType);
}
