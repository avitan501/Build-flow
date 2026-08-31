"use server";

import { revalidatePath } from "next/cache";

import { requireStaffProfile } from "@/lib/auth";
import {
  normalizeMaterialCatalogDepartment,
  type CatalogSupplier,
} from "@/lib/material-catalog";
import { extractSupplierQuoteFile } from "@/lib/supplier-quote-extraction";
import {
  detectSupplierMatch,
  inferSupplierName,
} from "@/lib/supplier-quote-supplier";
import {
  SUPPLIER_QUOTE_BUCKET,
  type SupplierQuoteItemRecord,
  type SupplierQuoteRecord,
} from "@/lib/supplier-quotes";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true; message: string } | { ok: false; error: string }
  : { ok: true; data: T; message: string } | { ok: false; error: string };

type EditableQuoteItem = {
  id: string;
  itemCode: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  selected: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function supplierQuoteAiInvoker(supabase: StaffSupabase) {
  return async (
    input: Parameters<
      NonNullable<Parameters<typeof extractSupplierQuoteFile>[2]>
    >[0],
  ) => {
    const { data, error } = await supabase.functions.invoke(
      "supplier-quote-ocr",
      { body: input },
    );
    if (error) throw error;
    return data;
  };
}

function clean(value: unknown, max: number) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function cleanFileName(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
  return cleaned.slice(-180) || "supplier-quote";
}

function safeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

async function loadQuote(quoteId: string) {
  const { supabase, user } = await requireStaffProfile("suppliers");
  if (!UUID_PATTERN.test(quoteId)) return { supabase, user, quote: null };
  const { data } = await supabase
    .from("supplier_quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle<SupplierQuoteRecord>();
  return { supabase, user, quote: data ?? null };
}

type StaffSupabase = Awaited<
  ReturnType<typeof requireStaffProfile>
>["supabase"];

async function ensureClientRequestComparison(input: {
  supabase: StaffSupabase;
  userId: string;
  requestId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  fallbackDepartment: string;
}) {
  const existing = await input.supabase
    .from("quote_comparisons")
    .select("id")
    .eq("request_id", input.requestId)
    .in("status", ["draft", "review"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (existing.error) throw existing.error;
  if (existing.data) return { comparisonId: existing.data.id, created: false };

  const { data: request, error: requestError } = await input.supabase
    .from("quote_requests")
    .select("id,title,project_id,owner_id")
    .eq("id", input.requestId)
    .eq("owner_id", input.clientId)
    .maybeSingle<{
      id: string;
      title: string;
      project_id: string;
      owner_id: string;
    }>();
  if (requestError || !request)
    throw new Error("The selected client request is no longer available.");

  const [{ data: project }, { data: requestItems, error: itemsError }] =
    await Promise.all([
      input.supabase
        .from("projects")
        .select("name,address")
        .eq("id", request.project_id)
        .maybeSingle<{ name: string; address: string | null }>(),
      input.supabase
        .from("quote_request_items")
        .select("name,quantity,unit,department")
        .eq("request_id", request.id)
        .order("created_at")
        .returns<
          Array<{
            name: string;
            quantity: number;
            unit: string | null;
            department: string;
          }>
        >(),
    ]);
  if (itemsError) throw itemsError;
  const department = normalizeMaterialCatalogDepartment(
    requestItems?.[0]?.department || input.fallbackDepartment,
  );
  const caseNumber = request.id.replaceAll("-", "").slice(0, 8).toUpperCase();
  const { data: comparison, error: comparisonError } = await input.supabase
    .from("quote_comparisons")
    .insert({
      project_id: request.project_id,
      request_id: request.id,
      created_by: input.userId,
      title: `Case #${caseNumber} · ${request.title}`.slice(0, 160),
      department,
      job_address: clean(project?.address || project?.name || "", 500),
      client_id: input.clientId,
      client_name_snapshot: input.clientName,
      client_email_snapshot: input.clientEmail,
    })
    .select("id")
    .single<{ id: string }>();
  if (comparisonError || !comparison)
    throw comparisonError || new Error("The comparison could not be created.");

  if (requestItems?.length) {
    const { error: seedError } = await input.supabase
      .from("quote_comparison_items")
      .insert(
        requestItems.slice(0, 500).map((item, index) => ({
          comparison_id: comparison.id,
          description:
            clean(item.name, 500) || `Requested material ${index + 1}`,
          specification: clean(item.department, 1000),
          quantity: safeNumber(item.quantity, 1) || 1,
          unit: clean(item.unit, 40) || "each",
          sort_order: index,
        })),
      );
    if (seedError) {
      await input.supabase
        .from("quote_comparisons")
        .delete()
        .eq("id", comparison.id);
      throw seedError;
    }
  }
  return { comparisonId: comparison.id, created: true };
}

export async function uploadSupplierQuoteAction(
  formData: FormData,
): Promise<ActionResult<{ quoteId: string }>> {
  const { supabase, user } = await requireStaffProfile("suppliers");
  const file = formData.get("quoteFile");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Choose a supplier quote file." };
  if (file.size > MAX_FILE_SIZE)
    return { ok: false, error: "The quote must be 25 MB or smaller." };
  if (!ALLOWED_TYPES.has(file.type))
    return { ok: false, error: "Use a PDF, CSV, TXT, JPG, PNG, or WEBP file." };

  const linkMode =
    clean(formData.get("linkMode"), 20) === "request" ? "request" : "unlinked";
  const clientSelection = clean(formData.get("clientSelection"), 160);
  const requestId = clean(formData.get("requestId"), 160);
  let client: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null = null;
  let clientName = "";
  if (linkMode === "request") {
    if (!UUID_PATTERN.test(clientSelection) || !UUID_PATTERN.test(requestId))
      return {
        ok: false,
        error: "Choose the client and one of their requests.",
      };
    const clientResult = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .eq("id", clientSelection)
      .eq("role", "client")
      .eq("is_active", true)
      .maybeSingle<{
        id: string;
        full_name: string | null;
        email: string | null;
      }>();
    if (clientResult.error || !clientResult.data)
      return {
        ok: false,
        error: "The selected client is not available. Choose another client.",
      };
    const { data: request } = await supabase
      .from("quote_requests")
      .select("id")
      .eq("id", requestId)
      .eq("owner_id", clientResult.data.id)
      .maybeSingle<{ id: string }>();
    if (!request)
      return {
        ok: false,
        error: "That request does not belong to the selected client.",
      };
    client = clientResult.data;
    clientName = clean(client.full_name || client.email || "Client", 200);
  }

  const supplierSelection = clean(formData.get("supplierId"), 160) || "auto";
  let supplierId = supplierSelection === "auto" ? "" : supplierSelection;
  let supplierName = clean(formData.get("supplierName"), 200);
  const department = normalizeMaterialCatalogDepartment(
    clean(formData.get("department"), 120),
  );
  if (
    supplierSelection !== "auto" &&
    (!UUID_PATTERN.test(supplierId) || !supplierName)
  )
    return {
      ok: false,
      error: "Choose a valid supplier or use automatic detection.",
    };

  const quoteId = crypto.randomUUID();
  const filePath = `${user.id}/${quoteId}/${cleanFileName(file.name)}`;
  const { error: storageError } = await supabase.storage
    .from(SUPPLIER_QUOTE_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (storageError) {
    console.error("Supplier quote upload failed", storageError);
    return { ok: false, error: "The document could not be stored. Try again." };
  }

  let comparisonId: string | null = null;
  let createdComparison = false;
  if (client) {
    try {
      const comparison = await ensureClientRequestComparison({
        supabase,
        userId: user.id,
        requestId,
        clientId: client.id,
        clientName,
        clientEmail: clean(client.email, 320),
        fallbackDepartment: department,
      });
      comparisonId = comparison.comparisonId;
      createdComparison = comparison.created;
    } catch (error) {
      await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).remove([filePath]);
      console.error("Client request comparison creation failed", error);
      return {
        ok: false,
        error:
          "The quote was read, but it could not be attached to that client request.",
      };
    }
  }

  const manualQuoteNumber = clean(formData.get("quoteNumber"), 100);
  const manualQuoteDate = clean(formData.get("quoteDate"), 10);
  const { error: quoteError } = await supabase.from("supplier_quotes").insert({
    id: quoteId,
    client_id: client?.id ?? null,
    client_name_snapshot: clientName,
    comparison_id: comparisonId,
    supplier_id: supplierId || null,
    supplier_name: supplierName || "Supplier detection pending",
    quote_number: manualQuoteNumber,
    department,
    quote_date: /^\d{4}-\d{2}-\d{2}$/.test(manualQuoteDate)
      ? manualQuoteDate
      : null,
    expires_on: null,
    file_name: file.name.slice(0, 255),
    file_path: filePath,
    mime_type: file.type,
    file_size: file.size,
    raw_text: "",
    extraction_note:
      "Original document saved privately. AI extraction is in progress.",
    delivery_charge: 0,
    tax_percent: 0,
    notes: "",
    created_by: user.id,
    updated_by: user.id,
  });
  if (quoteError) {
    await supabase.storage.from(SUPPLIER_QUOTE_BUCKET).remove([filePath]);
    if (createdComparison && comparisonId)
      await supabase.from("quote_comparisons").delete().eq("id", comparisonId);
    console.error("Supplier quote record creation failed", quoteError);
    return {
      ok: false,
      error:
        "The document uploaded, but its quote record could not be created.",
    };
  }

  let extraction;
  try {
    const browserOcrText = String(formData.get("browserOcrText") ?? "").slice(
      0,
      250000,
    );
    extraction = await extractSupplierQuoteFile(
      file,
      browserOcrText,
      supplierQuoteAiInvoker(supabase),
    );
  } catch (error) {
    console.error("Supplier quote extraction failed", error);
    extraction = {
      text: "",
      items: [],
      metadata: {
        supplierName: "",
        quoteNumber: "",
        quoteDate: "",
        expiresOn: "",
        department: "",
        deliveryCharge: 0,
        taxPercent: 0,
        subtotal: null,
        total: null,
      },
      extractionNote:
        "The original document was saved privately. AI could not confirm dependable rows yet; use Re-read with AI. Nothing was added to the catalog.",
    };
  }

  let supplierDirectoryNote = "";
  if (supplierSelection === "auto") {
    const { data: supplierRows, error: supplierError } = await supabase.rpc(
      "staff_load_catalog_suppliers",
    );
    if (supplierError) {
      console.error("Supplier Directory lookup failed", supplierError);
      supplierDirectoryNote =
        "The supplier directory could not be checked automatically. Confirm the supplier during review.";
    } else {
      const match = detectSupplierMatch(
        Array.isArray(supplierRows) ? (supplierRows as CatalogSupplier[]) : [],
        extraction.metadata.supplierName,
        extraction.text,
      );
      supplierId = match?.id ?? "";
      supplierName =
        match?.name ||
        extraction.metadata.supplierName ||
        inferSupplierName(extraction.text) ||
        "Supplier needs review";
    }
  }

  const quoteNumber = manualQuoteNumber || extraction.metadata.quoteNumber;
  const quoteDate = manualQuoteDate || extraction.metadata.quoteDate;
  const reviewNote =
    supplierDirectoryNote ||
    (supplierSelection === "auto" && !supplierId
      ? "Supplier was read from the document but did not match the Supplier Directory. Confirm the supplier before routing."
      : extraction.metadata.supplierName &&
          extraction.metadata.supplierName.toLowerCase() !==
            supplierName.toLowerCase()
        ? `Document supplier detected as ${extraction.metadata.supplierName}. Confirm the selected Supplier Directory record.`
        : "");
  const { error: quoteUpdateError } = await supabase
    .from("supplier_quotes")
    .update({
      supplier_id: supplierId || null,
      supplier_name:
        supplierName ||
        extraction.metadata.supplierName ||
        "Supplier needs review",
      quote_number: quoteNumber,
      quote_date: /^\d{4}-\d{2}-\d{2}$/.test(quoteDate) ? quoteDate : null,
      expires_on: extraction.metadata.expiresOn || null,
      raw_text: extraction.text,
      extraction_note: extraction.extractionNote,
      delivery_charge: extraction.metadata.deliveryCharge,
      tax_percent: extraction.metadata.taxPercent,
      notes: reviewNote,
      updated_by: user.id,
    })
    .eq("id", quoteId);
  if (quoteUpdateError)
    console.error("Supplier quote extraction update failed", quoteUpdateError);

  if (extraction.items.length) {
    const { error: itemError } = await supabase
      .from("supplier_quote_items")
      .insert(
        extraction.items.map((item, index) => ({
          quote_id: quoteId,
          line_number: index + 1,
          item_code: item.itemCode,
          description: item.description,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          selected: true,
          review_status: "needs_review",
        })),
      );
    if (itemError)
      console.error("Supplier quote item creation failed", itemError);
  }

  revalidatePath("/admin/supplier-quotes");
  return { ok: true, data: { quoteId }, message: extraction.extractionNote };
}

export async function saveSupplierQuoteAction(input: {
  quoteId: string;
  quoteNumber: string;
  department: string;
  quoteDate: string;
  expiresOn: string;
  notes: string;
  deliveryCharge: number;
  taxPercent: number;
  items: EditableQuoteItem[];
}): Promise<ActionResult<{ saved: number }>> {
  const { supabase, user, quote } = await loadQuote(input.quoteId);
  if (!quote)
    return { ok: false, error: "This supplier quote could not be found." };
  if (!Array.isArray(input.items) || input.items.length > 500)
    return { ok: false, error: "Save no more than 500 quote items at once." };

  let rows;
  try {
    rows = input.items.map((item, index) => {
      const description = clean(item.description, 500);
      const quantity = safeNumber(item.quantity);
      if (!description || quantity <= 0)
        throw new Error(
          `Check item ${index + 1}: material and quantity are required.`,
        );
      const unitPrice =
        item.unitPrice === null || item.unitPrice === undefined
          ? null
          : safeNumber(item.unitPrice);
      return {
        ...(UUID_PATTERN.test(item.id) ? { id: item.id } : {}),
        quote_id: quote.id,
        line_number: index + 1,
        item_code: clean(item.itemCode, 120),
        description,
        specification: clean(item.specification, 1000),
        quantity,
        unit: clean(item.unit, 40) || "each",
        unit_price: unitPrice,
        line_total:
          unitPrice === null
            ? null
            : Math.round(quantity * unitPrice * 100) / 100,
        selected: Boolean(item.selected),
        review_status: item.selected ? "ready" : "ignored",
      };
    });
    const { error: itemError } = rows.length
      ? await supabase
          .from("supplier_quote_items")
          .upsert(rows, { onConflict: "id" })
      : { error: null };
    if (itemError) throw itemError;
  } catch (error) {
    const message =
      error instanceof Error && error.message.startsWith("Check item")
        ? error.message
        : "The extracted items could not be saved.";
    return { ok: false, error: message };
  }

  const { error } = await supabase
    .from("supplier_quotes")
    .update({
      quote_number: clean(input.quoteNumber, 100),
      department: normalizeMaterialCatalogDepartment(
        clean(input.department, 120),
      ),
      quote_date: /^\d{4}-\d{2}-\d{2}$/.test(input.quoteDate)
        ? input.quoteDate
        : null,
      expires_on: /^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn)
        ? input.expiresOn
        : null,
      notes: clean(input.notes, 4000),
      delivery_charge: safeNumber(input.deliveryCharge),
      tax_percent: Math.min(100, safeNumber(input.taxPercent)),
      status: rows.some((row) => row.selected) ? "ready" : "needs_review",
      updated_by: user.id,
    })
    .eq("id", quote.id);
  if (error)
    return { ok: false, error: "The quote details could not be saved." };

  revalidatePath(`/admin/supplier-quotes/${quote.id}`);
  revalidatePath("/admin/supplier-quotes");
  return {
    ok: true,
    data: { saved: rows.length },
    message: "Supplier quote saved.",
  };
}

export async function deleteSupplierQuoteItemAction(
  quoteId: string,
  itemId: string,
): Promise<ActionResult> {
  const { supabase, quote } = await loadQuote(quoteId);
  if (!quote || !UUID_PATTERN.test(itemId))
    return { ok: false, error: "This quote item could not be found." };
  const { error } = await supabase
    .from("supplier_quote_items")
    .delete()
    .eq("id", itemId)
    .eq("quote_id", quote.id);
  if (error) return { ok: false, error: "The item could not be removed." };
  revalidatePath(`/admin/supplier-quotes/${quote.id}`);
  return { ok: true, message: "Item removed." };
}

export async function retrySupplierQuoteExtractionAction(
  quoteId: string,
  replaceExisting = false,
): Promise<ActionResult<{ items: SupplierQuoteItemRecord[] }>> {
  const { supabase, user, quote } = await loadQuote(quoteId);
  if (!quote)
    return { ok: false, error: "This supplier quote could not be found." };

  const { count, error: countError } = await supabase
    .from("supplier_quote_items")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", quote.id);
  if (countError)
    return {
      ok: false,
      error: "The current quote items could not be checked.",
    };
  if ((count ?? 0) > 0 && !replaceExisting)
    return {
      ok: false,
      error:
        "This quote already has items. Review those lines before running extraction again.",
    };

  const { data: storedFile, error: downloadError } = await supabase.storage
    .from(SUPPLIER_QUOTE_BUCKET)
    .download(quote.file_path);
  if (downloadError || !storedFile)
    return {
      ok: false,
      error: "The original invoice could not be opened for extraction.",
    };

  let extraction;
  try {
    const file = new File([await storedFile.arrayBuffer()], quote.file_name, {
      type: quote.mime_type || storedFile.type,
    });
    extraction = await extractSupplierQuoteFile(
      file,
      "",
      supplierQuoteAiInvoker(supabase),
    );
  } catch (error) {
    console.error("Supplier quote retry extraction failed", error);
    return {
      ok: false,
      error:
        "The invoice could not be read. Confirm the image is clear and try again.",
    };
  }

  if (!extraction.items.length) {
    const error =
      "No dependable material rows were found. Open the invoice to confirm it is clear, then try again or add a line manually.";
    await supabase
      .from("supplier_quotes")
      .update({ extraction_note: error, updated_by: user.id })
      .eq("id", quote.id);
    revalidatePath(`/admin/supplier-quotes/${quote.id}`);
    return { ok: false, error };
  }

  const rows = extraction.items.map((item, index) => ({
    quote_id: quote.id,
    line_number: index + 1,
    item_code: item.itemCode,
    description: item.description,
    specification: item.specification,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
    selected: true,
    review_status: "needs_review",
  }));
  if (replaceExisting && (count ?? 0) > 0) {
    const { error: removeError } = await supabase
      .from("supplier_quote_items")
      .delete()
      .eq("quote_id", quote.id);
    if (removeError)
      return {
        ok: false,
        error:
          "The old extracted rows could not be replaced. No changes were made.",
      };
  }
  const { data: inserted, error: insertError } = await supabase
    .from("supplier_quote_items")
    .insert(rows)
    .select("*")
    .order("line_number")
    .returns<SupplierQuoteItemRecord[]>();
  if (insertError || !inserted?.length) {
    if (insertError?.code === "23505")
      return {
        ok: false,
        error:
          "Extraction already added items to this quote. Reload the page to review them.",
      };
    console.error("Supplier quote retry item creation failed", insertError);
    return {
      ok: false,
      error:
        "The invoice was read, but the extracted items could not be saved.",
    };
  }

  const metadata = extraction.metadata;
  const notes =
    metadata.supplierName &&
    metadata.supplierName.toLowerCase() !== quote.supplier_name.toLowerCase()
      ? [
          quote.notes,
          `Invoice supplier detected as ${metadata.supplierName}. Confirm the selected Supplier Directory record.`,
        ]
          .filter(Boolean)
          .join("\n")
      : quote.notes;
  await supabase
    .from("supplier_quotes")
    .update({
      quote_number: quote.quote_number || metadata.quoteNumber,
      quote_date: quote.quote_date || metadata.quoteDate || null,
      expires_on: quote.expires_on || metadata.expiresOn || null,
      delivery_charge: metadata.deliveryCharge,
      tax_percent: metadata.taxPercent,
      raw_text: extraction.text,
      extraction_note: extraction.extractionNote,
      notes,
      status: "needs_review",
      updated_by: user.id,
    })
    .eq("id", quote.id);

  revalidatePath(`/admin/supplier-quotes/${quote.id}`);
  revalidatePath("/admin/supplier-quotes");
  return {
    ok: true,
    data: { items: inserted },
    message: extraction.extractionNote,
  };
}

export async function addSupplierQuoteItemAction(
  quoteId: string,
): Promise<ActionResult<{ item: SupplierQuoteItemRecord }>> {
  const { supabase, quote } = await loadQuote(quoteId);
  if (!quote)
    return { ok: false, error: "This supplier quote could not be found." };
  const { data: lastItem } = await supabase
    .from("supplier_quote_items")
    .select("line_number")
    .eq("quote_id", quote.id)
    .order("line_number", { ascending: false })
    .limit(1)
    .maybeSingle<{ line_number: number }>();
  const { data, error } = await supabase
    .from("supplier_quote_items")
    .insert({
      quote_id: quote.id,
      line_number: (lastItem?.line_number ?? 0) + 1,
      description: "New material",
      quantity: 1,
      unit: "each",
      selected: true,
      review_status: "needs_review",
    })
    .select("*")
    .single<SupplierQuoteItemRecord>();
  if (error || !data)
    return { ok: false, error: "A new line could not be added." };
  revalidatePath(`/admin/supplier-quotes/${quote.id}`);
  return { ok: true, data: { item: data }, message: "New line added." };
}

export async function addSupplierQuoteItemsToCatalogAction(
  quoteId: string,
  itemIds: string[],
): Promise<ActionResult<{ added: number; updated: number }>> {
  const { supabase, user, quote } = await loadQuote(quoteId);
  if (!quote)
    return { ok: false, error: "This supplier quote could not be found." };
  if (!quote.supplier_id)
    return {
      ok: false,
      error:
        "Choose a Supplier Directory record before adding prices to the catalog.",
    };
  const selectedIds = [
    ...new Set(itemIds.filter((id) => UUID_PATTERN.test(id))),
  ].slice(0, 500);
  if (!selectedIds.length)
    return { ok: false, error: "Select at least one reviewed item." };

  const { data: items, error: itemsError } = await supabase
    .from("supplier_quote_items")
    .select("*")
    .eq("quote_id", quote.id)
    .in("id", selectedIds)
    .returns<SupplierQuoteItemRecord[]>();
  if (itemsError || !items?.length)
    return {
      ok: false,
      error: "The selected quote items could not be loaded.",
    };
  const category = normalizeMaterialCatalogDepartment(quote.department);
  const { data: existingItems, error: existingError } = await supabase
    .from("material_catalog_items")
    .select("id,name")
    .eq("category", category)
    .eq("status", "active")
    .returns<Array<{ id: string; name: string }>>();
  if (existingError)
    return { ok: false, error: "The material catalog could not be checked." };
  const existingByName = new Map(
    (existingItems ?? []).map((item) => [
      item.name.trim().toLowerCase(),
      item.id,
    ]),
  );
  let added = 0;
  let updated = 0;
  const links: Array<{ id: string; catalog_item_id: string }> = [];
  const prices = [];

  for (const item of items) {
    let catalogItemId = existingByName.get(
      item.description.trim().toLowerCase(),
    );
    if (!catalogItemId) {
      const itemCode = `SQ-${quote.id.slice(0, 6).toUpperCase()}-${String(item.line_number).padStart(3, "0")}`;
      const { data: created, error: createError } = await supabase
        .from("material_catalog_items")
        .insert({
          category,
          item_code: itemCode,
          name: item.description,
          description: item.specification,
          default_quantity: item.quantity,
          unit: item.unit,
          package_quantity: 1,
          package_unit: item.unit,
          comparison_quantity: 1,
          comparison_unit: item.unit,
          review_status: "needs_review",
          quality_notes: `Imported from ${quote.supplier_name} quote ${quote.quote_number || quote.file_name}.`,
          source: `Supplier quote ${quote.id}`,
          created_by: user.id,
          updated_by: user.id,
        })
        .select("id")
        .single<{ id: string }>();
      if (createError || !created)
        return {
          ok: false,
          error: `Could not add ${item.description} to the catalog.`,
        };
      catalogItemId = created.id;
      existingByName.set(item.description.trim().toLowerCase(), catalogItemId);
      added += 1;
    } else {
      updated += 1;
    }
    links.push({ id: item.id, catalog_item_id: catalogItemId });
    prices.push({
      item_id: catalogItemId,
      supplier_id: quote.supplier_id,
      supplier_name_snapshot: quote.supplier_name,
      supplier_sku: item.item_code,
      unit_price: item.unit_price,
      availability: item.unit_price === null ? "unknown" : "available",
      notes: `Imported from quote ${quote.quote_number || quote.file_name}`,
      price_type: "supplier_quote",
      verification_status: "supplier_quote",
      verified_at: quote.quote_date || new Date().toISOString(),
      expires_at: quote.expires_on,
      updated_by: user.id,
    });
  }

  const { error: priceError } = await supabase
    .from("material_catalog_supplier_prices")
    .upsert(prices, { onConflict: "item_id,supplier_id" });
  if (priceError)
    return {
      ok: false,
      error:
        "The items were found, but the supplier prices could not be saved.",
    };
  for (const link of links)
    await supabase
      .from("supplier_quote_items")
      .update({ catalog_item_id: link.catalog_item_id })
      .eq("id", link.id)
      .eq("quote_id", quote.id);
  await supabase
    .from("supplier_quotes")
    .update({ status: "cataloged", updated_by: user.id })
    .eq("id", quote.id);
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/supplier-quotes/${quote.id}`);
  return {
    ok: true,
    data: { added, updated },
    message: `${added} new catalog item${added === 1 ? "" : "s"} added; ${updated} existing price${updated === 1 ? "" : "s"} updated.`,
  };
}

function comparisonWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((word) => word.length > 1),
  );
}

function comparisonMatchScore(
  quoteItem: SupplierQuoteItemRecord,
  requestItem: { description: string; specification: string },
) {
  const quoteText =
    `${quoteItem.item_code} ${quoteItem.description} ${quoteItem.specification}`.trim();
  const requestText =
    `${requestItem.description} ${requestItem.specification}`.trim();
  const normalizedQuote = quoteText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const normalizedRequest = requestText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (normalizedQuote === normalizedRequest) return 10;
  if (
    normalizedQuote.includes(normalizedRequest) ||
    normalizedRequest.includes(normalizedQuote)
  )
    return 5;
  const quoteWords = comparisonWords(quoteText);
  const requestWords = comparisonWords(requestText);
  const overlap = [...quoteWords].filter((word) =>
    requestWords.has(word),
  ).length;
  return overlap / Math.max(quoteWords.size, requestWords.size, 1);
}

async function createComparisonFromQuote(
  quoteId: string,
  itemIds: string[],
  clientMode: boolean,
): Promise<ActionResult<{ comparisonId: string }>> {
  const { supabase, user, quote } = await loadQuote(quoteId);
  if (!quote)
    return { ok: false, error: "This supplier quote could not be found." };
  if (!quote.supplier_id)
    return {
      ok: false,
      error: "Choose a Supplier Directory record before routing this quote.",
    };
  const selectedIds = [
    ...new Set(itemIds.filter((id) => UUID_PATTERN.test(id))),
  ].slice(0, 500);
  if (!selectedIds.length)
    return { ok: false, error: "Select at least one reviewed item." };
  const { data: items, error: itemsError } = await supabase
    .from("supplier_quote_items")
    .select("*")
    .eq("quote_id", quote.id)
    .in("id", selectedIds)
    .order("line_number")
    .returns<SupplierQuoteItemRecord[]>();
  if (itemsError || !items?.length)
    return {
      ok: false,
      error: "The selected quote items could not be loaded.",
    };

  let comparison: {
    id: string;
    request_id: string | null;
    status: string;
  } | null = null;
  let createdComparison = false;
  if (quote.comparison_id) {
    const current = await supabase
      .from("quote_comparisons")
      .select("id,request_id,status")
      .eq("id", quote.comparison_id)
      .maybeSingle<{ id: string; request_id: string | null; status: string }>();
    if (current.error)
      return {
        ok: false,
        error: "The linked client-request comparison could not be loaded.",
      };
    comparison = current.data;
  }
  if (comparison && ["awarded", "archived"].includes(comparison.status))
    return {
      ok: false,
      error:
        "This client-request comparison is already closed. Start a new comparison before adding another quote.",
    };
  if (!comparison) {
    const created = await supabase
      .from("quote_comparisons")
      .insert({
        title:
          `${quote.supplier_name} · ${quote.quote_number || quote.file_name}`.slice(
            0,
            160,
          ),
        department: quote.department,
        created_by: user.id,
      })
      .select("id,request_id,status")
      .single<{ id: string; request_id: string | null; status: string }>();
    if (created.error || !created.data)
      return {
        ok: false,
        error: "The comparison workspace could not be created.",
      };
    comparison = created.data;
    createdComparison = true;
  }

  async function fail(
    message: string,
  ): Promise<ActionResult<{ comparisonId: string }>> {
    if (createdComparison)
      await supabase
        .from("quote_comparisons")
        .delete()
        .eq("id", comparison!.id);
    return { ok: false, error: message };
  }

  let comparisonItemsResult = await supabase
    .from("quote_comparison_items")
    .select("id,description,specification,sort_order")
    .eq("comparison_id", comparison.id)
    .order("sort_order")
    .returns<
      Array<{
        id: string;
        description: string;
        specification: string;
        sort_order: number;
      }>
    >();
  if (comparisonItemsResult.error)
    return fail("The client request items could not be loaded.");
  if (!comparisonItemsResult.data?.length) {
    comparisonItemsResult = await supabase
      .from("quote_comparison_items")
      .insert(
        items.map((item, index) => ({
          comparison_id: comparison!.id,
          description: item.description,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          sort_order: index,
        })),
      )
      .select("id,description,specification,sort_order")
      .returns<
        Array<{
          id: string;
          description: string;
          specification: string;
          sort_order: number;
        }>
      >();
    if (
      comparisonItemsResult.error ||
      comparisonItemsResult.data?.length !== items.length
    )
      return fail("The quote items could not be copied to the comparison.");
  }
  const comparisonItems = comparisonItemsResult.data ?? [];

  const { data: supplierData } = await supabase.rpc(
    "staff_load_catalog_suppliers",
  );
  const supplier = (
    Array.isArray(supplierData) ? (supplierData as CatalogSupplier[]) : []
  ).find((entry) => entry.id === quote.supplier_id);
  if (!supplier)
    return fail(
      "The supplier is no longer available in the Supplier Directory.",
    );
  const bidSupplierId = comparison.request_id
    ? `${quote.supplier_id}:${quote.id}`.slice(0, 160)
    : quote.supplier_id;
  const bidName =
    comparison.request_id && quote.quote_number
      ? `${quote.supplier_name} · ${quote.quote_number}`.slice(0, 200)
      : quote.supplier_name;
  const existingBid = await supabase
    .from("quote_comparison_bids")
    .select("id")
    .eq("comparison_id", comparison.id)
    .eq("source_supplier_quote_id", quote.id)
    .maybeSingle<{ id: string }>();
  if (existingBid.error)
    return fail("The supplier quote column could not be checked.");
  const bidPayload = {
    comparison_id: comparison.id,
    source_supplier_quote_id: quote.id,
    source_vendor_name: quote.source_vendor_name || quote.supplier_name,
    source_contact_name: quote.source_contact_name,
    source_delivery_charge:
      quote.source_delivery_charge ?? quote.delivery_charge,
    supplier_id: bidSupplierId,
    supplier_name_snapshot: bidName,
    trust_level_snapshot: supplier.trustLevel ?? "not-reviewed",
    delivery_charge: quote.delivery_charge,
    tax_percent: quote.tax_percent,
    notes: clean(
      [quote.notes, `Source quote: ${quote.quote_number || quote.file_name}`]
        .filter(Boolean)
        .join("\n"),
      4000,
    ),
  };
  const bidResult = existingBid.data
    ? await supabase
        .from("quote_comparison_bids")
        .update(bidPayload)
        .eq("id", existingBid.data.id)
        .select("id")
        .single<{ id: string }>()
    : await supabase
        .from("quote_comparison_bids")
        .insert(bidPayload)
        .select("id")
        .single<{ id: string }>();
  let bid = bidResult.data;
  let bidError = bidResult.error;
  if (bidError?.code === "23505") {
    const recovered = await supabase
      .from("quote_comparison_bids")
      .select("id")
      .eq("comparison_id", comparison.id)
      .eq("source_supplier_quote_id", quote.id)
      .maybeSingle<{ id: string }>();
    bid = recovered.data;
    bidError = recovered.error;
    if (!bid && !bidError) {
      const legacy = await supabase
        .from("quote_comparison_bids")
        .select("id,source_supplier_quote_id")
        .eq("comparison_id", comparison.id)
        .eq("supplier_id", bidSupplierId)
        .maybeSingle<{
          id: string;
          source_supplier_quote_id: string | null;
        }>();
      if (
        !legacy.error &&
        legacy.data &&
        (!legacy.data.source_supplier_quote_id ||
          legacy.data.source_supplier_quote_id === quote.id)
      ) {
        const claimed = await supabase
          .from("quote_comparison_bids")
          .update(bidPayload)
          .eq("id", legacy.data.id)
          .or(
            `source_supplier_quote_id.is.null,source_supplier_quote_id.eq.${quote.id}`,
          )
          .select("id")
          .single<{ id: string }>();
        bid = claimed.data;
        bidError = claimed.error;
      }
    }
  }
  if (bidError || !bid)
    return fail("The supplier could not be added to the comparison.");

  const matches = items.map((item, index) => {
    if (!comparison.request_id)
      return { item, comparisonItem: comparisonItems[index] };
    const ranked = comparisonItems
      .map((candidate) => ({
        candidate,
        score: comparisonMatchScore(item, candidate),
      }))
      .sort((a, b) => b.score - a.score);
    return {
      item,
      comparisonItem: ranked[0]?.score >= 0.3 ? ranked[0].candidate : null,
    };
  });
  const bestByComparisonItem = new Map<string, (typeof matches)[number]>();
  for (const match of matches) {
    if (!match.comparisonItem) continue;
    const current = bestByComparisonItem.get(match.comparisonItem.id);
    if (
      !current ||
      (match.item.unit_price ?? Number.POSITIVE_INFINITY) <
        (current.item.unit_price ?? Number.POSITIVE_INFINITY)
    )
      bestByComparisonItem.set(match.comparisonItem.id, match);
  }
  const matched = [...bestByComparisonItem.values()];
  if (!matched.length) {
    if (!existingBid.data)
      await supabase.from("quote_comparison_bids").delete().eq("id", bid.id);
    return fail(
      "No supplier quote items matched this client request. Review the material names and try again.",
    );
  }
  const priceRows = matched.map(({ item, comparisonItem }) => ({
    bid_id: bid.id,
    item_id: comparisonItem!.id,
    unit_price: item.unit_price,
    is_available: item.unit_price !== null,
    notes: clean(item.description, 1000),
  }));
  const { error: pricesError } = await supabase
    .from("quote_comparison_prices")
    .upsert(priceRows, { onConflict: "bid_id,item_id" });
  if (pricesError) {
    if (!existingBid.data)
      await supabase.from("quote_comparison_bids").delete().eq("id", bid.id);
    return fail("The supplier pricing could not be copied to the comparison.");
  }

  if (clientMode) {
    const { error: awardError } = await supabase
      .from("quote_comparisons")
      .update({ status: "awarded", awarded_bid_id: bid.id })
      .eq("id", comparison.id);
    if (awardError)
      return fail("The client quote workspace could not be prepared.");
    await supabase
      .from("quote_comparison_bids")
      .update({ status: "awarded" })
      .eq("id", bid.id);
  } else {
    await supabase
      .from("quote_comparisons")
      .update({ status: "review" })
      .eq("id", comparison.id);
  }

  for (const match of matched) {
    await supabase
      .from("supplier_quote_items")
      .update({ comparison_item_id: match.comparisonItem!.id })
      .eq("id", match.item.id)
      .eq("quote_id", quote.id);
  }
  await supabase
    .from("supplier_quotes")
    .update({
      status: clientMode ? "client_quote" : "comparison",
      comparison_id: comparison.id,
      updated_by: user.id,
    })
    .eq("id", quote.id);
  revalidatePath("/admin/quote-comparison");
  revalidatePath(`/admin/supplier-quotes/${quote.id}`);
  const unmatched = items.length - matched.length;
  const matchMessage = unmatched
    ? ` ${matched.length} items matched the client request; ${unmatched} need manual matching.`
    : " All selected items matched the client request.";
  return {
    ok: true,
    data: { comparisonId: comparison.id },
    message: `${clientMode ? "Client quote workspace created." : "Supplier quote added to the comparison."}${comparison.request_id ? matchMessage : ""}`,
  };
}

export async function sendSupplierQuoteToComparisonAction(
  quoteId: string,
  itemIds: string[],
) {
  return createComparisonFromQuote(quoteId, itemIds, false);
}

export async function createClientQuoteFromSupplierQuoteAction(
  quoteId: string,
  itemIds: string[],
) {
  return createComparisonFromQuote(quoteId, itemIds, true);
}
