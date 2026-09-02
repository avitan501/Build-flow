import { expect, test, type Page } from "@playwright/test";

const liveGuard = process.env.PLAYWRIGHT_LIVE_GUARD === "1";
const allowProductionWrites =
  process.env.PLAYWRIGHT_ALLOW_PRODUCTION_WRITES === "1";
const expectedProductionHost = "build.avantiap.com";

type PageHealth = {
  assertHealthy: () => Promise<void>;
};

function monitorPage(page: Page): PageHealth {
  const failures: string[] = [];

  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.host === expectedProductionHost && response.status() >= 500) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });

  return {
    async assertHealthy() {
      await expect(page.locator("body")).not.toContainText(
        "An error occurred in the Server Components render",
      );
      expect(failures, failures.join("\n")).toEqual([]);
    },
  };
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(
    overflow.pageWidth,
    `page width ${overflow.pageWidth}px exceeds viewport ${overflow.viewport}px`,
  ).toBeLessThanOrEqual(overflow.viewport + 4);
}

async function openIdeas(page: Page) {
  const ideaInput = page.locator('input[aria-label="Add an idea"]');
  const ideas = page.locator("details").filter({ has: ideaInput });
  await ideas.evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await expect(ideaInput).toBeVisible();
  return { ideas, ideaInput };
}

test.describe("production critical paths", () => {
  test.skip(
    !liveGuard,
    "Set PLAYWRIGHT_LIVE_GUARD=1 to run checks against production.",
  );

  test("release guard reports the live production commit and Supabase binding", async ({
    request,
  }) => {
    const response = await request.get("/api/release", {
      headers: { "Cache-Control": "no-cache" },
    });
    expect(response.ok()).toBe(true);
    const payload = (await response.json()) as {
      status?: string;
      environment?: string;
      release?: string;
      supabaseRef?: string;
    };
    expect(payload).toMatchObject({
      status: "ok",
      environment: "production",
      supabaseRef: "nprfhspwdflpqlopydmp",
    });
    expect(payload.release).toMatch(/^[a-f0-9]{40}$/i);
    if (process.env.PLAYWRIGHT_EXPECTED_RELEASE_SHA) {
      expect(payload.release).toBe(process.env.PLAYWRIGHT_EXPECTED_RELEASE_SHA);
    }
  });

  test("public request accepts several documents without submitting", async ({
    page,
  }) => {
    const health = monitorPage(page);
    await page.goto("/request-quote", { waitUntil: "domcontentloaded" });

    expect(new URL(page.url()).host).toBe(expectedProductionHost);
    await expect(
      page.getByRole("heading", { name: "Send your material list" }),
    ).toBeVisible();

    const attachments = page.getByLabel("Attach plans or material lists");
    await attachments.setInputFiles([
      {
        name: "avantia-e2e-photo.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      },
      {
        name: "avantia-e2e-list.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
      },
    ]);

    await expect(page.getByText("2 files selected")).toBeVisible();
    await expect(page.getByText("avantia-e2e-photo.jpg")).toBeVisible();
    await expect(page.getByText("avantia-e2e-list.pdf")).toBeVisible();
    await expectNoPageOverflow(page);
    await health.assertHealthy();
  });

  test("owner workspaces load with the production session", async ({ page }) => {
    const routes = [
      { path: "/admin/build-map", text: "Dashboard" },
      { path: "/admin/ai-tools", text: "Manager Tools" },
      { path: "/admin/goals-progress", text: "Carlos Dashboard" },
      {
        path: "/admin/goals-progress/website-work",
        text: "David Dashboard",
      },
      { path: "/admin/documents", text: "Every quote. One memory." },
      { path: "/admin/supplier-network", text: "Build Supplier Relationships" },
      {
        path: "/admin/whatsapp",
        finalPath: "/admin/communications",
        text: "Inbox",
      },
    ];

    for (const route of routes) {
      const health = monitorPage(page);
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(new URL(page.url()).host).toBe(expectedProductionHost);
      if ("finalPath" in route) {
        expect(new URL(page.url()).pathname).toBe(route.finalPath);
      }
      expect(page.url(), `${route.path} unexpectedly opened login`).not.toContain(
        "/login",
      );
      await expect(page.getByText(route.text, { exact: true }).first()).toBeVisible();
      await expectNoPageOverflow(page);
      await health.assertHealthy();
    }
  });

  test("David idea persists after reload and is removed after verification", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "The controlled production write runs once on desktop.",
    );
    test.skip(
      !allowProductionWrites,
      "Set PLAYWRIGHT_ALLOW_PRODUCTION_WRITES=1 for the reversible persistence check.",
    );

    const marker = `MAYA-E2E-${Date.now()}`;
    page.on("dialog", (dialog) => dialog.accept());

    try {
      await page.goto("/admin/goals-progress/website-work", {
        waitUntil: "domcontentloaded",
      });
      expect(page.url()).not.toContain("/login");
      let { ideas } = await openIdeas(page);
      const ideaInput = page.getByRole("textbox", { name: "Add an idea" });
      await ideaInput.fill(marker);
      await ideas.getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByText(marker, { exact: true })).toBeVisible();

      await page.reload({ waitUntil: "domcontentloaded" });
      ({ ideas } = await openIdeas(page));
      await expect(page.getByText(marker, { exact: true })).toBeVisible();

      const row = page.getByText(marker, { exact: true }).locator("xpath=../..");
      await row.getByRole("button", { name: "Delete idea" }).click();
      await expect(page.getByText(marker, { exact: true })).toHaveCount(0);

      await page.reload({ waitUntil: "domcontentloaded" });
      await openIdeas(page);
      await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
    } finally {
      await page.goto("/admin/goals-progress/website-work", {
        waitUntil: "domcontentloaded",
      });
      const { ideas } = await openIdeas(page);
      const leftover = page.getByText(marker, { exact: true });
      if (await leftover.count()) {
        const row = leftover.locator("xpath=../..");
        await row.getByRole("button", { name: "Delete idea" }).click();
        await expect(leftover).toHaveCount(0);
      }
      await expect(ideas).toBeVisible();
    }
  });
});
