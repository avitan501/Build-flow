import { expect, test } from "@playwright/test";

test("public contact bar opens a compact text sheet with WhatsApp hidden", async ({
  page,
}) => {
  await page.goto("/");

  const bar = page.getByTestId("public-contact-bar");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: "Open chat" })).toBeVisible();
  await expect(
    bar.getByRole("button", { name: "Start by Text" }),
  ).toBeVisible();
  await expect(page.getByTestId("cinematic-mobile-action")).toHaveCount(0);

  // The Next.js development toolbar occupies the bottom-left corner on the
  // mobile test viewport. Production has no such toolbar, so open the same
  // sheet through the unobstructed primary dock action.
  await bar.getByRole("button", { name: "Start by Text" }).click();

  const dialog = page.getByRole("dialog", { name: "Start with one text." });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("contact-sheet-video")).toBeVisible();
  await expect(dialog.getByTestId("contact-sheet-video")).toHaveAttribute(
    "autoplay",
    "",
  );
  await expect(dialog.getByTestId("contact-sheet-video-stage")).toHaveClass(
    /aspect-\[4\/5\]/,
  );
  await expect(dialog.getByTestId("contact-sheet-video")).toHaveClass(
    /object-cover/,
  );
  await expect(dialog.getByRole("link", { name: /Open chat/ })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "Terms" })).toHaveAttribute(
    "href",
    "/terms",
  );
  await expect(dialog.getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/privacy",
  );

  const contentOrder = await dialog.evaluate((element) => {
    const phone = element.querySelector<HTMLInputElement>(
      'input[name="phone"]',
    );
    const video = element.querySelector<HTMLElement>(
      '[data-testid="contact-sheet-video"]',
    );
    const terms = Array.from(element.querySelectorAll("a")).find(
      (link) => link.textContent === "Terms",
    );
    if (!phone || !video || !terms) return null;
    return {
      phoneBeforeVideo: Boolean(
        phone.compareDocumentPosition(video) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      videoBeforeTerms: Boolean(
        video.compareDocumentPosition(terms) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    };
  });
  expect(contentOrder).toEqual({
    phoneBeforeVideo: true,
    videoBeforeTerms: true,
  });

  const submit = dialog.getByRole("button", { name: "Send text" });
  await expect(submit).toBeDisabled();
  await dialog.getByLabel("Where should we text you?").fill("(516) 555-0123");
  await expect(submit).toBeEnabled();
});

test("start-by-text sends only the phone, consent, and honeypot to the public endpoint", async ({
  page,
}) => {
  let requestBody: unknown = null;
  await page.route("**/api/public/start-by-text", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, delivery: "sent" }),
    });
  });
  await page.goto("/how-it-works");

  await page
    .getByTestId("public-contact-bar")
    .getByRole("button", { name: "Start by Text" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start with one text." });
  await dialog.getByLabel("Where should we text you?").fill("+1 516 555 0199");
  await dialog.getByRole("button", { name: "Send text" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Text sent." }),
  ).toBeVisible();
  expect(requestBody).toMatchObject({
    phone: "+1 516 555 0199",
    consent: true,
    website: "",
  });
  expect((requestBody as { idempotencyKey?: string }).idempotencyKey).toMatch(
    /^[a-f0-9-]{20,80}$/i,
  );
});

test("start-by-text shows a safe server error and remains usable", async ({
  page,
}) => {
  await page.route("**/api/public/start-by-text", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Please wait before requesting another text.",
      }),
    }),
  );
  await page.goto("/");

  await page
    .getByTestId("public-contact-bar")
    .getByRole("button", { name: "Start by Text" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start with one text." });
  await dialog.getByLabel("Where should we text you?").fill("5165550100");
  await dialog.getByRole("button", { name: "Send text" }).click();

  await expect(dialog.getByRole("alert")).toHaveText(
    "Please wait before requesting another text.",
  );
  await expect(dialog.getByRole("button", { name: "Send text" })).toBeEnabled();
});

test("a recent starter request never pretends a second SMS was sent", async ({
  page,
}) => {
  await page.route("**/api/public/start-by-text", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, delivery: "already_sent" }),
    }),
  );
  await page.goto("/");

  await page
    .getByTestId("public-contact-bar")
    .getByRole("button", { name: "Start by Text" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start with one text." });
  await dialog.getByLabel("Where should we text you?").fill("5165550100");
  await dialog.getByRole("button", { name: "Send text" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Text already requested." }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Check your existing Avantia conversation."),
  ).toBeVisible();
});

