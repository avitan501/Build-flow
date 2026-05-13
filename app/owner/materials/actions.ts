"use server";

import { revalidatePath } from "next/cache";

import { requireAdminProfile } from "@/lib/auth";
import { placeholderImageMetadata } from "@/lib/shop-catalog";
import { buildShopDuplicateMatch, type ShopItemRecord, type ShopSupplierEstimateRecord } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

export type OwnerMaterialsActionRow = {
  id: string;
  qty: number;
  itemNo: string;
  description: string;
  unit: string;
  supplierUnitPrice: number;
  markupPercent: number;
  markupDollar: number;
  finalUnitPrice: number;
  category: string;
  imageUrl?: string;
  imageAlt?: string;
  imageSource?: string;
  imageLicense?: string;
  imageCredit?: string;
  imageCategory?: string;
  publish: boolean;
};

export type OwnerMaterialsActionBatch = {
  supplierName: string;
  quoteNumber: string;
  quoteDate: string;
  sourceFileName?: string | null;
  rows: OwnerMaterialsActionRow[];
};

export type OwnerMaterialsActionResult = {
  ok: boolean;
  message: string;
  estimateId?: string;
  publishedKeys?: string[];
};

type CandidateShopItem = Pick<
  ShopItemRecord,
  "id" | "supplier_name" | "pricing_date" | "item_number" | "name" | "description" | "unit"
>;

function cleanText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function nullableText(value: string | null | undefined) {
  const next = cleanText(value);
  return next || null;
}

function cleanDate(value: string | null | undefined) {
  const next = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null;
}

function moneyNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, Number(value.toFixed(2))) : 0;
}

function quantityNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, Number(value.toFixed(3))) : 0;
}

function duplicateKey(input: {
  supplierName: string;
  pricingDate: string | null;
  itemNumber: string | null;
  description: string;
  unit: string | null;
}) {
  if (input.itemNumber) {
    return `${input.supplierName}|${input.pricingDate ?? ""}|${input.itemNumber}`;
  }

  return `${input.supplierName}|${input.description.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")}|${(input.unit ?? "").toUpperCase()}`;
}

function validateBatch(batch: OwnerMaterialsActionBatch) {
  const supplierName = cleanText(batch.supplierName);

  if (!supplierName) {
    throw new Error("Supplier name is required.");
  }

  const rows = batch.rows
    .map((row) => {
      const description = cleanText(row.description);
      const category = cleanText(row.category) || "Materials";
      const fallbackImage = placeholderImageMetadata(category, description || category);

      return {
        ...row,
        description,
        itemNo: cleanText(row.itemNo),
        unit: cleanText(row.unit),
        category,
        qty: quantityNumber(row.qty),
        supplierUnitPrice: moneyNumber(row.supplierUnitPrice),
        finalUnitPrice: moneyNumber(row.finalUnitPrice),
        imageUrl: cleanText(row.imageUrl) || fallbackImage.imageUrl,
        imageAlt: cleanText(row.imageAlt) || fallbackImage.imageAlt,
        imageSource: cleanText(row.imageSource) || fallbackImage.imageSource,
        imageLicense: cleanText(row.imageLicense) || fallbackImage.imageLicense,
        imageCredit: cleanText(row.imageCredit) || fallbackImage.imageCredit,
        imageCategory: cleanText(row.imageCategory) || fallbackImage.imageCategory,
      };
    })
    .filter((row) => row.description);

  if (rows.length === 0) {
    throw new Error("At least one material row is required.");
  }

  return {
    supplierName,
    quoteNumber: nullableText(batch.quoteNumber),
    quoteDate: cleanDate(batch.quoteDate),
    sourceFileName: nullableText(batch.sourceFileName),
    rows,
  };
}

async function ensureEstimate(batch: OwnerMaterialsActionBatch, status: "draft" | "reviewed" | "archived") {
  const { user } = await requireAdminProfile();
  const admin = createAdminClient();
  const clean = validateBatch(batch);

  let query = admin
    .from("shop_supplier_estimates")
    .select("id")
    .eq("supplier_name", clean.supplierName)
    .limit(1);

  if (clean.quoteNumber) {
    query = query.eq("quote_number", clean.quoteNumber);
  } else {
    query = query.is("quote_number", null);
  }

  if (clean.quoteDate) {
    query = query.eq("estimate_date", clean.quoteDate);
  } else {
    query = query.is("estimate_date", null);
  }

  const { data: existing, error: existingError } = await query.maybeSingle<Pick<ShopSupplierEstimateRecord, "id">>();

  if (existingError) {
    throw new Error(existingError.message || "Failed to check supplier estimate.");
  }

  if (existing?.id) {
    const { error: updateError } = await admin
      .from("shop_supplier_estimates")
      .update({
        source_file_name: clean.sourceFileName,
        status,
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message || "Failed to update supplier estimate.");
    }

    return { estimateId: existing.id, clean };
  }

  const { data: inserted, error: insertError } = await admin
    .from("shop_supplier_estimates")
    .insert({
      supplier_name: clean.supplierName,
      quote_number: clean.quoteNumber,
      estimate_date: clean.quoteDate,
      source_file_name: clean.sourceFileName,
      status,
      created_by: user.id,
    })
    .select("id")
    .single<Pick<ShopSupplierEstimateRecord, "id">>();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Failed to create supplier estimate.");
  }

  return { estimateId: inserted.id, clean };
}

async function loadCandidateShopItems(supplierName: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_items")
    .select("id, supplier_name, pricing_date, item_number, name, description, unit")
    .ilike("supplier_name", supplierName)
    .limit(500)
    .returns<CandidateShopItem[]>();

  if (error) {
    throw new Error(error.message || "Failed to load existing shop items.");
  }

  return data ?? [];
}

