import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { managerPipelineStage } from "@/lib/manager-dashboard";

const root = process.cwd();

test("manager dashboard is the employee daily command center", async () => {
  const [page, shell, goalActions] = await Promise.all([
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "app/admin/goals-progress/goal-actions.ts"), "utf8"),
  ]);

  expect(page).toContain("requireManagerPortalProfile");
  expect(page).toContain("Received / needs shopping");
  expect(page).toContain("Priced / not sent");
  expect(page).toContain("Waiting for client");
  expect(page).toContain("Payment received / delivery");
  expect(page).toContain("client_quote_status");
  expect(page).toContain("Goals &amp; targets");
  expect(page).toContain('assignee="carlos"');
  expect(page).toContain('assignee="david"');
  expect(page.indexOf('assignee="carlos"')).toBeLessThan(page.indexOf('assignee="david"'));
  expect(page).toContain("Daily tools");
  expect(page).toContain("Supplier quotes");
  expect(page).toContain("Compare prices");
  expect(shell.indexOf('{ href: "/admin/build-map", label: "Dashboard"')).toBeLessThan(shell.indexOf('{ href: "/admin/users", label: "Customers"'));
  expect(shell).toContain('const homeHref = "/admin/build-map"');
  expect(goalActions).toContain('revalidatePath("/admin/build-map")');
});

test("request pipeline moves work through pricing, approval, and delivery", () => {
  const request = { id: "request-1", status: "submitted" };

  expect(managerPipelineStage(request, [], [])).toBe("received");
  expect(managerPipelineStage(request, [], [{ request_id: request.id }])).toBe("pricing");
  expect(managerPipelineStage(request, [{ request_id: request.id, status: "review", client_quote_status: "sent" }], [])).toBe("pricing");
  expect(managerPipelineStage({ ...request, status: "in_review" }, [{ request_id: request.id, status: "awarded", client_quote_status: "accepted" }], [])).toBe("approval");
  expect(managerPipelineStage({ ...request, status: "quoted" }, [], [])).toBe("delivery");
});
