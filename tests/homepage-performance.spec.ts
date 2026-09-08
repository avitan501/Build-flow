import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("homepage defers below-the-fold branding and secondary hero photos", async () => {
  const [footer, lockup, homepage] = await Promise.all([
    readFile(path.join(root, "components/buildflow/site-footer.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/avantia-build-lockup.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/homepage-concept-preview.tsx"), "utf8"),
  ]);

  expect(lockup).toContain('loading?: "eager" | "lazy"');
  expect(footer.match(/loading="lazy"/g)).toHaveLength(2);
  expect(homepage).toContain('window.addEventListener("load", loadRemainingHeroPhotos');
  expect(homepage).toContain('window.setTimeout(() => setHeroDeckReady(true), 4000)');
  expect(homepage).toContain("!heroDeckReady || paused");
});
