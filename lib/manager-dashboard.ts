export type ManagerPipelineStage = "received" | "pricing" | "approval" | "delivery";
export type ManagerRequestQueueState = "normal" | "queued" | "rush";

const managerPipelineOrder: ManagerPipelineStage[] = [
  "received",
  "pricing",
  "approval",
  "delivery",
];

export type ManagerPipelineRequest = {
  id: string;
  status: string;
};

export type ManagerPipelineComparison = {
  request_id: string | null;
  status: string;
  client_quote_status: string;
};

export type ManagerPipelineSupplierPackage = {
  request_id: string;
};

export function managerPipelineStage(
  request: ManagerPipelineRequest,
  comparisons: ManagerPipelineComparison[],
  supplierPackages: ManagerPipelineSupplierPackage[],
): ManagerPipelineStage {
  const requestComparisons = comparisons.filter((comparison) => comparison.request_id === request.id);
  if (["approved", "quoted"].includes(request.status)) return "delivery";
  if (["in_review", "waiting_for_client"].includes(request.status)) return "approval";

  if (requestComparisons.length > 0 || supplierPackages.some((supplierPackage) => supplierPackage.request_id === request.id)) return "pricing";
  return "received";
}

export function managerPipelineStageWithOverride(
  calculated: ManagerPipelineStage,
  override: unknown,
): ManagerPipelineStage {
  if (!managerPipelineOrder.includes(override as ManagerPipelineStage)) {
    return calculated;
  }

  const calculatedIndex = managerPipelineOrder.indexOf(calculated);
  const overrideIndex = managerPipelineOrder.indexOf(override as ManagerPipelineStage);
  return managerPipelineOrder[Math.max(calculatedIndex, overrideIndex)];
}

export function managerNextPipelineStage(
  stage: ManagerPipelineStage,
): ManagerPipelineStage | null {
  const currentIndex = managerPipelineOrder.indexOf(stage);
  return managerPipelineOrder[currentIndex + 1] ?? null;
}

export function normalizeManagerRequestQueueState(
  value: unknown,
): ManagerRequestQueueState {
  return value === "queued" || value === "rush" ? value : "normal";
}
