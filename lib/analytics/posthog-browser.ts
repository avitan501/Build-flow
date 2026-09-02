"use client";

import posthog from "posthog-js";

import {
  POSTHOG_API_HOST,
  POSTHOG_PROJECT_TOKEN,
} from "@/lib/analytics/posthog-config";

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

let initialized = false;

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

export function getPostHogBrowser() {
  if (!POSTHOG_PROJECT_TOKEN) return null;
  if (initialized) return posthog;

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
  initialized = true;
  return posthog;
}
