import type { DavidDashboardItem } from "@/components/buildflow/david-dashboard-board";

const OWNER_TASK_KEYS = new Set(["whatsapp-coexistence", "abc-private-pricing"]);

export function isWorkspaceTask(item: DavidDashboardItem) {
  return item.item_kind === "task" && (
    item.source_chat_title === "David Dashboard" ||
    item.source_chat_title?.startsWith("Codex Avantia") ||
    item.task_key.startsWith("carlos-fixed-") || OWNER_TASK_KEYS.has(item.task_key)
  );
}

export function taskWorkflowHref(item: DavidDashboardItem): string | null {
  if (item.next_step.startsWith("/") && !item.next_step.startsWith("//") && !item.next_step.includes("\\")) return item.next_step;
  if (item.task_key === "carlos-fixed-client-target") return "/admin/goals-progress/client-target";
  if (item.task_key.includes("abc-")) return "/admin/abc";
  if (item.task_key === "carlos-fixed-supplier-affiliate-program" || item.task_key === "carlos-fixed-supplier-partnerships" || item.task_key === "codex-avantia-lowes-partnership") return "/admin/supplier-network";
  if (item.task_key === "codex-avantia-first-profitable-offer") return "/owner/service-planner";
  if (item.task_key.startsWith("codex-avantia-quote-")) return "/admin/supplier-quotes";
  if (item.task_key === "codex-avantia-contractor-pilot") return "/owner/service-planner/interviews";
  return null;
}
