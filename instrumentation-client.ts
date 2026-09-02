import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

import {
  POSTHOG_API_HOST,
  POSTHOG_PROJECT_TOKEN,
} from "@/lib/analytics/posthog-config";
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

const blockedMetadata = new Set([
  "$current_url",
  "$initial_current_url",
  "$initial_referrer",
  "$initial_referring_domain",
  "$pathname",
  "$prev_pageview_pathname",
  "$raw_user_agent",
  "$referrer",
  "$referring_domain",
  "$session_entry_host",
  "$session_entry_pathname",
  "$session_entry_referrer",
  "$session_entry_referring_domain",
  "$session_entry_url",
  "$title",
  "$user_agent",
]);

function stripPrivateMetadata(properties: Record<string, unknown>) {
  const sanitized = { ...properties };
  for (const key of Object.keys(sanitized)) {
    if (
      blockedMetadata.has(key) ||
      key.startsWith("$utm_") ||
      key.startsWith("utm_")
    ) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

if (POSTHOG_PROJECT_TOKEN) {
  try {
    posthog.init(POSTHOG_PROJECT_TOKEN, {
      api_host: POSTHOG_API_HOST,
      ui_host: "https://us.posthog.com",
      defaults: "2026-05-30",
      autocapture: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_performance: false,
      capture_exceptions: false,
      disable_capture_url_hashes: true,
      disable_conversations: true,
      disable_external_dependency_loading: true,
      disable_product_tours: true,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      advanced_disable_flags: true,
      save_campaign_params: false,
      save_referrer: false,
      persistence: "localStorage",
      logs: { captureConsoleLogs: false },
      person_profiles: "identified_only",
      before_send(event) {
        if (!event) return null;
        const sanitized = {
          ...event,
          properties: stripPrivateMetadata(event.properties),
        } as typeof event & Record<string, unknown>;

        // PostHog may attach the first page URL and campaign parameters in a
        // top-level $set_once envelope, outside event.properties. Avantia does
        // not use attribution data, so discard the envelope completely.
        delete sanitized.$set_once;
        if (sanitized.$set && typeof sanitized.$set === "object") {
          sanitized.$set = stripPrivateMetadata(
            sanitized.$set as Record<string, unknown>,
          );
        }
        return sanitized;
      },
    });
    posthog.register({ $geoip_disable: true });
  } catch {
    // Analytics must never prevent Avantia from loading.
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
