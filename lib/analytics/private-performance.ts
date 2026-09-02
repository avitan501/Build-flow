import { analyticsRouteContext } from "@/lib/analytics/route-context";

type NavigationType = "push" | "replace" | "traverse";

type PendingRouteTransition = {
  route: string;
  navigationType: NavigationType;
  startedAt: number;
};

let pendingRouteTransition: PendingRouteTransition | null = null;

export function privatePerformanceRoute(value: string) {
  return analyticsRouteContext(value).route;
}

export function markPrivateRouteTransition(
  url: string,
  navigationType: NavigationType,
  startedAt = performance.now(),
) {
  pendingRouteTransition = {
    route: privatePerformanceRoute(url),
    navigationType,
    startedAt,
  };
}

export function consumePrivateRouteTransition(
  pathname: string,
  completedAt = performance.now(),
) {
  const transition = pendingRouteTransition;
  if (!transition || transition.route !== privatePerformanceRoute(pathname)) {
    return null;
  }
  pendingRouteTransition = null;
  return {
    route: transition.route,
    navigationType: transition.navigationType,
    durationMs: Math.max(0, Math.round(completedAt - transition.startedAt)),
  };
}
