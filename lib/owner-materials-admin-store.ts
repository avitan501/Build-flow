import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { ShopItemRecord } from "@/lib/shop";
import { cloneOwnerMaterialsState, ownerMaterialsSeedState, type OwnerMaterialBatchState, type OwnerMaterialRowState, type OwnerMaterialsAdminState } from "@/lib/owner-materials-admin-data";

const dataDir = path.join(process.cwd(), "data");
const statePath = path.join(dataDir, "owner-materials-admin-state.json");
const publishedItemsPath = path.join(dataDir, "owner-materials-published-shop-items.json");

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

function normalizeRow(row: OwnerMaterialRowState): OwnerMaterialRowState {
  const finalUnitPrice = Number.isFinite(row.finalUnitPrice) ? row.finalUnitPrice : row.supplierUnitPrice;
  const reviewStatus = row.photoCount > 0 ? (row.finalUnitPrice > 0 ? "Ready" : "Needs review") : row.finalUnitPrice > 0 ? "Missing image" : "Needs review";

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
    publishStatus: row.publishStatus === "Published" ? "Published" : "Draft",
    imageUrl: row.imageUrl || "",
    imageAlt: row.imageAlt || `${row.description} photo`,
    imageSource: row.imageSource || "Not added",
    imageLicense: row.imageLicense || "Pending",
    imageCredit: row.imageCredit || "Pending",
    imageCategory: row.imageCategory || row.category || "Materials",
    error: undefined,
  };
}

function normalizeBatch(batch: OwnerMaterialBatchState): OwnerMaterialBatchState {
  return {
    ...batch,
    documents: Array.from(new Set(batch.documents.filter(Boolean))),
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
  const saved = await readJsonFile<OwnerMaterialsAdminState>(statePath);
  const merged = mergeStates(saved);
  if (!saved) await writeJsonFile(statePath, merged);
  return merged;
}

export async function saveOwnerMaterialsAdminState(nextState: OwnerMaterialsAdminState) {
  const merged = mergeStates(nextState);
  await writeJsonFile(statePath, merged);
  return merged;
}

function buildPublishedItem(row: OwnerMaterialRowState, batch: OwnerMaterialBatchState): ShopItemRecord {
  const slugBase = slugify(`${batch.supplier}-${batch.quoteNumber}-${row.itemNo || row.description}`);
  const createdAt = new Date().toISOString();

  return {
    id: `owner-${slugBase}`,
    supplier_estimate_id: batch.id,
    supplier_name: batch.supplier,
    quote_number: batch.quoteNumber,
    pricing_date: batch.quoteDate,
    item_number: row.itemNo,
    name: row.description,
    description: row.notes?.trim() || row.description,
    category: row.category,
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
    image_category: row.imageCategory || null,
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
    updated_at: createdAt,
  };
}

export async function getLocalPublishedShopItems() {
  return (await readJsonFile<ShopItemRecord[]>(publishedItemsPath)) ?? [];
}

async function saveLocalPublishedShopItems(items: ShopItemRecord[]) {
  await writeJsonFile(publishedItemsPath, items);
}

export async function publishOwnerMaterialsRows(nextState: OwnerMaterialsAdminState, options: { batchId: string; rowIds: string[] }) {
  const savedState = await saveOwnerMaterialsAdminState(nextState);
  const batch = savedState.batches.find((entry) => entry.id === options.batchId);
  if (!batch) {
    return { state: savedState, publishedCount: 0, error: "Batch not found." };
  }

  const selectedIds = new Set(options.rowIds);
  const rowsToPublish = batch.rows.filter((row) => selectedIds.has(row.id));
  const invalidRows = rowsToPublish.filter((row) => !row.description.trim() || !row.category.trim() || !row.unit.trim() || row.finalUnitPrice <= 0);

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
    await writeJsonFile(statePath, erroredState);
    return { state: erroredState, publishedCount: 0, error: `${invalidRows.length} item(s) need category, unit, description, and price before publish.` };
  }

  const publishedItems = await getLocalPublishedShopItems();
  const publishedMap = new Map(publishedItems.map((item) => [item.id, item]));
  rowsToPublish.forEach((row) => {
    publishedMap.set(buildPublishedItem(row, batch).id, buildPublishedItem(row, batch));
  });
  await saveLocalPublishedShopItems(Array.from(publishedMap.values()));

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

  await writeJsonFile(statePath, updatedState);
  return { state: updatedState, publishedCount: rowsToPublish.length, error: null };
}

export async function unpublishOwnerMaterialsRows(nextState: OwnerMaterialsAdminState, options: { batchId: string; rowIds: string[] }) {
  const savedState = await saveOwnerMaterialsAdminState(nextState);
  const batch = savedState.batches.find((entry) => entry.id === options.batchId);
  if (!batch) return { state: savedState, unpublishedCount: 0 };

  const selectedIds = new Set(options.rowIds);
  const itemIds = new Set(batch.rows.filter((row) => selectedIds.has(row.id)).map((row) => buildPublishedItem(row, batch).id));
  const publishedItems = await getLocalPublishedShopItems();
  await saveLocalPublishedShopItems(publishedItems.filter((item) => !itemIds.has(item.id)));

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

  await writeJsonFile(statePath, updatedState);
  return { state: updatedState, unpublishedCount: itemIds.size };
}
