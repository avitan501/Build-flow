"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

import {
  consumePrivateRouteTransition,
  privatePerformanceRoute,
} from "@/lib/analytics/private-performance";
import { captureAvantiaEvent } from "@/lib/analytics/posthog-client";

const WEB_VITAL_NAMES = new Set(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]);
const WEB_VITAL_RATINGS = new Set(["good", "needs-improvement", "poor"]);

const reportWebVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  if (!WEB_VITAL_NAMES.has(metric.name)) return;
  captureAvantiaEvent("avantia_web_vital", {
    route: privatePerformanceRoute(window.location.pathname),
    metric: metric.name,
    value: Math.round(metric.value * 100) / 100,
    delta: Math.round(metric.delta * 100) / 100,
    rating: WEB_VITAL_RATINGS.has(metric.rating) ? metric.rating : "unknown",
    navigation_type: metric.navigationType,
  });
};

export function PrivateWebVitals() {
  const pathname = usePathname();
  useReportWebVitals(reportWebVital);

  useEffect(() => {
    const routeMetric = consumePrivateRouteTransition(pathname || "/");
    if (!routeMetric) return;
    captureAvantiaEvent("avantia_route_ready", {
      route: routeMetric.route,
      duration_ms: routeMetric.durationMs,
      navigation_type: routeMetric.navigationType,
    });
  }, [pathname]);

  return null;
}
