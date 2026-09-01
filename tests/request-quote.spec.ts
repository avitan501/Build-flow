import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("preferred reply methods persist in normal and fallback request storage", async () => {
  const [form, action, fallback] = await Promise.all([
    readFile(
      path.join(root, "components/buildflow/quote-request-form.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/request-quote/actions.ts"), "utf8"),
    readFile(
      path.join(root, "supabase/functions/public-quote-intake/index.ts"),
      "utf8",
    ),
  ]);

  expect(form).toContain('name="contactMethods"');
  expect(form).toContain("maxAttachmentCount = 10");
  expect(form).toContain("multiple");
  expect(form).toContain("selectedFiles.map");
  expect(action).toContain("contact_methods: intakePayload.contactMethods");
  expect(action).toContain('.getAll("attachment")');
  expect(action).toContain("for (const attachment of attachments)");
  expect(fallback).toContain('questionId: "preferred_contact"');
  expect(fallback).toContain("contact_methods: contactMethods.length");
});

test("public requests accept one name and require both contacts only when name is omitted", async () => {
  const [form, action, emailDelivery, fallback] = await Promise.all([
    readFile(
      path.join(root, "components/buildflow/quote-request-form.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/request-quote/actions.ts"), "utf8"),
    readFile(path.join(root, "lib/cart-submission-email.ts"), "utf8"),
    readFile(
      path.join(root, "supabase/functions/public-quote-intake/index.ts"),
      "utf8",
    ),
  ]);

  expect(form).not.toContain('name="email" required');
  expect(form).not.toContain('name="phone" required');
  expect(form).toContain(
    "Use one name and email or phone. With no name, enter both.",
  );
  expect(form).not.toContain('name="fullName" required');
  expect(action).toContain("if (!fullNameInput && (!email || !phone))");
  expect(action).not.toContain("including first and last name");
  expect(action).toContain("phoneLoginEmailForPhone");
  expect(emailDelivery).toContain("sendClient: Boolean(input.email)");
  expect(fallback).toContain(
    "name ? Boolean(email || phone) : Boolean(email && phone)",
  );
  expect(fallback).toContain("phone-login.buildflow.local");
});

