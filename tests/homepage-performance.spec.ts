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
  expect(lockup).toContain('src="/images/avantia/avantia-build-lockup-navy.webp"');
  expect(lockup).not.toContain("avantia-build-lockup-animated.webp");
  expect(footer.match(/loading="lazy"/g)).toHaveLength(2);
  expect(homepage).not.toContain("ShopBrandShowcase");
  expect(homepage).toContain("[content-visibility:auto]");
  expect(homepage).toContain("videoRequested ? <source");
  expect(homepage).toContain('aria-label="Play material request video"');
  expect(homepage).toContain('window.addEventListener("load", loadRemainingHeroPhotos');
  expect(homepage).toContain('window.setTimeout(() => setHeroDeckReady(true), 4000)');
  expect(homepage).toContain("!heroDeckReady || paused");
  // Keep dark hero text readable if all photography fails or is blocked.
  expect(homepage).toContain('conceptId === 2 ? "bg-[#f4efe6] text-slate-950"');
});
