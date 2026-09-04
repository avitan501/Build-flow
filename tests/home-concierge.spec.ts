import { expect, test } from "@playwright/test";

test("new homepage presents the approved request flow", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(
    "Avantia Build | Construction Materials, Handled.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: /One Quote. Better Options./ }),
  ).toBeVisible();
  await expect(page.getByText("Building materials", { exact: true })).toBeVisible();
  await expect(page.getByText("Before / after", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Check My Quote", exact: true })).toHaveAttribute(
    "href",
    "/beat-a-quote",
  );
  await expect(page.getByRole("link", { name: "Send My Material List", exact: true })).toHaveAttribute(
    "href",
    "/request-quote",
  );
  await expect(page.locator("#brands").getByText("Serving all 50 states", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tell us what you need." }),
  ).toBeVisible();
  await expect(
    page.locator('video:has(source[src="/videos/homepage-material-process-v2.mp4"])'),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Three direct ways to start." }),
  ).toBeVisible();
  for (const title of ["Beat Your Quote", "Send Any Material List", "Find a Specific Item"]) {
    await expect(page.getByRole("heading", { name: title })).toBeAttached();
  }
  await expect(page.getByRole("heading", { name: "Why contractors send us the list" })).toBeVisible();
  for (const reason of ["Compare the full cost", "Approve before we order", "One team follows through"]) {
    await expect(page.getByRole("heading", { name: reason })).toBeAttached();
  }
  for (const asset of [
    "service-beat-quote-v4.webp",
    "service-send-list-v4.webp",
    "service-find-item-v5.webp",
  ]) {
    const image = page.locator(`img[src*="${asset}"]`);
    await expect(image).toBeAttached();
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  await expect(page.getByRole("contentinfo")).toBeAttached();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("all three mobile service photographs can be revealed in the swipe rail", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1024) >= 640, "Mobile-only swipe rail check");
  await page.goto("/");

  const first = page.getByRole("heading", { name: "Beat Your Quote" });
  const third = page.getByRole("heading", { name: "Find a Specific Item" });
  await first.scrollIntoViewIfNeeded();
  await expect(first).toBeVisible();
  await third.scrollIntoViewIfNeeded();
  await expect(third).toBeVisible();
});

test("homepage process film is motion footage rather than a generated slide sequence", async ({ page }) => {
  await page.goto("/");

  const film = page.locator('video:has(source[src="/videos/homepage-material-process-v2.mp4"])');
  await expect(film).toBeVisible();
  await expect(film).toHaveAttribute("autoplay", "");
  await expect(film).toHaveAttribute("loop", "");
  await expect(film).toHaveAttribute("muted", "");
  await expect(film).toHaveAttribute("playsinline", "");

  await film.evaluate((video: HTMLVideoElement) => video.pause());
  await film.evaluate((video: HTMLVideoElement) => { video.currentTime = 4.8; });
  await expect.poll(() => film.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(4.7);
  expect(await film.evaluate((video: HTMLVideoElement) => video.duration)).toBeGreaterThan(11);
});

test("new homepage keeps the approved mobile composition compact", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1024) >= 640, "Mobile-only layout check");
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: /One Quote. Better Options./ })).toBeVisible();
  const primary = page.getByRole("link", { name: "Check My Quote", exact: true });
  const secondary = page.getByRole("link", { name: "Send My Material List", exact: true });
  const primaryBox = await primary.boundingBox();
  const secondaryBox = await secondary.boundingBox();
  expect(primaryBox?.width ?? 0).toBeGreaterThan(180);
  expect(primaryBox?.width ?? 0).toBeLessThan(260);
  expect(secondaryBox?.width ?? 0).toBeGreaterThan(180);
  expect(secondaryBox?.width ?? 0).toBeLessThan(260);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("Shop opens the full responsive construction department showroom", async ({
  page,
}) => {
  await page.goto("/shop");

  await expect(page).toHaveTitle(
    "Order Construction Materials | Avantia Build",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Order Construction Materials",
    }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Frame & Structure" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Deals & Liquidation" }),
  ).toBeVisible();
  await expect(
    page.getByText("Don't see the exact item?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find an item" }),
  ).toHaveAttribute("href", "/request-quote?request=custom-item");
  await expect(page.locator("main details")).toHaveCount(8);

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("Learn More opens the cinematic nine-video Avantia story", async ({
  page,
}) => {
  await page.goto("/how-it-works");

  await expect(
    page.getByRole("heading", { name: /Everything your project needs/ }),
  ).toBeVisible();
  const videos = page.locator("main video");
  await expect(videos).toHaveCount(10);
  for (const slug of [
    "request",
    "crew",
    "suppliers",
    "products",
    "designer-order",
    "designer-desk",
    "calls",
    "cost",
    "busy",
  ]) {
    await expect(
      page.locator(`track[src="/videos/avantia-story/${slug}.vtt"]`),
    ).toHaveCount(1);
  }
  await expect(
    page.getByRole("link", { name: "Send a material request" }).first(),
  ).toHaveAttribute("href", "/shop");

  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test("primary customer routes remain available in Menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const drawer = page.getByRole("complementary", { name: "Site navigation" });
  const navigation = page.getByRole("navigation", {
    name: "Mobile full navigation",
  });
  await expect(drawer).toBeVisible();
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox?.width).toBeCloseTo(page.viewportSize()?.width ?? 0, 0);
  expect(drawerBox?.height).toBeCloseTo(page.viewportSize()?.height ?? 0, 0);
  await expect(
    navigation.getByRole("link", { name: "Home", exact: true }),
  ).toHaveCount(0);
  await navigation.getByRole("button", { name: /Shop Materials/ }).click();
  await expect(
    drawer.getByRole("link", { name: /Shop overview/ }),
  ).toHaveAttribute("href", "/shop");
  await drawer.getByRole("button", { name: "Back to main menu" }).click();
  await expect(
    navigation.getByRole("link", { name: /Request Material Pricing/ }),
  ).toHaveAttribute("href", "/request-quote");
  await expect(
    navigation.getByRole("link", { name: /Beat My Quote/ }),
  ).toHaveAttribute("href", "/beat-a-quote");
  await expect(
    drawer.getByRole("link", { name: "Account", exact: true }),
  ).toHaveAttribute("href", "/login");
  await expect(
    drawer.getByRole("button", { name: "Ver página en español" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});
