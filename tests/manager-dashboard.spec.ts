import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { managerPipelineStage } from "@/lib/manager-dashboard";

const root = process.cwd();

test("manager dashboard is the employee daily command center", async () => {
  const [page, goalsPage, shell, goalActions, dashboardActions, todayTasks] =
    await Promise.all([
      readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
      readFile(path.join(root, "app/admin/goals-progress/page.tsx"), "utf8"),
      readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
      readFile(
        path.join(root, "app/admin/goals-progress/goal-actions.ts"),
        "utf8",
      ),
      readFile(path.join(root, "app/admin/build-map/actions.ts"), "utf8"),
      readFile(
        path.join(root, "components/buildflow/manager-today-tasks.tsx"),
        "utf8",
      ),
    ]);

  expect(page).toContain("requireManagerPortalProfile");
  expect(page).toContain("Received / needs shopping");
  expect(page).toContain("Priced / not sent");
  expect(page).toContain("Waiting for client");
  expect(page).toContain("Payment received / delivery");
  expect(page).toContain("BadgeDollarSign");
  expect(page).toContain("MessageCircleQuestion");
  expect(page).toContain("Ready for delivery");
  expect(page).not.toContain("className={`h-2.5 w-2.5 shrink-0 rounded-full");
  expect(page).toContain("client_quote_status");
  expect(page).toContain('id="targets-heading" className="font-semibold">');
  expect(page).toContain("Carlos Work");
  expect(page).not.toContain("<GoalDisclosure");
  expect(page).not.toContain('GoalDisclosure assignee="david"');
  expect(page).toContain("<CarlosGoalsWorkspace embedded />");
  expect(page).not.toContain('href="/admin/goals-progress#abc-supply-demo"');
  expect(goalsPage).toContain('title="Prepare ABC Demo"');
  expect(goalsPage).toContain('title="Build Supplier Relationships"');
  expect(page).toContain("One priority, clear tasks, and the next action.");
  expect(page).not.toContain('assignee="david"');
  expect(page).toContain("Manager tools");
  expect(page).toContain('id="phone-notifications"');
  expect(page).not.toContain("ManagerNotificationCenter");
  expect(page).toContain("<ManagerNotificationControl settings />");
  expect(page).toContain("ManagerTodayTasks");
  expect(page).toContain("TODAY_TASK_PREFIX");
  expect(page).toContain("ManagerDashboardAiSearch");
  expect(page).toContain("Dashboard AI search");
  expect(page).toContain("EmployeeClockStatus");
  expect(page.indexOf("<ManagerDashboardAiSearch")).toBeLessThan(
    page.indexOf('id="pipeline-heading"'),
  );
  expect(page.indexOf("<ManagerTodayTasks tasks")).toBeLessThan(
    page.indexOf('id="pipeline-heading"'),
  );
  expect(page).toContain("Orders &amp; Requests");
  expect(page).not.toContain(
    "Today&apos;s requests, targets, and tools in one place.",
  );
  expect(page).not.toContain(">Manager Portal<");
  expect(page).toContain("todaySummary?.checkInAt");
  expect(page).toContain("Supplier Quote Storage");
  expect(page).toContain("Quote Comparison");
  expect(page).toContain('{ href: CARLOS_MEETING_URL, label: "Google Meet" }');
  expect(shell).toContain(
    '<span className="min-w-0 flex-1">Manager Dashboard</span>',
  );
  expect(shell).toContain('{ href: "/admin/users", label: "CRM"');
  expect(shell).toContain('const homeHref = "/admin/build-map"');
  expect(shell).toContain(
    '<span className="min-w-0 flex-1">Communications</span>',
  );
  expect(shell.indexOf("Communications")).toBeGreaterThan(
    shell.indexOf("</nav>"),
  );
  expect(shell).not.toContain('label: "Aura Communications"');
  expect(shell).not.toContain('label: "Manager Settings"');
  expect(shell).toContain("EmployeeActivityReporter");
  expect(goalActions).toContain('revalidatePath("/admin/build-map")');
  expect(dashboardActions).toContain("createTodayTaskAction");
  expect(dashboardActions).toContain("setTodayTaskCompletedAction");
  expect(dashboardActions).toContain(
    '.like("details", `${TODAY_TASK_PREFIX}%`)',
  );
  expect(todayTasks).toContain(">Focus<");
  expect(todayTasks).toContain("Carlos&apos;s current priorities");
  expect(todayTasks).toContain('aria-label="Add a task"');
  expect(todayTasks).toContain("America/New_York");
  expect(todayTasks).toContain('role="checkbox"');
});

test("request pipeline moves work through pricing, approval, and delivery", () => {
  const request = { id: "request-1", status: "submitted" };

  expect(managerPipelineStage(request, [], [])).toBe("received");
  expect(managerPipelineStage(request, [], [{ request_id: request.id }])).toBe(
    "pricing",
  );
  expect(
    managerPipelineStage(
      request,
      [
        {
          request_id: request.id,
          status: "review",
          client_quote_status: "sent",
        },
      ],
      [],
    ),
  ).toBe("pricing");
  expect(
    managerPipelineStage(
      { ...request, status: "in_review" },
      [
        {
          request_id: request.id,
          status: "awarded",
          client_quote_status: "accepted",
        },
      ],
      [],
    ),
  ).toBe("approval");
  expect(managerPipelineStage({ ...request, status: "quoted" }, [], [])).toBe(
    "delivery",
  );
});
