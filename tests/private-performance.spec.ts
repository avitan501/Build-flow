import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import {
  consumePrivateRouteTransition,
  markPrivateRouteTransition,
  privatePerformanceRoute,
} from "../lib/analytics/private-performance";

test("performance route labels discard query values and dynamic identifiers", () => {
  expect(
    privatePerformanceRoute(
      "/owner/materials/requests/85c40dd4-63f6-4a28-a06a-5380ae8b4f43?email=private@example.com",
    ),
  ).toBe("/owner/materials/requests/:id");
  expect(
    privatePerformanceRoute("/auth/confirm/aVeryLongPrivateConfirmationToken12345?phone=3475675077"),
  ).toBe("/auth/confirm/:token");
});

test("route-ready timing is consumed once for the matching normalized route", () => {
  markPrivateRouteTransition(
    "/admin/quote-comparison/85c40dd4-63f6-4a28-a06a-5380ae8b4f43?private=value",
    "push",
    100,
  );
  expect(
    consumePrivateRouteTransition(
      "/admin/quote-comparison/85c40dd4-63f6-4a28-a06a-5380ae8b4f43",
      148.4,
    ),
  ).toEqual({
    route: "/admin/quote-comparison/:id",
    navigationType: "push",
    durationMs: 48,
  });
  expect(consumePrivateRouteTransition("/admin/quote-comparison/other", 200)).toBeNull();
});

test("performance instrumentation is private, streamed, cached, and selectively prefetched", async () => {
  const [vitals, instrumentation, layout, loading, auth, shell, posthogClient] = await Promise.all([
    readFile("components/buildflow/private-web-vitals.tsx", "utf8"),
    readFile("instrumentation-client.ts", "utf8"),
    readFile("app/layout.tsx", "utf8"),
    readFile("app/admin/loading.tsx", "utf8"),
    readFile("lib/auth.ts", "utf8"),
    readFile("components/buildflow/admin-shell.tsx", "utf8"),
    readFile("lib/analytics/posthog-client.ts", "utf8"),
  ]);

  expect(vitals).toContain("useReportWebVitals(reportWebVital)");
  expect(vitals).toContain('captureAvantiaEvent("avantia_web_vital"');
  expect(vitals).toContain('captureAvantiaEvent("avantia_route_ready"');
  expect(vitals).not.toContain("metric.entries");
  expect(vitals).not.toContain("metric.id");
  expect(layout).toContain("<PrivateWebVitals />");
  expect(instrumentation).toContain("markPrivateRouteTransition(url, navigationType)");
  expect(loading).toContain("<ManagerPageLoading />");
  expect(auth.match(/cache\(async function/g)?.length).toBeGreaterThanOrEqual(2);
  expect(shell).toContain("prefetch={link.prefetch ?? false}");
  expect(shell).toContain('import("@/components/buildflow/manager-notification-center")');
  expect(posthogClient).toContain('import("@/lib/analytics/posthog-browser")');
  expect(`${vitals}\n${instrumentation}`).not.toMatch(/searchParams|document\.referrer|metric\.entries/);
});