test("partial delivery retries only the missing example with the same key", async ({
  page,
}) => {
  const requests: Array<{ phone: string; idempotencyKey: string }> = [];
  await page.route("**/api/public/start-by-text", async (route) => {
    const body = route.request().postDataJSON() as {
      phone: string;
      idempotencyKey: string;
    };
    requests.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        delivery: requests.length === 1 ? "partial" : "sent",
      }),
    });
  });
  await page.goto("/");
  await page
    .getByTestId("public-contact-bar")
    .getByRole("button", { name: "Start by Text" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start with one text." });
  await dialog.getByLabel("Where should we text you?").fill("5165550100");
  await dialog.getByRole("button", { name: "Send text" }).click();
  await expect(dialog.getByRole("button", { name: "Retry example" })).toBeVisible();
  await dialog.getByRole("button", { name: "Retry example" }).click();
  await expect(dialog.getByRole("heading", { name: "Text sent." })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1].idempotencyKey).toBe(requests[0].idempotencyKey);

  await dialog.getByRole("button", { name: "Use another number" }).click();
  await dialog.getByLabel("Where should we text you?").fill("5165550199");
  await dialog.getByRole("button", { name: "Send text" }).click();
  expect(requests[2].idempotencyKey).not.toBe(requests[0].idempotencyKey);
});

test("contact bar uses a strict marketing allowlist and never overlaps the mobile dock", async ({
  page,
}) => {
  for (const path of ["/", "/how-it-works", "/shop"]) {
    await page.goto(path);
    await expect(page.getByTestId("public-contact-bar"), path).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Mobile homepage" }),
      path,
    ).toHaveCount(0);
  }

  for (const path of [
    "/request-quote",
    "/materials",
    "/delivery",
    "/account",
    "/login",
    "/admin/build-map",
  ]) {
    await page.goto(path);
    await expect(page.getByTestId("public-contact-bar"), path).toHaveCount(0);
  }
});

test("the homepage opens a six-video swipeable walkthrough", async ({
  page,
}) => {
  await page.goto("/");
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await page.getByTestId("public-contact-bar").getByRole("button", { name: "Start by Text" }).click();
    await page.getByRole("button", { name: "See full 6-step flow" }).click();
  } else {
    await page.getByRole("button", { name: "Open chat" }).click();
    await page.getByRole("button", { name: "See full 6-step flow" }).click();
  }

  const dialog = page.getByRole("dialog", { name: "See the full flow." });
  await expect(dialog).toBeVisible();
  const carousel = dialog.getByTestId("demo-video-carousel");
  await expect(carousel.locator("[data-demo-video-card]")).toHaveCount(6);
  const video = dialog.getByLabel("1 of 6: Start with one text");
  await expect(video).toHaveAttribute("playsinline", "");
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute(
    "src",
    "/videos/avantia-request-material-whatsapp-en-clear-20s.mp4",
  );
  await expect(dialog.getByText("Send the material list", { exact: true })).toBeVisible();
  await carousel.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(dialog.getByText("Coordinate delivery", { exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: "Start my request" }).click();
  await expect(
    page.getByRole("dialog", { name: "Start with one text." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("text submission acknowledges the click immediately while delivery finishes", async ({
  page,
}) => {
  await page.route("**/api/public/start-by-text", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, delivery: "sent" }),
    });
  });
  await page.goto("/");
  await page
    .getByTestId("public-contact-bar")
    .getByRole("button", { name: "Start by Text" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Start with one text." });
  await dialog.getByLabel("Where should we text you?").fill("5165550199");
  await dialog.getByRole("button", { name: "Send text" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Starting your text…" }),
  ).toBeVisible({ timeout: 500 });
  await expect(
    dialog.getByRole("heading", { name: "Text sent." }),
  ).toBeVisible();
});

test("walkthrough respects reduced motion and closes cleanly when navigation hides the launcher", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await page.getByTestId("public-contact-bar").getByRole("button", { name: "Start by Text" }).click();
    await page.getByRole("button", { name: "See full 6-step flow" }).click();
  } else {
    await page.getByRole("button", { name: "Open chat" }).click();
    await page.getByRole("button", { name: "See full 6-step flow" }).click();
  }
  const video = page.getByLabel("1 of 6: Start with one text");
  await expect(video).toBeVisible();
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).paused),
    )
    .toBe(true);

  await page.goto("/materials");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
});
