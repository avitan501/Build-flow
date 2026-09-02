import * as Sentry from "@sentry/nextjs";

import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryRelease,
  isSentryEnabled,
} from "@/lib/monitoring/sentry-config";
import {
  privacySafeSentryIntegrations,
  sentryPrivacyOptions,
} from "@/lib/monitoring/sentry-privacy";

const dsn = getSentryDsn();
const environment = getSentryEnvironment();
const release = getSentryRelease();

Sentry.init({
  ...sentryPrivacyOptions,
  dsn,
  enabled: isSentryEnabled(dsn, environment),
  environment,
  ...(release ? { release } : {}),
  initialScope: { tags: { application: "avantia-build", runtime: "server" } },
  integrations: privacySafeSentryIntegrations,
});
