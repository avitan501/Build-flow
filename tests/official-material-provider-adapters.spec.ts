import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("Home Depot uses the approved feed path and never scrapes", async () => {
  const source = await readFile(path.join(root, "lib/aura/material-providers/home-depot.ts"), "utf8");
  expect(source).toContain("official Impact affiliate program");
  expect(source).toContain("readonly enabled = false");
  expect(source).not.toContain("fetch(");
  expect(source).not.toContain("homedepot.com/p/");
});

test("Lowe's adapter requires approval, flag, client id and bearer token", async () => {
  const source = await readFile(path.join(root, "lib/aura/material-providers/lowes.ts"), "utf8");
  expect(source).toContain("AURA_LOWES_PRODUCT_API_ENABLED");
  expect(source).toContain("AURA_LOWES_PRODUCT_API_ACCESS_APPROVED");
  expect(source).toContain("AURA_LOWES_PRODUCT_API_CLIENT_ID");
  expect(source).toContain("AURA_LOWES_PRODUCT_API_ACCESS_TOKEN");
  expect(source).toContain('"X-Client-Id"');
  expect(source).toContain('cache: "no-store"');
  expect(source).toContain("AbortSignal.timeout(8_000)");
});

test("provider registry requires both policy approval and adapter enablement", async () => {
  const source = await readFile(path.join(root, "lib/aura/material-providers/registry.ts"), "utf8");
  expect(source).toContain("new HomeDepotOfficialProvider()");
  expect(source).toContain("new LowesOfficialProvider()");
  expect(source).toContain("provider.enabled && policy?.liveAccessConfirmed === true");
});
