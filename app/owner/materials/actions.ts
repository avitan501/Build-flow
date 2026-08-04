"use server";

import type { OwnerMaterialsAdminState } from "@/lib/owner-materials-admin-data";
import { requireOwnerAccess } from "@/lib/owner-access";
import { getOwnerMaterialsAdminState, publishOwnerMaterialsRows, saveOwnerMaterialsAdminState, unpublishOwnerMaterialsRows } from "@/lib/owner-materials-admin-store";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected material admin error.";
}

export async function saveOwnerMaterialsAdmin(nextState: OwnerMaterialsAdminState) {
  try {
    await requireOwnerAccess();
    const state = await saveOwnerMaterialsAdminState(nextState);
    return { ok: true as const, state, message: "Materials admin changes saved." };
  } catch (error) {
    return { ok: false as const, state: nextState, message: getErrorMessage(error) };
  }
}

export async function restoreOwnerMaterialsAdminBatches() {
  try {
    await requireOwnerAccess();
    const state = await getOwnerMaterialsAdminState();
    return { ok: true as const, state, message: "Material documents and quote batches restored." };
  } catch (error) {
    return { ok: false as const, state: null, message: getErrorMessage(error) };
  }
}

export async function publishOwnerMaterialsSelection(nextState: OwnerMaterialsAdminState, batchId: string, rowIds: string[]) {
  try {
    await requireOwnerAccess();
    const result = await publishOwnerMaterialsRows(nextState, { batchId, rowIds });
    return { ok: !result.error as boolean, ...result, message: result.error ?? `${result.publishedCount} material(s) published to shop.` };
  } catch (error) {
    return { ok: false as const, state: nextState, publishedCount: 0, error: getErrorMessage(error), message: getErrorMessage(error) };
  }
}

export async function unpublishOwnerMaterialsSelection(nextState: OwnerMaterialsAdminState, batchId: string, rowIds: string[]) {
  try {
    await requireOwnerAccess();
    const result = await unpublishOwnerMaterialsRows(nextState, { batchId, rowIds });
    return { ok: true as const, ...result, message: `${result.unpublishedCount} material(s) moved back to draft.` };
  } catch (error) {
    return { ok: false as const, state: nextState, unpublishedCount: 0, message: getErrorMessage(error) };
  }
}
