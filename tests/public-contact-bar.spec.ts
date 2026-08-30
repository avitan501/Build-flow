import { expect, test } from "@playwright/test";

test("public contact bar opens a compact WhatsApp and text sheet", async ({ page }) => {
  await page.goto("/");

  const bar = page.getByTestId("public-contact-bar");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Open chat" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Text me to start" })).toBeVisible();
  await expect(page.getByTestId("cinematic-mobile-action")).toHaveCount(0);

  await bar.getByRole("button", { name: "Open chat" }).click();

  const dialog = page.getByRole("dialog", { name: "Text me to start" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("contact-sheet-video")).toBeVisible();
  await expect(dialog.getByTestId("contact-sheet-video")).toHaveAttribute("autoplay", "");
  await expect(dialog.getByRole("link", { name: /Open chat/ })).toHaveAttribute(
    "href",
    /https:\/\/wa\.me\/15169088319/,
  );
  await expect(dialog.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  await expect(dialog.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");

  const contentOrder = await dialog.evaluate((element) => {
    const phone = element.querySelector<HTMLInputElement>('input[name="phone"]');
    const video = element.querySelector<HTMLElement>('[data-testid="contact-sheet-video"]');
    const terms = Array.from(element.querySelectorAll("a")).find((link) => link.textContent === "Terms");
    if (!phone || !video || !terms) return null;
    return {
      phoneBeforeVideo: Boolean(phone.compareDocumentPosition(video) & Node.DOCUMENT_POSITION_FOLLOWING),
      videoBeforeTerms: Boolean(video.compareDocumentPosition(terms) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  expect(contentOrder).toEqual({ phoneBeforeVideo: true, videoBeforeTerms: true });

  const submit = dialog.getByRole("button", { name: "Text me" });
  await expect(submit).toBeDisabled();
  await dialog.getByLabel("Text this number").fill("(516) 555-0123");
  await expect(submit).toBeEnabled();
});

test("start-by-text sends only the phone, consent, and honeypot to the public endpoint", async ({ page }) => {
  let requestBody: unknown = null;
  await page.route("**/api/public/start-by-text", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/how-it-works");

  await page.getByTestId("public-contact-bar").getByRole("button", { name: "Text me to start" }).click();
  const dialog = page.getByRole("dialog", { name: "Text me to start" });
  await dialog.getByLabel("Text this number").fill("+1 516 555 0199");
  await dialog.getByRole("button", { name: "Text me" }).click();

  await expect(dialog.getByRole("heading", { name: "Check your texts" })).toBeVisible();
  expect(requestBody).toMatchObject({ phone: "+1 516 555 0199", consent: true, website: "" });
  expect((requestBody as { idempotencyKey?: string }).idempotencyKey).toMatch(/^[a-f0-9-]{20,80}$/i);
});

test("start-by-text shows a safe server error and remains usable", async ({ page }) => {
  await page.route("**/api/public/start-by-text", (route) => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ error: "Please wait before requesting another text." }),
  }));
  await page.goto("/");

  await page.getByTestId("public-contact-bar").getByRole("button", { name: "Text me to start" }).click();
  const dialog = page.getByRole("dialog", { name: "Text me to start" });
  await dialog.getByLabel("Text this number").fill("5165550100");
  await dialog.getByRole("button", { name: "Text me" }).click();

  await expect(dialog.getByRole("alert")).toHaveText("Please wait before requesting another text.");
  await expect(dialog.getByRole("button", { name: "Text me" })).toBeEnabled();
});

test("contact bar uses a strict marketing allowlist and never overlaps the mobile dock", async ({ page }) => {
  for (const path of ["/", "/how-it-works", "/shop"]) {
    await page.goto(path);
    await expect(page.getByTestId("public-contact-bar"), path).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Mobile homepage" }), path).toHaveCount(0);
  }

  for (const path of ["/request-quote", "/materials", "/delivery", "/account", "/login", "/admin/build-map"]) {
    await page.goto(path);
    await expect(page.getByTestId("public-contact-bar"), path).toHaveCount(0);
  }
});

test("20-second walkthrough opens in the same compact sheet and starts playing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "See How It Works" }).click();

  const dialog = page.getByRole("dialog", { name: "See how it works" });
  await expect(dialog).toBeVisible();
  const video = dialog.getByLabel("How to start an Avantia material request by text");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute("src", "/videos/avantia-request-material-whatsapp-en-clear-20s.mp4");

  await dialog.getByRole("button", { name: "Start my request" }).click();
  await expect(page.getByRole("dialog", { name: "Text me to start" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("text submission acknowledges the click immediately while delivery finishes", async ({ page }) => {
  await page.route("**/api/public/start-by-text", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/");
  await page.getByTestId("public-contact-bar").getByRole("button", { name: "Text me to start" }).click();
  const dialog = page.getByRole("dialog", { name: "Text me to start" });
  await dialog.getByLabel("Text this number").fill("5165550199");
  await dialog.getByRole("button", { name: "Text me" }).click();
  await expect(dialog.getByRole("heading", { name: "Got it — starting your text." })).toBeVisible({ timeout: 500 });
  await expect(dialog.getByRole("heading", { name: "Check your texts" })).toBeVisible();
});

test("walkthrough respects reduced motion and closes cleanly when navigation hides the launcher", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "See How It Works" }).click();
  const video = page.getByLabel("How to start an Avantia material request by text");
  await expect(video).toBeVisible();
  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);

  await page.goto("/materials");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
});
