"use client";

import { POSTHOG_PROJECT_TOKEN } from "@/lib/analytics/posthog-config";

type EventProperty = string | number | boolean | null | undefined;
type PostHogBrowser = ReturnType<
  (typeof import("@/lib/analytics/posthog-browser"))["getPostHogBrowser"]
>;
const analyticsEnabled = Boolean(POSTHOG_PROJECT_TOKEN);
let posthogPromise: Promise<Awaited<PostHogBrowser>> | null = null;

function loadPostHog() {
  if (!analyticsEnabled) return Promise.resolve(null);
  posthogPromise ??= import("@/lib/analytics/posthog-browser")
    .then(({ getPostHogBrowser }) => getPostHogBrowser())
    .catch(() => null);
  return posthogPromise;
}

export function captureAvantiaEvent(
  event: string,
  properties: Record<string, EventProperty> = {},
) {
  if (!/^avantia_[a-z0-9_]{1,55}$/.test(event)) return;
  if (!analyticsEnabled) return;
  void loadPostHog().then((posthog) => {
    try {
      posthog?.capture(event, properties);
    } catch {
      // Product analytics must never interrupt a customer or staff workflow.
    }
  });
}

export function identifyAvantiaActor(
  actorId: string,
  actorType: "owner" | "staff" | "client",
  actorCohort: "owner" | "operations_primary" | "operations_secondary" | "client",
) {
  if (!analyticsEnabled || !actorId) return;
  void loadPostHog().then((posthog) => {
    try {
      posthog?.identify(actorId, {
        actor_type: actorType,
        actor_cohort: actorCohort,
      });
    } catch {
      // Product analytics must never interrupt authentication.
    }
  });
}

export function resetAvantiaActor() {
  if (!analyticsEnabled) return;
  void loadPostHog().then((posthog) => {
    try {
      posthog?.reset();
    } catch {
      // Product analytics must never interrupt sign-out.
    }
  });
}
