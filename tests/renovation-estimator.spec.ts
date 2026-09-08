import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("renovation estimator is removed from public navigation", async () => {
  const [header, publicAi] = await Promise.all([
    readFile(path.join(root, "components/buildflow/mobile-client-header.tsx"), "utf8"),
    readFile(path.join(root, "app/ai/page.tsx"), "utf8"),
  ]);

  expect(header).not.toContain("Renovation AI");
  expect(header).not.toContain(">More<");
  expect(publicAi).not.toContain("Apartment Renovation Estimator");
});

test("renovation estimator is available only from manager AI tools", async () => {
  const [tools, managerRoute, legacyRoute, search] = await Promise.all([
    readFile(path.join(root, "app/admin/ai-tools/page.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/ai-tools/renovation-estimator/page.tsx"), "utf8"),
    readFile(path.join(root, "app/ai/renovation-estimator/page.tsx"), "utf8"),
    readFile(path.join(root, "lib/manager-global-search.ts"), "utf8"),
  ]);

  expect(tools).toContain('title: "Renovation AI"');
  expect(tools).toContain('href: "/admin/ai-tools/renovation-estimator"');
  expect(managerRoute).toContain("<RenovationEstimator />");
  expect(legacyRoute).toContain('redirect("/admin/ai-tools/renovation-estimator")');
  expect(search).toContain('title: "Renovation AI"');
  expect(search).toContain('capability: "aiTools"');
});
