export type ManagerPipelineStage = "received" | "pricing" | "approval" | "delivery";

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
  const accepted = requestComparisons.some((comparison) => comparison.client_quote_status === "accepted" || comparison.status === "awarded");
  if (request.status === "approved" || accepted) return "delivery";

  const sent = requestComparisons.some((comparison) => comparison.client_quote_status === "sent");
  if (["waiting_for_client", "quoted"].includes(request.status) || sent) return "approval";

  if (requestComparisons.length > 0 || supplierPackages.some((supplierPackage) => supplierPackage.request_id === request.id)) return "pricing";
  return "received";
}
