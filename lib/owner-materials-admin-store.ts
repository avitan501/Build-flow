import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { mapExistingCategoryToShopCategory, type ShopItemRecord } from "@/lib/shop";
import { cloneOwnerMaterialsState, ownerMaterialsSeedState, type OwnerMaterialBatchState, type OwnerMaterialRowState, type OwnerMaterialsAdminState } from "@/lib/owner-materials-admin-data";
import { createAdminClient } from "@/lib/supabase/admin";

const dataDir = path.join(process.cwd(), "data");
const statePath = path.join(dataDir, "owner-materials-admin-state.json");
const publishedItemsPath = path.join(dataDir, "owner-materials-published-shop-items.json");
const remoteAdminStateId = "singleton";

export type OwnerMaterialsStorageStatus = {
  workspace: "supabase" | "local-fallback";
  shopItems: "supabase" | "local-fallback";
  message: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDataDir();
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function asErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isRecoverableRemoteStorageError(error: unknown) {
  if (!error) return false;
  const message = asErrorMessage(error).toLowerCase();
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";

  return (
    message.includes("missing required environment variable") ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    code === "42P01" ||
    code === "PGRST205" ||
    code === "PGRST204"
  );
}

function throwSupabaseError(error: { message?: string; code?: string } | null, fallback: string): never {
  const message = error?.message || fallback;
  const nextError = new Error(message) as Error & { code?: string };
  nextError.code = error?.code;
  throw nextError;
}

async function readRemoteAdminState() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("owner_materials_admin_state")
      .select("state")
      .eq("id", remoteAdminStateId)
      .maybeSingle<{ state: OwnerMaterialsAdminState }>();

    if (error) throwSupabaseError(error, "Could not load owner materials workspace from Supabase.");
    return data?.state ?? null;
  } catch (error) {
    if (isRecoverableRemoteStorageError(error)) return null;
    throw error;
  }
}

async function writeRemoteAdminState(state: OwnerMaterialsAdminState) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("owner_materials_admin_state").upsert(
      {
        id: remoteAdminStateId,
        state,
      },
      { onConflict: "id" },
    );

    if (error) throwSupabaseError(error, "Could not save owner materials workspace to Supabase.");
    return true;
  } catch (error) {
    if (isRecoverableRemoteStorageError(error)) return false;
    throw error;
  }
}

async function readRemotePublishedShopItems() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_items")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<ShopItemRecord[]>();

    if (error) throwSupabaseError(error, "Could not load published shop items from Supabase.");
    return data ?? [];
  } catch (error) {
    if (isRecoverableRemoteStorageError(error)) return null;
    throw error;
  }
}

async function upsertRemotePublishedShopItems(items: ShopItemRecord[]) {
  if (items.length === 0) return true;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("shop_items").upsert(items, { onConflict: "id" });
    if (error) throwSupabaseError(error, "Could not publish materials to Supabase shop_items.");
    return true;
  } catch (error) {
    if (isRecoverableRemoteStorageError(error)) return false;
    throw error;
  }
}

async function deleteRemotePublishedShopItems(itemIds: string[]) {
  if (itemIds.length === 0) return true;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("shop_items").delete().in("id", itemIds);
    if (error) throwSupabaseError(error, "Could not unpublish materials from Supabase shop_items.");
    return true;
  } catch (error) {
    if (isRecoverableRemoteStorageError(error)) return false;
    throw error;
  }
}

async function canReadRemoteTable(tableName: "owner_materials_admin_state" | "shop_items") {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from(tableName).select("id").limit(1);
    if (error) throwSupabaseError(error, `Could not read ${tableName}.`);
    return true;
  } catch (error) {
    if (isRecoverableRemoteStorageError(error)) return false;
    throw error;
  }
}

async function persistAdminState(state: OwnerMaterialsAdminState) {
  const wroteRemote = await writeRemoteAdminState(state);
  if (!wroteRemote) await writeJsonFile(statePath, state);
  return state;
}

function normalizeRow(row: OwnerMaterialRowState): OwnerMaterialRowState {
  const finalUnitPrice = Number.isFinite(row.finalUnitPrice) ? row.finalUnitPrice : row.supplierUnitPrice;
  const reviewStatus = row.photoCount > 0 ? (row.finalUnitPrice > 0 ? "Ready" : "Needs review") : row.finalUnitPrice > 0 ? "Missing image" : "Needs review";
  const category = mapExistingCategoryToShopCategory(row.category, { name: row.description, description: row.description, itemNo: row.itemNo });

  return {
    ...row,
    qty: Number(row.qty) || 0,
    supplierUnitPrice: Number(row.supplierUnitPrice) || 0,
    markupPercent: Number(row.markupPercent) || 0,
    markupDollar: Number(row.markupDollar) || 0,
    finalUnitPrice,
    photoCount: Number(row.photoCount) || 0,
    galleryCount: Number(row.galleryCount) || 0,
    reviewStatus,
    category,
    publishStatus: row.publishStatus === "Published" ? "Published" : row.publishStatus === "Skipped" ? "Skipped" : "Draft",
    imageUrl: row.imageUrl || "",
    imageAlt: row.imageAlt || `${row.description} photo`,
    imageSource: row.imageSource || "Not added",
    imageLicense: row.imageLicense || "Pending",
    imageCredit: row.imageCredit || "Pending",
    imageCategory: row.imageCategory || category,
    error: undefined,
  };
}

