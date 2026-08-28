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
  await expect(page.getByRole("button", { name: "Pause background video" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause brand logos" })).toHaveCount(0);

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("homepage video reaches the top and does not reserve a hidden bottom dock", async ({ page }) => {
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-testid="site-header"]');
    const hero = document.querySelector<HTMLElement>("[data-homepage-hero]");
    const main = document.querySelector<HTMLElement>("main");

    return {
      headerPosition: header ? getComputedStyle(header).position : null,
      heroTop: hero?.getBoundingClientRect().top ?? null,
      mainPaddingBottom: main ? getComputedStyle(main).paddingBottom : null,
    };
  });

  expect(layout.headerPosition).toBe("fixed");
  expect(layout.heroTop).not.toBeNull();
  expect(Math.abs(layout.heroTop ?? 0)).toBeLessThanOrEqual(16);
  expect(layout.mainPaddingBottom).toBe("0px");
});

test("desktop hero scales with the page instead of cropping at narrower widths", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/");

  const hero = page.locator("[data-homepage-hero]");
  const desktopVideo = hero.locator("video").nth(1);
  const heroBox = await hero.boundingBox();
  const desktopVideoBox = await desktopVideo.boundingBox();

  expect(heroBox).not.toBeNull();
  expect(desktopVideoBox).not.toBeNull();
  expect(heroBox!.width / heroBox!.height).toBeCloseTo(16 / 9, 1);
  expect(desktopVideoBox!.width).toBeCloseTo(heroBox!.width, 0);
  expect(desktopVideoBox!.height).toBeCloseTo(heroBox!.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
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
  await expect(page.getByText("Shop Materials", { exact: true })).toBeVisible();
});

test("homepage material departments stay compact and expandable on phones", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1024) >= 640, "Mobile-only compact showroom");
  await page.goto("/");

  const showroom = page.getByRole("region", { name: "Shop materials" });
  const showroomDisclosure = showroom.locator(":scope > details");
  await expect(showroomDisclosure).not.toHaveAttribute("open", "");
  await showroom.getByText("Shop Materials", { exact: true }).click();
  await expect(showroomDisclosure).toHaveAttribute("open", "");
  await expect(showroom.getByRole("heading", { name: "Frame & Structure" })).toBeVisible();
  await expect(showroom.locator("details details")).toHaveCount(8);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await expect(page.getByRole("link", { name: "Start Order" })).toHaveAttribute("href", "/shop");
});

test("Order Materials opens the full responsive service and department hub", async ({ page }) => {
  await page.goto("/shop");

  const departments = page.locator("main details");
  await expect(departments).toHaveCount(8);
  await expect(page.getByRole("heading", { name: "Frame & Structure" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deals & Liquidation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Don't see the exact item?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find an item" })).toHaveAttribute("href", "/request-quote?request=custom-item");
  await expect(page.getByRole("link", { name: /Send a list/ })).toHaveAttribute("href", "/request-quote");

  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("Learn More opens the cinematic nine-story Avantia experience", async ({ page }) => {
  await page.goto("/how-it-works");

  await expect(page.getByRole("heading", { name: /Everything your project needs/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /One job.*Too many calls/ })).toBeAttached();
  await expect(page.getByRole("heading", { name: "What did the material actually cost?" })).toBeAttached();
  await expect(page.getByText("Plumbing", { exact: true })).toBeAttached();
  await expect(page.getByText("Lighting & fixtures", { exact: true })).toBeAttached();
  await expect(page.getByText("Special & custom items", { exact: true })).toBeAttached();
  const videos = page.locator('main video');
  await expect(videos).toHaveCount(10);
  await expect(page.getByRole("button", { name: /background video/ })).toBeVisible();
  for (const [file, caption] of [
    ["01-contractor-request", "request"],
    ["02-contractor-crew-moving", "crew"],
    ["03-supplier-partner-network", "suppliers"],
    ["04-supplier-send-products", "products"],
    ["05-designer-order-coordination", "designer-order"],
    ["06-designer-materials-desk", "designer-desk"],
    ["07-many-calls-one-job", "calls"],
    ["08-material-actual-cost", "cost"],
    ["09-job-gets-busy", "busy"],
  ]) {
    await expect(page.locator(`source[src="/videos/avantia-story/${file}.mp4"]`)).toHaveCount(1);
    await expect(page.locator(`track[src="/videos/avantia-story/${caption}.vtt"]`)).toHaveCount(1);
  }
  await expect(page.getByRole("link", { name: /Send a material request/ })).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("link", { name: /Text \(516\) 908-8319/ })).toHaveAttribute("href", "tel:+15169088319");
  await expect(page.getByRole("main").getByRole("link", { name: "office@build.avantiap.com" })).toHaveAttribute("href", "mailto:office@build.avantiap.com");

  await page.getByRole("button", { name: "Play How many calls for one job?" }).click();
  await expect.poll(async () => page.locator("main video").evaluateAll((items) => items.filter((item) => !item.paused).length)).toBeLessThanOrEqual(1);

  const cinematicWidth = await page.getByRole("main").evaluate((main) => main.getBoundingClientRect().width);
  expect(cinematicWidth).toBeCloseTo(page.viewportSize()?.width ?? cinematicWidth, 0);

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflows).toBe(false);
});

test("primary customer routes remain available in Menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const drawer = page.getByRole("complementary", { name: "Site navigation" });
  const navigation = page.getByRole("navigation", { name: "Mobile full navigation" });
  await expect(drawer).toBeVisible();
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox?.width).toBeCloseTo(page.viewportSize()?.width ?? 0, 0);
  expect(drawerBox?.height).toBeCloseTo(page.viewportSize()?.height ?? 0, 0);
  await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  const shopButton = navigation.getByRole("button", { name: /Shop Materials/ });
  await expect(shopButton).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Request Material Pricing/ })).toHaveAttribute("href", "/request-quote");
  await expect(navigation.getByRole("link", { name: /Beat My Quote/ })).toHaveAttribute("href", "/beat-a-quote");
  await shopButton.click();
  await expect(drawer.getByRole("link", { name: /Shop overview/ })).toHaveAttribute("href", "/shop");
  await drawer.getByRole("button", { name: "Back to main menu" }).click();
  await expect(drawer.getByRole("link", { name: "Log in", exact: true })).toHaveAttribute("href", "/login");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});
