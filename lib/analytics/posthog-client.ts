"use client";

import posthog from "posthog-js";

import { POSTHOG_PROJECT_TOKEN } from "@/lib/analytics/posthog-config";

type EventProperty = string | number | boolean | null | undefined;
const analyticsEnabled = Boolean(POSTHOG_PROJECT_TOKEN);

export function captureAvantiaEvent(
  event: string,
  properties: Record<string, EventProperty> = {},
) {
  if (!/^avantia_[a-z0-9_]{1,55}$/.test(event)) return;
  if (!analyticsEnabled) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Product analytics must never interrupt a customer or staff workflow.
  }
}

export function identifyAvantiaActor(
  actorId: string,
  actorType: "owner" | "staff" | "client",
  actorCohort: "owner" | "operations_primary" | "operations_secondary" | "client",
) {
  if (!analyticsEnabled || !actorId) return;
  try {
    posthog.identify(actorId, {
      actor_type: actorType,
      actor_cohort: actorCohort,
    });
  } catch {
    // Product analytics must never interrupt authentication.
  }
}

export function resetAvantiaActor() {
  if (!analyticsEnabled) return;
  try {
    posthog.reset();
  } catch {
    // Product analytics must never interrupt sign-out.
  }
}