function normalizeBatch(batch: OwnerMaterialBatchState): OwnerMaterialBatchState {
  return {
    ...batch,
    documents: Array.from(new Set(batch.documents.filter(Boolean))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    rows: batch.rows.map(normalizeRow),
  };
}

function mergeStates(saved: OwnerMaterialsAdminState | null): OwnerMaterialsAdminState {
  const seed = cloneOwnerMaterialsState(ownerMaterialsSeedState);
  if (!saved) return seed;

  const savedMap = new Map(saved.batches.map((batch) => [batch.id, normalizeBatch(batch)]));
  const mergedSeedBatches = seed.batches.map((seedBatch) => {
    const existing = savedMap.get(seedBatch.id);
    if (!existing) return seedBatch;

    const rowMap = new Map(existing.rows.map((row) => [row.id, normalizeRow(row)]));
    const mergedRows = seedBatch.rows.map((seedRow) => rowMap.get(seedRow.id) ?? seedRow);
    const customRows = existing.rows.filter((row) => !mergedRows.find((candidate) => candidate.id === row.id));

    return normalizeBatch({
      ...seedBatch,
      ...existing,
      documents: Array.from(new Set([...seedBatch.documents, ...existing.documents])),
      rows: [...mergedRows, ...customRows],
    });
  });

  const customBatches = saved.batches.filter((batch) => !seed.batches.find((seedBatch) => seedBatch.id === batch.id)).map(normalizeBatch);
  const selectedBatchId = [...mergedSeedBatches, ...customBatches].some((batch) => batch.id === saved.selectedBatchId) ? saved.selectedBatchId : seed.selectedBatchId;

  return {
    selectedBatchId,
    batches: [...mergedSeedBatches, ...customBatches],
  };
}

export async function getOwnerMaterialsAdminState() {
  const saved = (await readRemoteAdminState()) ?? (await readJsonFile<OwnerMaterialsAdminState>(statePath));
  const merged = mergeStates(saved);
  if (!saved) await persistAdminState(merged);
  return merged;
}

export async function saveOwnerMaterialsAdminState(nextState: OwnerMaterialsAdminState) {
  const merged = mergeStates(nextState);
  return persistAdminState(merged);
}

export async function getOwnerMaterialsStorageStatus(): Promise<OwnerMaterialsStorageStatus> {
  const [workspaceReady, shopItemsReady] = await Promise.all([
    canReadRemoteTable("owner_materials_admin_state"),
    canReadRemoteTable("shop_items"),
  ]);

  const workspace = workspaceReady ? "supabase" : "local-fallback";
  const shopItems = shopItemsReady ? "supabase" : "local-fallback";
  const message =
    workspaceReady && shopItemsReady
      ? "Supabase storage is connected for workspace saves and published shop items."
      : "Supabase storage is not connected yet. The page is using local fallback JSON until the migration is applied.";

  return { workspace, shopItems, message };
}

function buildPublishedItem(row: OwnerMaterialRowState, batch: OwnerMaterialBatchState, existingItem?: ShopItemRecord | null): ShopItemRecord {
  const slugBase = slugify(`${batch.supplier}-${batch.quoteNumber}-${row.itemNo || row.description}`);
  const createdAt = existingItem?.created_at ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();

  const category = mapExistingCategoryToShopCategory(row.category, { name: row.description, description: row.description, itemNo: row.itemNo });

  return {
    id: `owner-${slugBase}`,
    supplier_estimate_id: batch.id,
    supplier_name: batch.supplier,
    quote_number: batch.quoteNumber,
    pricing_date: batch.quoteDate,
    item_number: row.itemNo,
    name: row.description,
    description: row.notes?.trim() || row.description,
    category,
    quantity: row.qty,
    unit: row.unit,
    unit_price: row.finalUnitPrice,
    extended_price: row.qty * row.finalUnitPrice,
    source: "manual",
    image_url: row.imageUrl || null,
    image_alt: row.imageAlt || null,
    image_source: row.imageSource || null,
    image_license: row.imageLicense || null,
    image_credit: row.imageCredit || null,
    image_category: row.imageCategory || category,
    image_gallery:
      row.imageUrl && row.photoCount > 0
        ? [
            {
              imageUrl: row.imageUrl,
              imageAlt: row.imageAlt,
              imageSource: row.imageSource,
              imageLicense: row.imageLicense,
              imageCredit: row.imageCredit,
              imageCategory: row.imageCategory,
            },
          ]
        : null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function validatePublishableRows(rows: OwnerMaterialRowState[]) {
  return rows.filter((row) => !row.description.trim() || !row.category.trim() || !row.unit.trim() || row.finalUnitPrice <= 0);
}

export async function getLocalPublishedShopItems() {
  return (await readJsonFile<ShopItemRecord[]>(publishedItemsPath)) ?? [];
}

async function saveLocalPublishedShopItems(items: ShopItemRecord[]) {
  await writeJsonFile(publishedItemsPath, items);
}

async function getPublishedShopItemsForWrite() {
  return (await readRemotePublishedShopItems()) ?? (await getLocalPublishedShopItems());
}

async function savePublishedShopItemsForWrite(items: ShopItemRecord[]) {
  const wroteRemote = await upsertRemotePublishedShopItems(items);
  if (!wroteRemote) await saveLocalPublishedShopItems(items);
  return wroteRemote;
}

export async function publishOwnerMaterialsRows(nextState: OwnerMaterialsAdminState, options: { batchId: string; rowIds: string[] }) {
  const savedState = await saveOwnerMaterialsAdminState(nextState);
  const batch = savedState.batches.find((entry) => entry.id === options.batchId);
  if (!batch) {
    return { state: savedState, publishedCount: 0, error: "Batch not found." };
  }

  const selectedIds = new Set(options.rowIds);
  const rowsToPublish = batch.rows.filter((row) => selectedIds.has(row.id));
  const nonDraftRows = rowsToPublish.filter((row) => row.publishStatus !== "Draft");
  if (nonDraftRows.length > 0) {
    return { state: savedState, publishedCount: 0, error: "Only draft materials can be published." };
  }
  const invalidRows = validatePublishableRows(rowsToPublish);

  if (invalidRows.length > 0) {
    const errorIds = new Set(invalidRows.map((row) => row.id));
    const erroredState: OwnerMaterialsAdminState = {
      ...savedState,
      batches: savedState.batches.map((entry) =>
        entry.id !== batch.id
          ? entry
          : {
              ...entry,
              rows: entry.rows.map((row) =>
                errorIds.has(row.id) ? { ...row, error: "Missing required fields for publish." } : row,
              ),
            },
      ),
    };
    await persistAdminState(erroredState);
    return { state: erroredState, publishedCount: 0, error: `${invalidRows.length} item(s) need category, unit, description, and price before publish.` };
  }

  const publishedItems = await getPublishedShopItemsForWrite();
  const publishedMap = new Map(publishedItems.map((item) => [item.id, item]));
  const nextItems: ShopItemRecord[] = [];
  rowsToPublish.forEach((row) => {
    const nextId = `owner-${slugify(`${batch.supplier}-${batch.quoteNumber}-${row.itemNo || row.description}`)}`;
    const nextItem = buildPublishedItem(row, batch, publishedMap.get(nextId) ?? null);
    publishedMap.set(nextItem.id, nextItem);
    nextItems.push(nextItem);
  });
  const wroteRemote = await savePublishedShopItemsForWrite(nextItems);
  if (!wroteRemote) await saveLocalPublishedShopItems(Array.from(publishedMap.values()));

  const updatedState: OwnerMaterialsAdminState = {
    ...savedState,
    batches: savedState.batches.map((entry) =>
      entry.id !== batch.id
        ? entry
        : {
            ...entry,
            rows: entry.rows.map((row) =>
              selectedIds.has(row.id)
                ? { ...row, publishStatus: "Published", reviewStatus: row.photoCount > 0 ? "Ready" : row.reviewStatus, error: undefined }
                : row,
            ),
          },
    ),
  };

  await persistAdminState(updatedState);
  return { state: updatedState, publishedCount: rowsToPublish.length, error: null };
}

export async function unpublishOwnerMaterialsRows(nextState: OwnerMaterialsAdminState, options: { batchId: string; rowIds: string[] }) {
  const savedState = await saveOwnerMaterialsAdminState(nextState);
  const batch = savedState.batches.find((entry) => entry.id === options.batchId);
  if (!batch) return { state: savedState, unpublishedCount: 0 };

  const selectedIds = new Set(options.rowIds);
  const itemIds = new Set(batch.rows.filter((row) => selectedIds.has(row.id)).map((row) => buildPublishedItem(row, batch).id));
  const deletedRemote = await deleteRemotePublishedShopItems(Array.from(itemIds));
  if (!deletedRemote) {
    const publishedItems = await getLocalPublishedShopItems();
    await saveLocalPublishedShopItems(publishedItems.filter((item) => !itemIds.has(item.id)));
  }

  const updatedState: OwnerMaterialsAdminState = {
    ...savedState,
    batches: savedState.batches.map((entry) =>
      entry.id !== batch.id
        ? entry
        : {
            ...entry,
            rows: entry.rows.map((row) => (selectedIds.has(row.id) ? { ...row, publishStatus: "Draft" } : row)),
          },
    ),
  };

  await persistAdminState(updatedState);
  return { state: updatedState, unpublishedCount: itemIds.size };
}
