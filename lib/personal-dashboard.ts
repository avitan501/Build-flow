import type { DavidDashboardItem } from "@/components/buildflow/david-dashboard-board";

export const PERSONAL_DASHBOARD_PATH = "/admin/goals-progress/website-work/personal";

export type PersonalDashboardTask = {
  id: string;
  title: string;
  summary: string;
  next_step: string;
  status: "open" | "completed" | "archived";
  updated_at: string;
};

// Reuse the existing workspace presentation; personal records never enter the
// business task table or its team-sharing workflows.
export function personalWorkspaceItem(task: PersonalDashboardTask): DavidDashboardItem {
  return {
    ...task,
    task_key: `personal-${task.id}`,
    category: "personal",
    assigned_agent: null,
    progress_percent: task.status === "completed" ? 100 : 0,
    source_chat_title: "Personal tasks",
    item_kind: "task",
    published_to_carlos: false,
    resolution_cost: null,
  };
}
