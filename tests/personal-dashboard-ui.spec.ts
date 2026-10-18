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

const personalUrl = `${url}/personal`;
const titles = ["מעיל ספר תורה", "הסכם חיבור עם חרזי", "אסיפת כסף מדרעי"];

test.beforeEach(async ({ context, request, baseURL }) => {
  test.skip(!baseURL || !/127\.0\.0\.1:3107/.test(baseURL), "Isolated dashboard fixture only.");
  await request.post(`${fixture}/__qa/reset`);
  await authenticate(context);
  await request.post(`${fixture}/rest/v1/personal_dashboard_tasks`, { data: titles.map((title) => ({ owner_id: userId, title })) });
});

async function openPersonal(page: Page) {
  await page.goto(personalUrl);
  await expect(page.getByTestId("task-arena")).toHaveAttribute("data-ready", "true");
}

test("private board navigation, saved CRUD, archive/restore and business separation", async ({ page, request }) => {
  test.setTimeout(60000);
  await page.goto(url);
  await expect(page.locator("[data-task-circle]")).toHaveCount(6);
  await page.getByRole("link", { name: "משימות פרטיות · Personal tasks", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${personalUrl}$`));
  await expect(page.locator("[data-task-circle]")).toHaveCount(3);
  await expect(page.getByText("Personal tasks · Only you")).toBeVisible();
  await page.getByRole("switch", { name: "Task motion" }).click();
  await page.getByRole("button", { name: `Open task: ${titles[0]}`, exact: true }).click();
  await expect(page.getByLabel("Show Carlos")).toHaveCount(0);
  await page.getByLabel("Context", { exact: true }).fill("הערה פרטית");
  await page.getByLabel("Next step", { exact: true }).fill("לבקש הצעה");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId("task-arena")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: `Open task: ${titles[0]}`, exact: true }).click();
  await expect(page.getByLabel("Context", { exact: true })).toHaveValue("הערה פרטית");
  await page.getByRole("button", { name: "Mark complete", exact: true }).click();
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await page.getByRole("button", { name: `Open task: ${titles[0]}`, exact: true }).click();
  await page.getByRole("button", { name: "Reopen task" }).click();
  await page.getByRole("button", { name: "My workspace", exact: true }).click();
  await page.getByRole("button", { name: "Add Task", exact: true }).click();
  await page.getByLabel("Task name", { exact: true }).fill("משימה אישית נוספת");
  await page.getByRole("button", { name: "Add to my workspace" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open task: משימה אישית נוספת", exact: true }).click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await page.getByRole("button", { name: "Yes, delete task" }).click();
  await expect(page.locator("[data-task-circle]")).toHaveCount(3);
  await page.reload();
  await expect(page.getByTestId("task-arena")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Archived tasks", exact: true }).click();
  await page.getByRole("button", { name: "Open task: משימה אישית נוספת", exact: true }).click();
  await page.getByRole("button", { name: "Restore task" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "David Dashboard", exact: true }).click();
  await expect(page.locator("[data-task-circle]")).toHaveCount(6);
  await expect(page.getByRole("button", { name: `Open task: ${titles[0]}`, exact: true })).toHaveCount(0);
  const state = await (await request.get(`${fixture}/__qa/state`)).json();
  expect(state.tasks).toHaveLength(6);
  expect(state.personalTasks).toHaveLength(4);
  expect(state.personalTasks[0]).toMatchObject({ status: "open", summary: "הערה פרטית", next_step: "לבקש הצעה", owner_id: userId });
  expect(state.personalTasks[3].status).toBe("open");
});

test("personal circles move, pause for touch/dialog, fit phone and desktop", async ({ page }, testInfo) => {
  test.setTimeout(60000);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await openPersonal(page);
    await page.getByTestId("task-arena").scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const circles = page.locator("[data-task-circle]");
    const before = await circles.first().boundingBox();
    await page.waitForTimeout(600);
    const after = await circles.first().boundingBox();
    expect(Math.hypot(after!.x-before!.x, after!.y-before!.y)).toBeGreaterThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const arena = await page.getByTestId("task-arena").boundingBox();
    const boxes = await circles.evaluateAll((nodes) => nodes.map((n) => { const r=n.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; }));
    for (let i=0;i<boxes.length;i++) {
      const a=boxes[i];
      expect(a.x).toBeGreaterThanOrEqual(arena!.x-1);
      expect(a.x+a.w).toBeLessThanOrEqual(arena!.x+arena!.width+1);
      for (const b of boxes.slice(i+1)) expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThanOrEqual(a.w-1);
    }
    const first = page.getByRole("button", { name: `Open task: ${titles[0]}`, exact: true });
    const hit = await first.boundingBox();
    if (testInfo.project.name === "mobile-safari") await page.touchscreen.tap(hit!.x+hit!.width/2, hit!.y+hit!.height/2);
    else { await page.mouse.move(hit!.x+hit!.width/2, hit!.y+hit!.height/2); await first.click(); }
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Task name", { exact: true })).toHaveAttribute("dir", "auto");
    const close = page.getByRole("button", { name: "Close task" });
    if (testInfo.project.name === "mobile-safari") await close.tap(); else await close.click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const resume = await first.boundingBox();
    await expect.poll(async () => {
      const moved = await first.boundingBox();
      return Math.hypot(moved!.x-resume!.x,moved!.y-resume!.y);
    }).toBeGreaterThan(1);
    await page.screenshot({ path: testInfo.outputPath(`personal-${width}.png`), fullPage: true });
  }
});

test("private route blocks staff and locked owner without exposing titles", async ({ page, context }) => {
  await context.clearCookies();
  await authenticate(context, "owner", false);
  await page.goto(personalUrl);
  await expect(page.getByRole("button", { name: "Open board" })).toBeVisible();
  await expect(page.getByText(titles[0], { exact: true })).toHaveCount(0);
  await context.clearCookies();
  await authenticate(context, "staff", true);
  await page.goto(personalUrl);
  await expect(page).not.toHaveURL(new RegExp(`${personalUrl}$`));
  await expect(page.getByText(titles[0], { exact: true })).toHaveCount(0);
});