function findExistingItem(candidates: CandidateShopItem[], row: ReturnType<typeof validateBatch>["rows"][number], batch: ReturnType<typeof validateBatch>) {
  const match = buildShopDuplicateMatch({
    supplierName: batch.supplierName,
    pricingDate: batch.quoteDate,
    itemNumber: row.itemNo,
    name: row.description,
    description: row.description,
    unit: row.unit,
  });

  return candidates.find((candidate) => {
    const candidateMatch = buildShopDuplicateMatch({
      supplierName: candidate.supplier_name,
      pricingDate: candidate.pricing_date,
      itemNumber: candidate.item_number,
      name: candidate.name,
      description: candidate.description,
      unit: candidate.unit,
    });

    if (match.itemNumber) {
      return (
        candidateMatch.supplierName === match.supplierName &&
        candidateMatch.pricingDate === match.pricingDate &&
        candidateMatch.itemNumber === match.itemNumber
      );
    }

    return (
      candidateMatch.supplierName === match.supplierName &&
      candidateMatch.unit === match.unit &&
      (candidateMatch.normalizedName === match.normalizedName ||
        candidateMatch.normalizedDescription === match.normalizedDescription)
    );
  });
}

function revalidateShopPaths() {
  revalidatePath("/shop");
  revalidatePath("/cart");
  revalidatePath("/admin/shop");
  revalidatePath("/owner/materials");
}

export async function saveOwnerMaterialsReview(batch: OwnerMaterialsActionBatch): Promise<OwnerMaterialsActionResult> {
  try {
    const { estimateId } = await ensureEstimate(batch, "draft");
    revalidateShopPaths();

    return {
      ok: true,
      estimateId,
      message: "Review metadata saved. Publish selected rows when they are ready for the client shop.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to save review.",
    };
  }
}

export async function publishOwnerMaterialsRows(batch: OwnerMaterialsActionBatch): Promise<OwnerMaterialsActionResult> {
  try {
    const { estimateId, clean } = await ensureEstimate(batch, "reviewed");
    const selectedRows = clean.rows.filter((row) => row.publish);

    if (selectedRows.length === 0) {
      throw new Error("Select at least one row to publish.");
    }

    const admin = createAdminClient();
    const candidates = await loadCandidateShopItems(clean.supplierName);
    const publishedKeys: string[] = [];

    for (const row of selectedRows) {
      const existing = findExistingItem(candidates, row, clean);
      const unit = nullableText(row.unit);
      const itemNumber = nullableText(row.itemNo);
      const image = placeholderImageMetadata(row.imageCategory || row.category, row.description);
      const payload = {
        supplier_estimate_id: estimateId,
        supplier_name: clean.supplierName,
        quote_number: clean.quoteNumber,
        pricing_date: clean.quoteDate,
        item_number: itemNumber,
        name: row.description,
        description: row.description,
        category: row.category,
        quantity: row.qty,
        unit,
        unit_price: row.finalUnitPrice,
        extended_price: moneyNumber(row.qty * row.finalUnitPrice),
        source: "supplier_estimate",
        image_url: row.imageUrl || image.imageUrl,
        image_alt: row.imageAlt || image.imageAlt,
        image_source: row.imageSource || image.imageSource,
        image_license: row.imageLicense || image.imageLicense,
        image_credit: row.imageCredit || image.imageCredit,
        image_category: row.imageCategory || image.imageCategory,
      };

      if (existing) {
        const { error } = await admin.from("shop_items").update(payload).eq("id", existing.id);

        if (error) {
          throw new Error(error.message || `Failed to update ${row.description}.`);
        }
      } else {
        const { data: inserted, error } = await admin
          .from("shop_items")
          .insert(payload)
          .select("id, supplier_name, pricing_date, item_number, name, description, unit")
          .single<CandidateShopItem>();

        if (error || !inserted) {
          throw new Error(error?.message || `Failed to publish ${row.description}.`);
        }

        candidates.push(inserted);
      }

      publishedKeys.push(
        duplicateKey({
          supplierName: clean.supplierName,
          pricingDate: clean.quoteDate,
          itemNumber,
          description: row.description,
          unit,
        }),
      );
    }

    revalidateShopPaths();

    return {
      ok: true,
      estimateId,
      publishedKeys,
      message: `${selectedRows.length} item${selectedRows.length === 1 ? "" : "s"} published to the client shop.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to publish selected rows.",
    };
  }
}

export async function archiveOwnerMaterialsRows(batch: OwnerMaterialsActionBatch): Promise<OwnerMaterialsActionResult> {
  try {
    const { estimateId, clean } = await ensureEstimate(batch, "archived");
    const admin = createAdminClient();
    const candidates = await loadCandidateShopItems(clean.supplierName);
    const selectedRows = clean.rows.filter((row) => row.publish);
    const ids = selectedRows
      .map((row) => findExistingItem(candidates, row, clean)?.id)
      .filter((id): id is string => Boolean(id));

    if (ids.length > 0) {
      const { error } = await admin.from("shop_items").delete().in("id", ids);

      if (error) {
        throw new Error(error.message || "Failed to unpublish selected rows.");
      }
    }

    revalidateShopPaths();

    return {
      ok: true,
      estimateId,
      publishedKeys: [],
      message: ids.length > 0 ? `${ids.length} published item${ids.length === 1 ? "" : "s"} unpublished.` : "Estimate archived. No matching published items were found.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to archive selected rows.",
    };
  }
}
