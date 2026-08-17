import { expect, test } from "@playwright/test";

test("cinematic homepage presents Construction Concierge clearly", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Avantia Build | Construction Materials, Handled.");
  await expect(page.getByText("Avantia Construction Concierge", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Construction Materials, Priced and Delivered." })).toBeVisible();
  await expect(page.getByText("Send us your plans or material list. We compare suppliers, organize your order, and coordinate jobsite delivery.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start a Material Request" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Start a Material Request" })).toHaveAttribute("href", "/shop", { timeout: 4000 });
  await expect(page.getByRole("link", { name: "See How It Works" })).toHaveAttribute("href", "/how-it-works");
  const homepageHeader = page.getByTestId("site-header");
  await expect(homepageHeader.getByRole("button", { name: "Open navigation menu" })).toHaveText("Menu");
  await expect(homepageHeader.getByRole("link", { name: "Avantia Build home" })).toHaveCount(0);
  await expect(homepageHeader.getByRole("link", { name: "Log in" })).toHaveCount(0);

  const heroVideos = page.locator("main section").first().locator("video");
  const heroMobileVideo = heroVideos.first();
  const heroDesktopVideo = heroVideos.nth(1);
  await expect(heroVideos).toHaveCount(2);
  await expect(heroMobileVideo).toHaveAttribute("autoplay", "");
  await expect(heroMobileVideo).toHaveAttribute("muted", "");
  await expect(heroMobileVideo.locator('source[type="video/mp4"]')).toHaveAttribute("src", "/videos/avantia-hero-background-v13-mobile.mp4");
  await expect(heroMobileVideo).toHaveAttribute("poster", "/videos/avantia-hero-background-v13-mobile-poster.png");
  await expect(heroMobileVideo).toHaveAttribute("data-loop-end", "12.25");
  await expect(heroDesktopVideo.locator('source[type="video/mp4"]')).toHaveAttribute("src", "/videos/avantia-hero-background-v13-desktop.mp4");
  await expect(heroDesktopVideo).toHaveAttribute("poster", "/videos/avantia-hero-background-v13-desktop-poster.png");
  await expect(heroDesktopVideo).toHaveAttribute("data-loop-end", "12.25");
  await expect(page.locator("main section").first().locator('img[alt="Avantia Build"]')).toHaveCount(0);
  await expect(page.locator("main section").first().locator("[aria-hidden=true] span.rounded-full")).toHaveCount(0);
  const activeHeroVideo = (page.viewportSize()?.width ?? 1280) < 640 ? heroMobileVideo : heroDesktopVideo;
  await activeHeroVideo.evaluate((video) => {
    video.currentTime = 12.4;
    video.dispatchEvent(new Event("timeupdate"));
  });
  await expect.poll(() => activeHeroVideo.evaluate((video) => video.currentTime)).toBeLessThan(1.5);
  await expect(page.getByRole("button", { name: "Ver página en español" })).toHaveText("ES");
  await expect(page.getByRole("heading", { name: "One place for material pricing and delivery." })).toBeVisible();
  await expect(page.locator("main video")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Less purchasing work. More building." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Serving 41 states." })).toBeVisible();
  await expect(page.getByTestId("coverage-map").getByTestId("coverage-dot")).toHaveCount(41);
  await expect(page.getByRole("heading", { name: "Shop Our Brands" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause brand logos" })).toBeVisible();

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("homepage switches all principal sales content to Spanish", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver página en español" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { name: "Materiales cotizados y entregados." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Iniciar solicitud" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Un solo lugar para precios y entrega de materiales." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Menos compras. Más construcción." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Servicio en 41 estados." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Marcas que conseguimos" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1024) < 640) {
    await page.getByRole("button", { name: "Materials" }).click();
  }
  await expect(page.getByRole("heading", { name: "Shop materials" })).toBeVisible();
});

test("homepage shop stays compact and expandable on phones", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1024) >= 640, "Mobile-only compact controls");
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Services", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-testid="fast-service-grid"] a:visible')).toHaveCount(4);
  await page.getByRole("button", { name: "View all services" }).click();
  await expect(page.locator('[data-testid="fast-service-grid"] a:visible')).toHaveCount(9);

  await page.getByRole("button", { name: "Materials" }).click();
  await expect(page.getByRole("heading", { name: "Shop materials" })).toBeVisible();
  await expect(page.locator('[data-testid="department-card"]:visible')).toHaveCount(6);
  await page.getByRole("button", { name: "View all materials" }).click();
  await expect(page.locator('[data-testid="department-card"]:visible')).toHaveCount(15);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect(page.getByRole("link", { name: "Start Order" })).toHaveAttribute("href", "/shop");
});

test("Learn More provides seven distinct shareable service videos", async ({ page }) => {
  await page.goto("/how-it-works");

  await expect(page.getByRole("heading", { name: "Seven ways Avantia keeps material purchasing off your plate." })).toBeVisible();
  const videos = page.locator('main video');
  await expect(videos).toHaveCount(7);
  for (const slug of ["crew-downtime", "ai-takeoff", "supplier-comparison", "personal-shopper", "order-control", "delivery-coordination", "nationwide-sourcing"]) {
    await expect(page.locator(`source[src="/videos/marketing/${slug}.mp4"]`)).toHaveCount(1);
    await expect(page.locator(`track[src="/videos/marketing/${slug}.vtt"]`)).toHaveCount(1);
  }
  await page.getByRole("button", { name: "Ver página en español" }).click();
  await expect(page.getByRole("heading", { name: "Siete maneras en que Avantia simplifica la compra de materiales." })).toBeVisible();

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("primary customer routes remain available in Menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const drawer = page.getByRole("complementary", { name: "Site navigation" });
  const navigation = page.getByRole("navigation", { name: "Mobile full navigation" });
  await expect(drawer).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Order Materials", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Get Material Pricing", exact: true })).toHaveAttribute("href", "/request-quote");
  await expect(navigation.getByRole("link", { name: "Beat a Supplier Quote", exact: true })).toHaveAttribute("href", "/beat-a-quote");
  await expect(drawer.getByRole("link", { name: "Log in", exact: true })).toHaveAttribute("href", "/login");
});
