import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { NextRequest } from "next/server";
import { Suspense, type ReactElement } from "react";

const localRequire = createRequire(`${process.cwd()}/package.json`);
function compile(file: string, mocks: Record<string, unknown>, extra = "") {
  const output = ts.transpileModule(readFileSync(file, "utf8") + extra, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: Record<string, unknown> = {};
  new Function("exports", "require", output)(exports, (id: string) => id in mocks ? mocks[id] : localRequire(id));
  return exports;
}

function proxyFixture(signedIn = false) {
  let calls = 0;
  const exports = compile("proxy.ts", {
    "@/lib/supabase/env": { hasSupabasePublicEnv: () => true, getSupabasePublicEnv: () => ({ url: "https://example.invalid", anonKey: "test-public" }) },
    "@supabase/ssr": { createServerClient: () => ({ auth: { getClaims: async () => { calls++; return { data: { claims: signedIn ? { sub: "staff" } : null }, error: null }; } } }) },
  });
  return { proxy: exports.proxy as (request: NextRequest) => Promise<Response>, calls: () => calls };
}

test("exact public homepage skips auth even with expired session cookie", async () => {
  const fixture = proxyFixture();
  const response = await fixture.proxy(new NextRequest("https://avantiabuild.com/", { headers: { cookie: "sb-test-auth-token=expired" } }));
  expect(response.status).toBe(200);
  expect(fixture.calls()).toBe(0);
});

test("protected paths keep claims validation and login redirects", async () => {
  for (const path of ["/admin/build-map", "/owner", "/orders", "/projects/private"]) {
    const fixture = proxyFixture();
    const response = await fixture.proxy(new NextRequest(`https://avantiabuild.com${path}`));
    expect(fixture.calls()).toBe(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?next=");
  }
});

test("signed-in login and dashboard redirects remain unchanged", async () => {
  for (const path of ["/login", "/signup", "/dashboard"]) {
    const fixture = proxyFixture(true);
    const response = await fixture.proxy(new NextRequest(`https://avantiabuild.com${path}`));
    expect(fixture.calls()).toBe(1);
    expect(response.headers.get("location")).toBe("https://avantiabuild.com/");
  }
});

function layoutFixture(session: () => Promise<unknown>, query: (signal: AbortSignal) => Promise<unknown>) {
  const componentMocks: Record<string, unknown> = {};
  for (const [file, name] of [
    ["buildflow-client-shell", "AvantiaBuildClientShell"], ["mobile-client-header", "MobileClientHeader"],
    ["posthog-analytics", "PostHogAnalytics"], ["private-web-vitals", "PrivateWebVitals"],
    ["public-contact-bar", "PublicContactBar"], ["site-footer", "SiteFooter"],
    ["shop-language-provider", "ShopLanguageProvider"], ["traffic-tracker", "TrafficTracker"],
    ["workflow-settings-hydrator", "WorkflowSettingsHydrator"],
  ]) componentMocks[`@/components/buildflow/${file}`] = { [name]: name };
  let signal: AbortSignal;
  const builder = { select: () => builder, eq: () => builder, abortSignal: (value: AbortSignal) => { signal = value; return builder; }, maybeSingle: () => query(signal) };
  return compile("app/layout.tsx", {
    ...componentMocks,
    "./globals.css": {},
    "next/font/google": { Geist: () => ({ variable: "font" }), Geist_Mono: () => ({ variable: "mono" }), Poppins: () => ({ variable: "poppins" }) },
    "next/headers": { cookies: async () => ({ get: () => ({ value: "es" }) }) },
    "next/navigation": { unstable_rethrow: (error: unknown) => { if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error; } },
    "next/script": { default: "script" },
    "@/lib/auth": { getSessionWithProfile: session },
    "@/lib/owner-identity": { managerCapabilities: () => ({ owner: false }), STAFF_EMAILS: [] },
    "@/lib/shop-i18n": { parseShopLanguage: (value: string) => value, SHOP_LANGUAGE_COOKIE: "language" },
    "@/lib/site-url": { PRODUCTION_SITE_ORIGIN: "https://avantiabuild.com" },
    "@/lib/supabase/env": { hasSupabasePublicEnv: () => true, getSupabasePublicEnv: () => ({ url: "https://example.invalid", anonKey: "test-public" }) },
    "@/lib/supabase/server": { createClient: async () => ({ from: () => builder }) },
  }, "\nexport { OptionalSessionChrome, OptionalWorkflowSettings };\n") as {
    default: (props: { children: string }) => Promise<ReactElement>;
    OptionalSessionChrome: () => Promise<ReactElement>;
    OptionalWorkflowSettings: () => Promise<ReactElement | null>;
  };
}

function findChild(node: unknown, target: unknown, ancestors: ReactElement[] = []): ReactElement[] | null {
  if (node === target) return ancestors;
  if (Array.isArray(node)) { for (const child of node) { const result = findChild(child, target, ancestors); if (result) return result; } }
  if (node && typeof node === "object" && "props" in node) {
    const element = node as ReactElement<{ children?: unknown }>;
    return findChild(element.props.children, target, [...ancestors, element]);
  }
  return null;
}

test("root produces page tree without starting optional network services", async () => {
  let calls = 0;
  const fixture = layoutFixture(() => { calls++; return new Promise(() => {}); }, () => { calls++; return new Promise(() => {}); });
  const tree = await fixture.default({ children: "PUBLIC_HOMEPAGE" });
  expect(calls).toBe(0);
  const ancestors = findChild(tree, "PUBLIC_HOMEPAGE");
  expect(ancestors).not.toBeNull();
  expect(ancestors?.some((node) => node.type === Suspense)).toBe(false);
  expect(ancestors?.some((node) => node.type === "ShopLanguageProvider")).toBe(true);
  expect(tree.props).toMatchObject({ lang: "es" });
});

test("optional session failure returns only public header, not anonymous analytics", async () => {
  const fixture = layoutFixture(async () => { throw new Error("Auth unavailable"); }, async () => ({ data: null }));
  const result = await fixture.OptionalSessionChrome();
  const fallback = (result.type as () => ReactElement)();
  expect(fallback.type).toBe("MobileClientHeader");
  expect(fallback.props).toMatchObject({ isSignedIn: false, isAdmin: false });
});

test("optional catches preserve Next navigation control flow", async () => {
  const fixture = layoutFixture(async () => { throw new Error("NEXT_REDIRECT"); }, async () => { throw new Error("NEXT_REDIRECT"); });
  await expect(fixture.OptionalSessionChrome()).rejects.toThrow("NEXT_REDIRECT");
  await expect(fixture.OptionalWorkflowSettings()).rejects.toThrow("NEXT_REDIRECT");
});

test("public catalog query has cancellation and gracefully skips failed hydration", async () => {
  const fixture = layoutFixture(async () => ({}), async (signal) => { expect(signal).toBeInstanceOf(AbortSignal); return { data: null, error: new Error("Timeout") }; });
  expect(await fixture.OptionalWorkflowSettings()).toBeNull();
  const rejected = layoutFixture(async () => ({}), async () => { throw new Error("Network unavailable"); });
  expect(await rejected.OptionalWorkflowSettings()).toBeNull();
});
