"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { analyticsArea, analyticsRouteContext } from "@/lib/analytics/route-context";
import {
  captureAvantiaEvent,
  identifyAvantiaActor,
  resetAvantiaActor,
} from "@/lib/analytics/posthog-client";

type ActorType = "owner" | "staff" | "client" | "anonymous";
type ActorCohort =
  | "owner"
  | "operations_primary"
  | "operations_secondary"
  | "client"
  | "anonymous";

const SESSION_ACTOR_KEY = "avantia.analytics.actor";
const ALLOWED_ELEMENT_PROPERTIES = [
  "analyticsArea",
  "analyticsAction",
  "analyticsEntityType",
  "analyticsEntityId",
] as const;

const ELEMENT_PROPERTY_NAMES: Record<
  (typeof ALLOWED_ELEMENT_PROPERTIES)[number],
  string
> = {
  analyticsArea: "area",
  analyticsAction: "action",
  analyticsEntityType: "entity_type",
  analyticsEntityId: "entity_id",
};
const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_FORM_NAMES = new Set(["beat_quote_request", "material_quote_request"]);

function elementProperties(element: HTMLElement) {
  const properties: Record<string, string> = {};
  for (const key of ALLOWED_ELEMENT_PROPERTIES) {
    const value = element.dataset[key]?.trim();
    const valid = key === "analyticsEntityId"
      ? Boolean(value && UUID_VALUE.test(value))
      : Boolean(value && /^[A-Za-z0-9:_-]{1,80}$/.test(value));
    if (value && valid) {
      properties[ELEMENT_PROPERTY_NAMES[key]] = value;
    }
  }
  return properties;
}

export function shouldResetAnalyticsActor(
  previousActor: string | null,
  nextActor: string | null,
) {
  return Boolean(previousActor && previousActor !== nextActor);
}

function selectedFileTypes(input: HTMLInputElement) {
  return Array.from(input.files ?? [])
    .map((file) => file.type.split("/", 1)[0] || "unknown")
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 5)
    .join(",");
}

function readSessionActor() {
  try {
    return window.sessionStorage.getItem(SESSION_ACTOR_KEY);
  } catch {
    return null;
  }
}

function writeSessionActor(actorId: string | null) {
  try {
    if (actorId) window.sessionStorage.setItem(SESSION_ACTOR_KEY, actorId);
    else window.sessionStorage.removeItem(SESSION_ACTOR_KEY);
  } catch {
    // Storage can be blocked by the browser; analytics remains optional.
  }
}

export function PostHogAnalytics({
  actorId,
  actorType,
  actorCohort,
}: {
  actorId: string | null;
  actorType: ActorType;
  actorCohort: ActorCohort;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const previousActor = readSessionActor();
    if (actorId && actorType !== "anonymous") {
      if (shouldResetAnalyticsActor(previousActor, actorId)) {
        resetAvantiaActor();
      }
      identifyAvantiaActor(actorId, actorType, actorCohort as Exclude<ActorCohort, "anonymous">);
      writeSessionActor(actorId);
      return;
    }
    if (previousActor) {
      resetAvantiaActor();
      writeSessionActor(null);
    }
  }, [actorCohort, actorId, actorType]);

  useEffect(() => {
    const context = analyticsRouteContext(pathname || "/");
    captureAvantiaEvent("avantia_page_view", {
      ...context,
      area: analyticsArea(context.route),
      actor_type: actorType,
      actor_cohort: actorCohort,
      viewport: window.innerWidth < 768 ? "phone" : "desktop",
    });
  }, [actorCohort, actorType, pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const tracked = target?.closest<HTMLElement>("[data-analytics-event]");
      if (tracked) {
        const eventName = tracked.dataset.analyticsEvent?.trim() || "";
        captureAvantiaEvent(eventName, {
          ...elementProperties(tracked),
          actor_type: actorType,
          actor_cohort: actorCohort,
        });
        return;
      }
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      const href = link?.getAttribute("href") || "";
      if (!href.startsWith("/")) return;
      const destination = analyticsRouteContext(href);
      captureAvantiaEvent("avantia_navigation_clicked", {
        destination: destination.route,
        destination_entity_id: destination.entity_id,
        actor_type: actorType,
        actor_cohort: actorCohort,
      });
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      const context = analyticsRouteContext(window.location.pathname);
      const requestedForm = form.dataset.analyticsForm?.trim() || "";
      captureAvantiaEvent("avantia_form_submit_attempted", {
        route: context.route,
        entity_id: context.entity_id,
        form: SAFE_FORM_NAMES.has(requestedForm) ? requestedForm : "unnamed",
        actor_type: actorType,
        actor_cohort: actorCohort,
      });
    };
    const onChange = (event: Event) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input || input.type !== "file" || !input.files?.length) return;
      const context = analyticsRouteContext(window.location.pathname);
      captureAvantiaEvent("avantia_files_selected", {
        route: context.route,
        entity_id: context.entity_id,
        file_count: Math.min(input.files.length, 20),
        file_types: selectedFileTypes(input),
        actor_type: actorType,
        actor_cohort: actorCohort,
      });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("change", onChange, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("change", onChange, true);
    };
  }, [actorCohort, actorType]);

  return null;
}
