import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import {
  redactPrivateText,
  sanitizeSentryEvent,
} from "../lib/monitoring/sentry-privacy";
import {
  AVANTIA_SENTRY_DSN,
  getBrowserSentryDsn,
  getSentryDsn,
  isSentryEnabled,
} from "../lib/monitoring/sentry-config";
import { shouldCaptureOperationalStatus } from "../lib/monitoring/capture-operational-error";

test("only unexpected server failures are eligible for manual capture", () => {
  for (const status of [400, 401, 403, 404, 409, 422, 499]) {
    expect(shouldCaptureOperationalStatus(status)).toBe(false);
  }
  for (const status of [500, 502, 503, 504, 599]) {
    expect(shouldCaptureOperationalStatus(status)).toBe(true);
  }
});

test("Avantia's public Sentry ingest address is always available", () => {
  expect(AVANTIA_SENTRY_DSN).toMatch(
    /^https:\/\/[a-f0-9]+@o\d+\.ingest\.us\.sentry\.io\/\d+$/,
  );
  expect(getBrowserSentryDsn()).toBeTruthy();
  expect(getSentryDsn()).toBeTruthy();
  expect(AVANTIA_SENTRY_DSN).not.toContain("auth_token");
  expect(isSentryEnabled(AVANTIA_SENTRY_DSN, "production")).toBe(true);
  expect(isSentryEnabled(AVANTIA_SENTRY_DSN, "preview")).toBe(false);
  expect(isSentryEnabled(AVANTIA_SENTRY_DSN, "development")).toBe(false);
  expect(isSentryEnabled(AVANTIA_SENTRY_DSN, "development", true)).toBe(true);
});

test("Sentry redacts private error markers while retaining the useful failure", () => {
  expect(
    redactPrivateText(
      "Quote failed for david@example.com, +1 347-567-5077, " +
        "85c40dd4-63f6-4a28-a06a-5380ae8b4f43",
    ),
  ).toBe(
    "Quote failed for [redacted-email], [redacted-phone], [redacted-id]",
  );

  const event = sanitizeSentryEvent({
    type: undefined,
    breadcrumbs: [{ category: "navigation", message: "private customer" }],
    contexts: { private: { ai_prompt: "private prompt" } },
    exception: {
      values: [{
        mechanism: { type: "generic", data: { target: "david@example.com" } },
        stacktrace: {
          frames: [{
            abs_path: "https://build.avantiap.com/_next/private.js?email=david@example.com",
            context_line: "private customer content",
            filename: "app/private.js?phone=3475675077",
            post_context: ["private after"],
            pre_context: ["private before"],
            vars: { customer: "private" },
          }],
        },
        type: "Error",
        value: "Failed for david@example.com",
      }],
    },
    extra: { document: "private.pdf" },
    request: {
      cookies: { session: "secret" },
      data: "private body",
      headers: { authorization: "Bearer secret" },
      method: "POST",
      query_string: "phone=3475675077",
      url: "https://build.avantiap.com/api/request?id=private#secret",
    },
    user: { email: "david@example.com", ip_address: "127.0.0.1" },
    tags: { application: "avantia-build", customer_name: "private customer" },
    threads: { values: [] },
    transaction:
      "/owner/materials/requests/85c40dd4-63f6-4a28-a06a-5380ae8b4f43?phone=3475675077",
  });

  expect(event.user).toBeUndefined();
  expect(event.extra).toBeUndefined();
  expect(event.breadcrumbs).toBeUndefined();
  expect(event.contexts).toBeUndefined();
  expect(event.threads).toBeUndefined();
  expect(event.request).toEqual({ method: "POST" });
  expect(event.tags).toEqual({ application: "avantia-build" });
  expect(event.transaction).toBe("/owner/materials/requests/:id");
  expect(event.exception?.values?.[0]?.value).toBe("Unexpected application error");
  expect(event.exception?.values?.[0]?.mechanism?.data).toBeUndefined();
  expect(event.exception?.values?.[0]?.stacktrace?.frames?.[0]).toMatchObject({
    abs_path: "https://build.avantiap.com/_next/private.js",
    context_line: undefined,
    filename: "app/private.js",
    post_context: undefined,
    pre_context: undefined,
    vars: undefined,
  });
});

