import { createHmac } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const url = "/admin/goals-progress/website-work";
const fixture = "http://127.0.0.1:3117";
const userId = "11111111-1111-4111-8111-111111111111";

async function authenticate(context: BrowserContext, role = "owner", pin = true) {
  const expires = Math.floor(Date.now() / 1000) + 36000;
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: expires, iat: expires - 36000, role: "authenticated", testRole: role })).toString("base64url")}.local-test-only`;
  const session = { access_token: jwt, refresh_token: "local-test-only", token_type: "bearer", expires_at: expires, expires_in: 36000, user: { id: userId } };
  const cookies = [{ name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, domain: "127.0.0.1", path: "/" }];
  if (pin) cookies.push({ name: "avantia_website_work_access", value: `${expires}.${createHmac("sha256", "dashboard-local-test-only").update(`${userId}.${expires}`).digest("base64url")}`, domain: "127.0.0.1", path: url });
  await context.addCookies(cookies);
}

async function open(page: Page) {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Great things are built one step at a time." })).toBeVisible();
  await expect(page.getByTestId("task-arena")).toHaveAttribute("data-ready", "true");
}

async function positions(page: Page) {
  return page.getByTestId("task-arena").evaluate((arena) => {
    const outer = arena.getBoundingClientRect();
    return [...arena.querySelectorAll<HTMLElement>("[data-task-circle]")].map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x - outer.x, y: rect.y - outer.y, size: rect.width, width: outer.width, height: outer.height };
    });
  });
}

test.beforeEach(async ({ context, request, baseURL }) => {
  test.skip(!baseURL || !/127\.0\.0\.1:3107/.test(baseURL), "Run only against the isolated dashboard fixture on 3107/3117.");
  await request.post(`${fixture}/__qa/reset`);
  await authenticate(context);
});

test("real server actions add, edit, complete, reopen, share, delete and restore tasks", async ({ page, request }) => {
  test.setTimeout(60000);
  await open(page);
  await page.getByRole("switch", { name: "Task motion" }).click();
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  await page.getByLabel("Task name", { exact: true }).fill("New supplier agreement");
  await page.getByLabel("Next step", { exact: true }).fill("Confirm account terms");
  await page.getByRole("button", { name: "Add to my workspace" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Open task: New supplier agreement", exact: true }).click();
  await page.getByLabel("Task name", { exact: true }).fill("Supplier agreement approved for review");
  await page.getByLabel("Context", { exact: true }).fill("Check freight minimums before approval.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open task: Supplier agreement approved for review", exact: true }).click();
  await page.getByRole("button", { name: "Mark complete", exact: true }).click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open task: Supplier agreement approved for review" })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("task-arena")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await page.getByRole("button", { name: "Open task: Supplier agreement approved for review" }).click();
  await page.getByRole("button", { name: "Reopen task" }).click();
  await page.getByRole("button", { name: "My workspace", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Open task: Supplier agreement approved for review" }).click();
  await page.getByLabel("Show Carlos").click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open task: Supplier agreement approved for review" }).click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await page.getByRole("button", { name: "Keep task", exact: true }).click();
  await expect(page.getByRole("group", { name: "Confirm task deletion" })).not.toBeVisible();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await page.getByRole("button", { name: "Yes, delete task" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Archived tasks", exact: true }).click();
  await page.getByRole("button", { name: "Open task: Supplier agreement approved for review" }).click();
  await page.getByRole("button", { name: "Restore task" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const state = await (await request.get(`${fixture}/__qa/state`)).json();
  const added = state.tasks.find((task: { title: string }) => task.title === "Supplier agreement approved for review");
  expect(added).toMatchObject({ status: "open", published_to_carlos: true, summary: "Check freight minimums before approval.", next_step: "Confirm account terms" });
});

test("persistence failures keep the task and display an actionable error", async ({ page, request }) => {
  await open(page);
  await page.getByRole("switch", { name: "Task motion" }).click();
  await page.getByRole("button", { name: "Open task: Framing supplier review" }).click();
  await page.getByLabel("Task name", { exact: true }).fill("Unsaved title");
  await request.post(`${fixture}/__qa/fail-next`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("could not be saved");
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue("Unsaved title");
  const state = await (await request.get(`${fixture}/__qa/state`)).json();
  expect(state.tasks[0].title).toBe("Framing supplier review");
});

test("fixed team tasks complete through the existing Carlos goal workflow", async ({ page, request }) => {
  await request.post(`${fixture}/rest/v1/website_work_items`, { data: {
    task_key: "carlos-fixed-supplier-affiliate-program", title: "QA team partnership", category: "suppliers_pricing",
    status: "open", item_kind: "task", summary: "Team workflow test", next_step: "Review supplier terms",
    source_chat_title: "Carlos Dashboard", published_to_carlos: true,
  } });
  await open(page); await page.getByRole("switch", { name: "Task motion" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Open task: QA team partnership" }).click();
  await page.getByRole("button", { name: "Mark complete", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open task: QA team partnership" })).toBeVisible();
  const state = await (await request.get(`${fixture}/__qa/state`)).json();
  expect(state.goals).toEqual(expect.arrayContaining([expect.objectContaining({ details: "system_goal_status:supplier-affiliate-program", status: "completed", assignee: "carlos" })]));
});

test("a stale edit cannot overwrite a newer task change", async ({ page, request }) => {
  await open(page); await page.getByRole("switch", { name: "Task motion" }).click();
  await page.getByRole("button", { name: "Open task: Framing supplier review" }).click();
  await request.patch(`${fixture}/rest/v1/website_work_items?id=eq.11111111-1111-4111-8111-000000000002`, { data: { title: "Newer teammate change" } });
  await page.getByLabel("Task name", { exact: true }).fill("Older edit");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("newer changes");
  const state = await (await request.get(`${fixture}/__qa/state`)).json();
  expect(state.tasks[0].title).toBe("Newer teammate change");
});

test("phone and desktop circles travel without overlap or page overflow; pause survives reload", async ({ page }) => {
  await page.clock.install();
  for (const width of [320, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await open(page);
    await page.getByTestId("task-arena").evaluate((element) => element.scrollIntoView({ block: "center" }));
    await page.clock.runFor(100);
    const start = await positions(page);
    expect(start[0].size).toBeCloseTo(width <= 600 ? 120 : 180, 1);
    const movement: number[] = [];
    for (let i = 0; i < 16; i++) {
      await page.clock.runFor(500);
      const actual = await positions(page);
      for (let a = 0; a < actual.length; a++) {
        const x = actual[a];
        expect(x.x).toBeGreaterThanOrEqual(11.5); expect(x.y).toBeGreaterThanOrEqual(11.5);
        expect(x.x + x.size).toBeLessThanOrEqual(x.width - 11.5);
        expect(x.y + x.size).toBeLessThanOrEqual(x.height - 11.5);
        for (let b = a + 1; b < actual.length; b++) expect(Math.hypot(x.x - actual[b].x, x.y - actual[b].y)).toBeGreaterThanOrEqual(x.size + 9);
      }
      movement.push(Math.hypot(actual[0].x - start[0].x, actual[0].y - start[0].y));
    }
    expect(Math.max(...movement)).toBeGreaterThan(35);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("switch", { name: "Task motion" }).click();
  const paused = await positions(page);
  await page.clock.runFor(1500);
  expect(await positions(page)).toEqual(paused);
  await page.reload();
  await expect(page.getByRole("switch", { name: "Task motion" })).toHaveAttribute("aria-checked", "false");
});

test("reduced motion starts still, supports opt-in and freezes for keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install(); await open(page);
  await expect(page.getByRole("switch", { name: "Task motion" })).toHaveAttribute("aria-checked", "false");
  const still = await positions(page); await page.clock.runFor(1000); expect(await positions(page)).toEqual(still);
  await page.getByRole("switch", { name: "Task motion" }).click();
  await page.getByTestId("task-arena").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.clock.runFor(1500); expect(await positions(page)).not.toEqual(still);
  await page.keyboard.press("Tab");
  await page.locator("[data-task-circle]").first().focus();
  const focused = await positions(page); await page.clock.runFor(800); expect(await positions(page)).toEqual(focused);
});

test("real-time touch opens and closes a task, then movement resumes", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await authenticate(context);
  const page = await context.newPage(); await open(page);
  await page.getByTestId("task-arena").evaluate((element) => element.scrollIntoView({ block: "start" }));
  const circle = await page.locator("[data-task-circle]").first().boundingBox();
  await page.touchscreen.tap(circle!.x + circle!.width / 2, circle!.y + circle!.height / 2);
  await expect(page.getByRole("dialog")).toBeVisible();
  const held = await positions(page); await page.waitForTimeout(500); expect(await positions(page)).toEqual(held);
  await page.getByRole("button", { name: "Close task" }).tap();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const before = await positions(page); await page.waitForTimeout(1500); expect(await positions(page)).not.toEqual(before);
  await context.close();
});

test("owner PIN and staff boundaries still protect the private dashboard", async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  for (const [role, pin] of [["owner", false], ["staff", true], ["client", true]] as const) {
    const context = await browser.newContext({ baseURL }); await authenticate(context, role, pin);
    const page = await context.newPage(); await page.goto(url);
    await expect(page.getByRole("heading", { name: "Great things are built one step at a time." })).not.toBeVisible();
    if (role === "owner") await expect(page.locator('input[name="pin"]')).toBeVisible();
    else await expect(page).not.toHaveURL(new RegExp(`${url}$`), { timeout: 30000 });
    await context.close();
  }
});
