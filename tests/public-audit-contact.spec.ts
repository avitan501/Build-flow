import { expect, test } from "@playwright/test";
import { validateQuoteRequestContact } from "@/lib/quote-request-contact-validation";

test("contact alternatives retain the existing intake contract", () => {
  for (const input of [
    {fullName:"Test",email:"test@example.com",phone:""},
    {fullName:"Test",email:"",phone:"2025550100"},
    {fullName:"",email:"test@example.com",phone:"2025550100"},
  ]) expect(validateQuoteRequestContact(input)).toEqual({});
  for (const input of [
    {fullName:"",email:"",phone:""},
    {fullName:"",email:"test@example.com",phone:""},
    {fullName:"",email:"",phone:"2025550100"},
    {fullName:"Test",email:"invalid",phone:""},
    {fullName:"Test",email:"",phone:"123"},
  ]) expect(Object.keys(validateQuoteRequestContact(input)).length).toBeGreaterThan(0);
});

test("invalid material request focuses the missing contact and keeps the draft", async ({ page }) => {
  await page.goto("/request-quote");
  await page.getByLabel("Name", {exact:true}).fill("TEST VALIDATION ONLY");
  await page.getByLabel("What do you need?").fill("20 sheets of drywall");
  await page.getByRole("button",{name:"Send request"}).click();
  await expect(page.getByRole("textbox",{name:"Email",exact:true})).toBeFocused();
  await expect(page.getByRole("textbox",{name:"Email",exact:true})).toHaveAttribute("aria-invalid","true");
  await expect(page.getByLabel("What do you need?")).toHaveValue("20 sheets of drywall");
});

test("retired category links return a real 404 with useful alternatives", async ({request}) => {
  for (const path of ["/shop/bathroom","/shop/flip-package","/shop/interior-finish"]) {
    const response=await request.get(path);
    expect(response.status()).toBe(404);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(await response.text()).toContain("Material request");
  }
});

test("Start by Text retains keyboard focus without sending a message", async({page})=>{
  let sends=0;
  await page.route("**/api/public/start-by-text",route=>{sends+=1;return route.abort();});
  await page.goto("/shop");
  const trigger=page.getByRole("button",{name:"Start by Text"});
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for(let i=0;i<12;i++){
    await page.keyboard.press("Tab");
    expect(await page.getByRole("dialog").evaluate(el=>el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(sends).toBe(0);
});

test("Start by Text becomes a compact one-tap control while reading on a phone", async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/shop?category=Liquidation");
  const bar=page.getByTestId("public-contact-bar");
  await expect(bar).toHaveAttribute("data-compact","false");
  await page.evaluate(()=>window.scrollTo(0,240));
  await expect(bar).toHaveAttribute("data-compact","true");
  await expect.poll(async()=> (await bar.locator("> div").boundingBox())?.width ?? 999).toBeLessThanOrEqual(50);
  await bar.getByRole("button",{name:"Start by Text"}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