test("quote request is a compact contact and material workflow", async ({
  page,
}) => {
  await page.goto("/request-quote");

  await expect(page).toHaveURL(/\/request-quote$/);
  await expect(
    page.getByRole("heading", { name: "Send your material list" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.getByTestId("quote-request-form")).toBeVisible();
  await expect(page.getByText("BLDR", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute(
    "placeholder",
    "Name (optional)",
  );
  await expect(page.getByLabel("First name")).toHaveCount(0);
  await expect(page.getByLabel("Last name")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).not.toHaveAttribute("required", "");
  await expect(page.getByLabel("Phone", { exact: true })).not.toHaveAttribute(
    "required",
    "",
  );
  await expect(
    page.getByText(
      "Use one name and email or phone. With no name, enter both.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Company", { exact: true })).toHaveAttribute(
    "placeholder",
    "Company (optional)",
  );
  await expect(page.getByLabel(/Project name/)).toHaveCount(0);
  await expect(page.getByText(/I am a/)).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Mobile homepage" }),
  ).toHaveCount((page.viewportSize()?.width ?? 0) < 1024 ? 1 : 0);
  await expect(page.getByLabel("What do you need?")).toHaveAttribute(
    "placeholder",
    "Paste your list or request any item. We’ll look for it.",
  );
  await expect(
    page.getByText("PDF, photo, or blueprint.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("PDF, photos, or blueprints · up to 10", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Need materials or pricing?", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("site-header").getByTestId("avantia-build-lockup"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Call \(516\) 908-8319/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "WhatsApp" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Text" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Call" })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Email" })).not.toBeChecked();
  const attachment = page.getByLabel(/Attach plans or material lists/);
  await expect(attachment).toBeVisible();
  await expect(attachment).toHaveAttribute(
    "accept",
    ".pdf,.jpg,.jpeg,.png,.webp",
  );
  await expect(attachment).toHaveAttribute("multiple", "");
  await attachment.setInputFiles([
    {
      name: "first-list.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("first"),
    },
    {
      name: "second-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("second"),
    },
  ]);
  await expect(page.getByText("2 files selected")).toBeVisible();
  await expect(page.getByText("first-list.pdf")).toBeVisible();
  await expect(page.getByText("second-photo.jpg")).toBeVisible();
  await expect(page.getByText(/Maximum 25 MB/)).toHaveCount(0);
  await expect(
    page.getByText("By sending this request", { exact: false }),
  ).toHaveCount(0);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  if ((page.viewportSize()?.width ?? 0) > 1000) {
    expect(
      (await page.getByTestId("quote-request-form").boundingBox())?.width ?? 0,
    ).toBeGreaterThan(600);
  }
});

test("take care products open detailed Avantia panels and prefill the request", async ({
  page,
}) => {
  await page.goto("/request-quote?request=high-end");

  await expect(
    page.getByRole("heading", { name: "Take Care of Yourself request" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("department-essentials").locator("article"),
  ).toHaveCount(10);

  await page
    .getByRole("button", { name: "View Noam2 Shabbat Water Bar" })
    .click();
  const dialog = page.getByTestId("essential-product-dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Noam2 Shabbat Water Bar" }),
  ).toBeVisible();
  const photos = dialog.getByRole("button", {
    name: /View photo .* Noam2 Shabbat Water Bar/,
  });
  await expect(photos).toHaveCount(3);
  await photos.nth(1).click();
  await expect(photos.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(
    dialog.getByText("Automatic Shabbat mode with a calendar through 2054"),
  ).toBeVisible();
  await expect(
    dialog.getByText("17.7 in. H x 12.5 in. W x 14 in. D"),
  ).toBeVisible();

  await dialog.getByRole("link", { name: "Request this item" }).click();
  await expect(page).toHaveURL(/request=high-end&item=Noam2/);
  await expect(page.getByLabel("What do you need?")).toHaveValue(
    "Please provide pricing and availability for: Noam2 Shabbat Water Bar",
  );
});

test("custom glass explains the options and opens an editable detail request", async ({
  page,
}) => {
  await page.goto("/request-quote?request=high-end");
  await page.getByRole("button", { name: "View Custom Glass" }).click();

  const dialog = page.getByTestId("essential-product-dialog");
  await expect(
    dialog.getByRole("heading", { name: "Custom Glass" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /View photo .* Custom Glass/ }),
  ).toHaveCount(3);
  await expect(dialog.getByText("Width x height and thickness")).toBeVisible();
  await dialog.getByRole("link", { name: "Request this item" }).click();

  const details = page.getByLabel("What do you need?");
  await expect(details).toContainText("Product type:");
  await expect(details).toContainText("Width x height:");
  await details.fill(
    "Custom shower glass, 72 x 84 in., 3/8 in. thick, quantity 1",
  );
  await expect(details).toHaveValue(
    "Custom shower glass, 72 x 84 in., 3/8 in. thick, quantity 1",
  );
});

test("beat a quote is a dedicated upload request", async ({ page }) => {
  await page.goto("/beat-a-quote");

  await expect(
    page.getByRole("heading", {
      name: "Upload a Quote. We'll Try to Beat It.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to Home" }),
  ).toHaveAttribute("href", "/");
  await expect(page.getByLabel("Attach supplier quotes")).toBeVisible();
  await expect(page.locator('input[name="requestKind"]')).toHaveValue(
    "beat_quote",
  );
  await expect(page.getByRole("button", { name: "Send quote" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Framing" })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Mobile homepage" }),
  ).toHaveCount((page.viewportSize()?.width ?? 0) < 1024 ? 1 : 0);

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Mobile full navigation" })
      .getByRole("link", { name: /Request Material Pricing/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Mobile full navigation" })
      .getByRole("link", { name: /Beat My Quote/ }),
  ).toBeVisible();
});

test("plan over the storage limit stays on the form and shows a useful error", async ({
  page,
}) => {
  await page.goto("/request-quote");
  await page.getByLabel("Name", { exact: true }).fill("Large Plan Test Client");
  await page.getByRole("textbox", { name: "Email" }).fill("client@example.com");
  await page
    .getByLabel("What do you need?")
    .fill("Please quote the attached construction plan.");
  await page.getByLabel(/Attach plans or material lists/).setInputFiles({
    name: "large-plan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
  });

  const form = page.getByTestId("quote-request-form");
  await expect(form.getByRole("alert")).toContainText("too large");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(
    page.getByRole("heading", { name: "Send your material list" }),
  ).toBeVisible();
  await expect(page.getByText("This page couldn’t load")).toHaveCount(0);

  await form.getByRole("button", { name: "Remove all files" }).click();
  await expect(form.getByRole("alert")).toHaveCount(0);
});

test("missing contact details stay inline without clearing the request", async ({
  page,
}) => {
  await page.goto("/request-quote");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("client@example.com");
  await page
    .getByLabel("What do you need?")
    .fill("Please price 20 sheets of drywall.");
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page).toHaveURL(/\/request-quote$/);
  await expect(
    page
      .getByTestId("quote-request-form")
      .getByText("Enter a name, or enter both email and phone.", {
        exact: true,
      }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).toHaveValue("client@example.com");
  await expect(page.getByLabel("What do you need?")).toHaveValue(
    "Please price 20 sheets of drywall.",
  );
});

test("one-word name is accepted by validation and missing contact stays inline", async ({
  page,
}) => {
  await page.goto("/request-quote");
  await page.getByLabel("Name", { exact: true }).fill("Carlos");
  await page
    .getByLabel("What do you need?")
    .fill("Please price framing lumber.");
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(
    page
      .getByTestId("quote-request-form")
      .getByText("Enter an email address or phone number.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Carlos");
  await expect(page.getByLabel("What do you need?")).toHaveValue(
    "Please price framing lumber.",
  );
});
