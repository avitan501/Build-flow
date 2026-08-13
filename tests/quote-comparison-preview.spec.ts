import { expect, test } from "@playwright/test";

test("staff can prepare a branded client quote without exposing private pricing", async ({ page }) => {
  await page.goto("/preview/quote-comparison");
  await expect(page.getByRole("heading", { name: "Prepare the client quote" })).toBeVisible();
  await expect(page.getByTestId("avantia-build-lockup").first()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Select supplier" }).first().click();
  await expect(page.getByText(/Pricing from Five Towns Building Supply/)).toBeVisible();

  await page.getByLabel("Markup for all").fill("22");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Private profit")).toBeVisible();

  await page.getByRole("button", { name: "Preview client copy" }).click();
  const preview = page.getByRole("dialog", { name: "Branded quote preview" });
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Jacob Darry")).toBeVisible();
  await expect(preview.getByText("Quote total")).toBeVisible();
  await expect(preview).not.toContainText("Supplier cost");
  await expect(preview).not.toContainText("Private profit");
  await expect(preview).not.toContainText("Markup");

  await preview.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Send to client" })).toBeEnabled();
});
