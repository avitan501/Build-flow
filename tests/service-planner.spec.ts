import { test, expect } from "@playwright/test";
import editor from "../lib/service-planner/editor.generated.json";
import runtime from "../lib/service-planner/runtime.generated.json";
import seed from "../lib/service-planner/seed.json";
import { plannerSchema } from "../lib/service-planner/schema";
import { readFileSync } from "node:fs";

test("seed matches the latest approved table and generated sources", () => {
  expect(plannerSchema.safeParse(seed).success).toBe(true);
  expect(seed.rows[9].department).toBe("Plumbing, Electrical & HVAC");
  expect(seed.rows[5].services).toEqual([true,true,false,false,true,false,false]);
  expect(seed.fees).toEqual(Array(7).fill(""));
  expect(editor).toBe(readFileSync("lib/service-planner/editor.html", "utf8"));
  expect(runtime).toBe(readFileSync("lib/service-planner/runtime.html", "utf8"));
  expect(plannerSchema.safeParse({ ...seed, rows: seed.rows.slice(1) }).success).toBe(false);
});

test("server saves, reload, selections, history, print privacy, and mobile fit", async ({ page }) => {
  let state = structuredClone(seed), revision = 0;
  const history: { state: typeof seed; revision: number; savedAt: string }[] = [];
  await page.route("http://planner.test/**", async route => {
    if (route.request().url().includes("/api/")) {
      if (route.request().method() === "PUT") {
        const incoming = route.request().postDataJSON();
        if (incoming.revision !== revision) return route.fulfill({ status: 409, json: {} });
        history.unshift({ state, revision, savedAt: new Date().toISOString() });
        expect(incoming.state.rows[0].solutionIds).toEqual(seed.rows[0].solutionIds);
        state = incoming.state; revision++;
        return route.fulfill({ json: { revision } });
      }
      return route.fulfill({ json: { state, revision, history } });
    }
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>window.plannerInitial=${JSON.stringify({ state, revision })}</script>${editor}${runtime}</body></html>` });
  });
  await page.goto("http://planner.test/owner/service-planner");
  await expect(page.locator("#av-body tr[data-row-id]")).toHaveCount(17);
  await expect(page.getByRole("checkbox", { name: /solution — .*?(One supplier contact|Reorder through WhatsApp|Compare quotes)/ })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Internal fee — Takeoff", exact: true }).fill("$50 internal fee");
  await expect(page.getByRole("status")).toHaveText("Saved to Avantia");
  const row = page.locator('#av-body tr[data-row-id="5"]');
  await row.getByText("Choose pains", { exact: true }).click();
  await row.getByRole("checkbox", { name: "Framing — pain — 📦 Missing materials / documents", exact: true }).check();
  await row.getByRole("textbox", { name: "What this takes off your plate — Framing", exact: true }).fill("My framer sends the list directly to Avantia.");
  await expect(page.getByRole("status")).toHaveText("Saved to Avantia");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Internal fee — Takeoff", exact: true })).toHaveValue("$50 internal fee");
  await expect(page.locator('#av-body tr[data-row-id="5"]').locator(".picked").first()).toContainText("Missing materials");
  await page.getByRole("button", { name: "Customer preview", exact: true }).click();
  await expect(page.locator(".fees")).toBeHidden();
  await expect(page.locator("#customer")).toContainText("My framer sends the list directly to Avantia.");
  await expect(page.locator("#customer")).not.toContainText("One supplier contact");
  await expect(page.locator(".benefits")).toContainText("Reorder through WhatsApp");
  await expect(page.locator("#customer")).not.toContainText("$50");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".fees")).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Back to editing" }).click();
  await page.getByRole("button", { name: "Saved versions" }).click();
  await expect(page.locator("#versions")).toContainText("Restore version 0");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: /Restore version 0/ }).click();
  await expect(page.getByRole("status")).toHaveText("Saved to Avantia");
  await expect(page.getByRole("textbox", { name: "Internal fee — Takeoff", exact: true })).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("conflicting and failed saves keep edits and never claim success", async ({ page }) => {
  let failure = 503, attempts = 0;
  await page.route("http://planner.test/**", route => {
    if (route.request().url().includes("/api/")) { attempts++; return route.fulfill({ status: failure, json: {} }); }
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>window.plannerInitial=${JSON.stringify({ state: seed, revision: 0 })}</script>${editor}${runtime}` });
  });
  await page.goto("http://planner.test/owner/service-planner");
  const fee = page.getByRole("textbox", { name: "Internal fee — Takeoff", exact: true });
  await fee.fill("$20");
  await expect(page.getByRole("status")).toContainText("Not saved");
  await expect(fee).toHaveValue("$20");
  failure = 409;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("alert")).toContainText("Another tab");
  await fee.fill("$50");
  await page.waitForTimeout(600);
  expect(attempts).toBe(2);
  await expect(fee).toHaveValue("$50");
  await expect(page.getByRole("status")).toContainText("Not saved");
});

