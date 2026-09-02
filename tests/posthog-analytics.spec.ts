import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

import { shouldResetAnalyticsActor } from "../components/buildflow/posthog-analytics";
import { analyticsRouteContext } from "../lib/analytics/route-context";

test.use({
  // PostHog intentionally ignores headless-browser user agents as bots. Use a
  // normal Chrome UA so the transport-level privacy assertion exercises the SDK.
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
});

test("analytics routes retain useful workflow context without query strings or long tokens", () => {
  expect(analyticsRouteContext("/owner/materials/requests/85c40dd4-63f6-4a28-a06a-5380ae8b4f43?phone=secret")).toEqual({
    route: "/owner/materials/requests/:id",
    entity_id: "85c40dd4-63f6-4a28-a06a-5380ae8b4f43",
  });
  expect(analyticsRouteContext("/auth/confirm/aVeryLongPrivateConfirmationToken12345")).toEqual({
    route: "/auth/confirm/:token",
  });
  expect(analyticsRouteContext("/requests/AB-1234/pdf")).toEqual({
    route: "/requests/:id/pdf",
  });
  expect(analyticsRouteContext("/shop/private-customer-slug")).toEqual({
    route: "/shop/:slug",
  });
  expect(analyticsRouteContext("/shop/framing")).toEqual({
    route: "/shop/framing",
  });
});

test("analytics resets identity before a different authenticated actor", () => {
  expect(shouldResetAnalyticsActor("actor-a", "actor-b")).toBe(true);
  expect(shouldResetAnalyticsActor("actor-a", "actor-a")).toBe(false);
  expect(shouldResetAnalyticsActor(null, "actor-b")).toBe(false);
});

test("PostHog is lazy, explicit, privacy-safe, and never records session contents", async () => {
  const [instrumentation, posthogBrowser, posthogClient, component, layout, quoteForm, activityReporter] = await Promise.all([
    readFile("instrumentation-client.ts", "utf8"),
    readFile("lib/analytics/posthog-browser.ts", "utf8"),
    readFile("lib/analytics/posthog-client.ts", "utf8"),
    readFile("components/buildflow/posthog-analytics.tsx", "utf8"),
    readFile("app/layout.tsx", "utf8"),
    readFile("components/buildflow/quote-request-form.tsx", "utf8"),
    readFile("components/buildflow/employee-activity-reporter.tsx", "utf8"),
  ]);
  expect(posthogBrowser).toContain("autocapture: false");
  expect(posthogBrowser).toContain("capture_pageview: false");
  expect(posthogBrowser).toContain("disable_session_recording: true");
  expect(posthogBrowser).toContain("capture_exceptions: false");
  expect(posthogBrowser).toContain("advanced_disable_flags: true");
  expect(posthogBrowser).toContain("save_referrer: false");
  expect(posthogBrowser).toContain("save_campaign_params: false");
  expect(posthogBrowser).toContain("delete sanitized.$set_once");
  expect(posthogBrowser).toContain("capture_performance: false");
  expect(posthogBrowser).toContain("capture_heatmaps: false");
  expect(posthogBrowser).toContain("captureConsoleLogs: false");
  expect(posthogBrowser).toContain("$geoip_disable: true");
  expect(instrumentation).not.toContain('from "posthog-js"');
  expect(posthogClient).toContain('import("@/lib/analytics/posthog-browser")');
  expect(`${instrumentation}\n${posthogBrowser}`).not.toMatch(/phone|email|full_name|message_text|file\.name/);
  expect(component).toContain('captureAvantiaEvent("avantia_page_view"');
  expect(component).toContain('captureAvantiaEvent("avantia_files_selected"');
  expect(component).not.toContain("file.name");
  expect(layout).toContain("<PostHogAnalytics");
  expect(layout).toContain("user?.id ?? null");
  expect(quoteForm).toContain("avantia_quote_request_completed");
  expect(activityReporter).toContain("avantia_staff_active");
  expect(`${instrumentation}\n${component}\n${quoteForm}\n${activityReporter}`).not.toMatch(
    /captureAvantiaEvent\([^)]*(?:phone|email|full_name|message_text|file\.name)/,
  );
});

test("runtime analytics strips private URL values before transmission", async ({ page }) => {
  const payloads: string[] = [];
  await page.addInitScript(() => {
    // The SDK correctly discards automation traffic when webdriver=true. This
    // test needs to exercise the real browser transport as a normal visitor.
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", {
      get: () => ({
        brands: [
          { brand: "Chromium", version: "140" },
          { brand: "Google Chrome", version: "140" },
          { brand: "Not=A?Brand", version: "24" },
        ],
        mobile: false,
        platform: "macOS",
      }),
    });
  });
  page.on("request", (request) => {
    if (request.url().startsWith("https://us.i.posthog.com/")) {
      const postData = request.postDataBuffer();
      if (!postData) return;
      const body = postData[0] === 0x1f && postData[1] === 0x8b
        ? gunzipSync(postData)
        : postData;
      payloads.push(body.toString("utf8"));
    }
  });

  await page.goto(
    "/request-quote?phone=private-phone-marker&email=private-email-marker",
  );
  await expect.poll(() => payloads.length, { timeout: 10_000 }).toBeGreaterThan(0);

  const transmitted = payloads.join("\n");
  expect(transmitted).toContain("avantia_page_view");
  expect(transmitted).not.toContain("private-phone-marker");
  expect(transmitted).not.toContain("private-email-marker");
});