test("Sentry covers browser, server, edge and root rendering without replay or PII", async () => {
  const [client, server, edge, instrumentation, errorBoundary, nextConfig] =
    await Promise.all([
      readFile("instrumentation-client.ts", "utf8"),
      readFile("sentry.server.config.ts", "utf8"),
      readFile("sentry.edge.config.ts", "utf8"),
      readFile("instrumentation.ts", "utf8"),
      readFile("app/global-error.tsx", "utf8"),
      readFile("next.config.ts", "utf8"),
    ]);

  const configs = `${client}\n${server}\n${edge}`;
  expect(configs).toContain("sentryPrivacyOptions");
  const privacy = await readFile("lib/monitoring/sentry-privacy.ts", "utf8");
  expect(privacy).toContain("cookies: false");
  expect(privacy).toContain("httpBodies: []");
  expect(privacy).toContain("httpHeaders: { request: false, response: false }");
  expect(privacy).toContain("urlQueryParams: false");
  expect(privacy).toContain("stackFrameVariables: false");
  expect(privacy).toContain("genAI: { inputs: false, outputs: false }");
  expect(privacy).toContain("databaseQueryData: false");
  expect(privacy).toContain('"BrowserSession"');
  expect(privacy).toContain('"Breadcrumbs"');
  expect(privacy).toContain('"Console"');
  expect(privacy).toContain('"HttpContext"');
  expect(privacy).toContain('"ProcessSession"');
  expect(privacy).toContain("enhanceFetchErrorMessages: false");
  expect(privacy).toContain("sendClientReports: false");
  expect(instrumentation).toContain("Sentry.captureRequestError");
  expect(instrumentation).toContain('process.env.NEXT_RUNTIME === "nodejs"');
  expect(instrumentation).toContain('process.env.NEXT_RUNTIME === "edge"');
  expect(errorBoundary).toContain("Sentry.captureException(error)");
  expect(client).toContain("Sentry.captureRouterTransitionStart");
  expect(nextConfig).toContain("withSentryConfig");
  expect(nextConfig).toContain("excludeDebugStatements: true");
  expect(nextConfig).toContain("excludeTracing: true");
});

test("critical handled failures are flushed to Sentry before returning", async () => {
  const criticalFiles = [
    "app/admin/documents/actions.ts",
    "app/admin/supplier-quotes/actions.ts",
    "app/api/admin/client-requests/route.ts",
    "app/api/delivery/uber/quote/route.ts",
    "app/api/delivery/uber/schedule/route.ts",
    "app/api/integrations/abc/accounts/route.ts",
    "app/api/integrations/abc/branches/route.ts",
    "app/api/integrations/abc/catalog/route.ts",
    "app/api/integrations/abc/pricing/route.ts",
    "app/api/location/reverse/route.ts",
    "app/api/manager-notifications/route.ts",
  ];
  const sources = await Promise.all(
    criticalFiles.map(async (file) => [file, await readFile(file, "utf8")] as const),
  );

  for (const [file, source] of sources) {
    expect(source, `${file} must import the operational capture helper`).toContain(
      "captureOperationalError",
    );
    expect(source, `${file} must await serverless delivery`).toContain(
      "await captureOperationalError",
    );
  }

  const helper = await readFile(
    "lib/monitoring/capture-operational-error.ts",
    "utf8",
  );
  expect(helper).toContain("await Sentry.flush(2_000)");
  expect(helper).toContain("safeDatabaseDiagnostics");
  expect(helper).toContain("database_code");
  expect(helper).toContain("database_constraint");
  expect(helper).not.toContain("record.details");
  expect(helper).not.toContain("record.hint");
});

test("browser transport removes URL queries, error text, emails and phone numbers", async ({
  page,
}) => {
  const envelopes: string[] = [];
  await page.route(
    /https:\/\/[^/]+\.ingest(?:\.[^./]+)?\.sentry\.io\/.*/,
    async (route) => {
    envelopes.push(route.request().postData() ?? "");
    await route.fulfill({ status: 200, body: "{}" });
    },
  );

  await page.goto(
    "/request-quote?email=private-marker@example.com&phone=3475675077",
  );
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error(
        "Avantia Sentry browser test private-marker@example.com 347-567-5077",
      );
    }, 0);
  });

  await expect.poll(() => envelopes.length, { timeout: 10_000 }).toBeGreaterThan(0);
  const transmitted = envelopes.join("\n");
  expect(transmitted).toContain("Unexpected application error");
  expect(transmitted).not.toContain("Avantia Sentry browser test");
  expect(transmitted).not.toContain("private-marker@example.com");
  expect(transmitted).not.toContain("347-567-5077");
  expect(transmitted).not.toContain("email=private-marker");
});