test("merged subcontractor column preserves legacy saved choices and pinned headings", async ({ page }) => {
  const state = structuredClone(seed);
  state.rows[0].items = "Blueprints, designer plans, survey Printing ";
  state.rows[0].services[5] = false;
  state.rows[0].services[6] = true;
  state.fees[6] = "$40 previous review fee";
  let saved = structuredClone(state);
  await page.route("http://planner.test/**", async route => {
    if (route.request().url().includes("/api/")) {
      saved = route.request().postDataJSON().state;
      return route.fulfill({ json: { revision: 7 } });
    }
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>window.plannerInitial=${JSON.stringify({ state, revision: 6 })}</script>${editor}${runtime}` });
  });
  await page.goto("http://planner.test/owner/service-planner");
  await expect(page.locator(".sheet thead tr:first-child th")).toHaveCount(11);
  await expect(page.locator(".checklabel input")).toHaveCount(119);
  await expect(page.getByRole("columnheader", { name: /Material Cost Review/ })).toHaveCount(0);
  const merged = page.getByRole("checkbox", { name: "Plans — Subcontractor check", exact: true });
  await expect(merged).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Internal fee — Subcontractor check", exact: true })).toHaveValue("$40 previous review fee");
  await page.getByRole("textbox", { name: "Items — Plans", exact: true }).fill("My saved printing list");
  await expect(page.getByRole("status")).toHaveText("Saved to Avantia");
  expect(saved.rows[0].services).toEqual(state.rows[0].services);
  expect(saved.fees).toEqual(state.fees);
  await merged.uncheck();
  await expect(page.getByRole("status")).toHaveText("Saved to Avantia");
  expect(saved.rows[0].services.slice(5)).toEqual([false, false]);
  const sheet = page.locator(".sheet");
  await sheet.scrollIntoViewIfNeeded();
  await sheet.evaluate(el => { el.scrollTop = 500; el.scrollLeft = 400; });
  const top = await sheet.boundingBox();
  const heading = await page.locator(".sheet thead th").first().boundingBox();
  expect(Math.abs(heading!.y - top!.y)).toBeLessThan(2);
  expect(Math.abs(heading!.x - top!.x)).toBeLessThan(2);
  await expect(page.locator(".benefits")).toContainText("One payment to Avantia. We pay your suppliers.");
  await expect(page.locator(".benefits")).toContainText("Store doesn’t deliver? We arrange delivery.");
  await expect(page.locator(".benefits")).toContainText("Urgent material needs?");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("sub communication saves independently and surveys stay editable at the bottom", async ({ page }) => {
  let state = plannerSchema.parse(structuredClone(seed)), revision = 1;
  await page.route("http://planner.test/**", async route => {
    if (route.request().url().includes("/api/")) {
      const incoming = route.request().postDataJSON();
      state = plannerSchema.parse(incoming.state);
      return route.fulfill({ json: { revision: ++revision } });
    }
    return route.fulfill({ contentType: "text/html", body: `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>window.plannerInitial=${JSON.stringify({ state, revision })}</script>${editor}${runtime}` });
  });
  await page.goto("http://planner.test/owner/service-planner");
  await expect(page.locator("#av-body tr[data-row-id]").last()).toHaveAttribute("data-row-id", "3");
  await expect(page.getByRole("checkbox", { name: "Framing — Talk to your subs", exact: true })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Framing — Talk to your subs", exact: true }).check();
  await page.getByRole("textbox", { name: "Internal fee — Talk to your subs", exact: true }).fill("$30 internal");
  await expect(page.getByRole("status")).toHaveText("Saved to Avantia");
  expect(state.rows[5].services).toEqual(seed.rows[5].services);
  expect(state.rows[5].communicateWithSubs).toBe(true);
  expect(state.fees).toEqual(seed.fees);
  expect(state.communicationFee).toBe("$30 internal");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Framing — Talk to your subs", exact: true })).toBeChecked();
  await page.getByRole("textbox", { name: "Items — Surveys", exact: true }).fill("My optional surveys");
  await expect(page.getByRole("status")).toHaveText("Saved to Avantia");
  expect(state.rows[3].items).toBe("My optional surveys");
  expect(state.rows.map(row => row.id)).toEqual(seed.rows.map(row => row.id));
  await page.getByRole("button", { name: "Customer preview", exact: true }).click();
  await expect(page.locator("#customer tbody tr").last()).toContainText("My optional surveys");
  await expect(page.locator("#customer")).toContainText("Additional services / packages");
  await expect(page.locator("#customer")).toContainText("Talk to your subs");
  await expect(page.locator("#customer")).not.toContainText("$30 internal");
});
