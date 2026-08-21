import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { managerPipelineStage } from "@/lib/manager-dashboard";

const root = process.cwd();

test("manager dashboard is the employee daily command center", async () => {
  const [page, shell, goalActions, dashboardActions, todayTasks] = await Promise.all([
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/goal-actions.ts"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/actions.ts"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-today-tasks.tsx"), "utf8"),
  ]);

  expect(page).toContain("requireManagerPortalProfile");
  expect(page).toContain("Received / needs shopping");
  expect(page).toContain("Priced / not sent");
  expect(page).toContain("Waiting for client");
  expect(page).toContain("Payment received / delivery");
  expect(page).toContain("client_quote_status");
  expect(page).toContain("Carlos targets");
  expect(page).toContain('assignee="carlos"');
  expect(page).toContain('assignee="david"');
  expect(page.indexOf('assignee="carlos"')).toBeLessThan(page.indexOf('assignee="david"'));
  expect(page).toContain("Manager tools");
  expect(page).toContain("ManagerTodayTasks");
  expect(page).toContain("TODAY_TASK_PREFIX");
  expect(page).toContain("ManagerDashboardAiSearch");
  expect(page).toContain("Dashboard AI search");
  expect(page).toContain("EmployeeClockStatus");
  expect(page.indexOf('id="pipeline-heading"')).toBeLessThan(page.indexOf("<ManagerTodayTasks tasks"));
  expect(page).toContain("todaySummary?.checkInAt");
  expect(page).toContain("Supplier Quotes");
  expect(page).toContain("Quote Comparison");
  expect(shell).toContain('<span className="min-w-0 flex-1">Manager Dashboard</span>');
  expect(shell).toContain('{ href: "/admin/users", label: "Customer Directory"');
  expect(shell).toContain('const homeHref = "/admin/build-map"');
  expect(shell).toContain('{ href: "/admin/communications", label: "Aura Communications"');
  expect(shell).not.toContain('{ href: "/owner/aura", label: "Aura Communications"');
  expect(shell).toContain("EmployeeActivityReporter");
  expect(goalActions).toContain('revalidatePath("/admin/build-map")');
  expect(dashboardActions).toContain("createTodayTaskAction");
  expect(dashboardActions).toContain("setTodayTaskCompletedAction");
  expect(dashboardActions).toContain('.like("details", `${TODAY_TASK_PREFIX}%`)');
  expect(todayTasks).toContain("Today&apos;s tasks");
  expect(todayTasks).toContain('aria-label="Add a task"');
  expect(todayTasks).toContain("America/New_York");
  expect(todayTasks).toContain('role="checkbox"');
});

test("request pipeline moves work through pricing, approval, and delivery", () => {
  const request = { id: "request-1", status: "submitted" };

  expect(managerPipelineStage(request, [], [])).toBe("received");
  expect(managerPipelineStage(request, [], [{ request_id: request.id }])).toBe("pricing");
  expect(managerPipelineStage(request, [{ request_id: request.id, status: "review", client_quote_status: "sent" }], [])).toBe("pricing");
  expect(managerPipelineStage({ ...request, status: "in_review" }, [{ request_id: request.id, status: "awarded", client_quote_status: "accepted" }], [])).toBe("approval");
  expect(managerPipelineStage({ ...request, status: "quoted" }, [], [])).toBe("delivery");
});
