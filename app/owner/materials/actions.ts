"use server";

import type { OwnerMaterialsAdminState } from "@/lib/owner-materials-admin-data";
import { getOwnerMaterialsAdminState, publishOwnerMaterialsRows, saveOwnerMaterialsAdminState, unpublishOwnerMaterialsRows } from "@/lib/owner-materials-admin-store";

export async function saveOwnerMaterialsAdmin(nextState: OwnerMaterialsAdminState) {
  return saveOwnerMaterialsAdminState(nextState);
}

export async function restoreOwnerMaterialsAdminBatches() {
  return getOwnerMaterialsAdminState();
}

export async function publishOwnerMaterialsSelection(nextState: OwnerMaterialsAdminState, batchId: string, rowIds: string[]) {
  return publishOwnerMaterialsRows(nextState, { batchId, rowIds });
}

export async function unpublishOwnerMaterialsSelection(nextState: OwnerMaterialsAdminState, batchId: string, rowIds: string[]) {
  return unpublishOwnerMaterialsRows(nextState, { batchId, rowIds });
}
