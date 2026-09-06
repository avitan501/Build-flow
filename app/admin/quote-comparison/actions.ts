"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireStaffProfile } from "@/lib/auth";
import { matchRequestClientQuoteItems } from "@/lib/client-quote-import";
import { extractSupplierQuoteFile } from "@/lib/supplier-quote-extraction";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClientQuoteEmail } from "@/lib/cart-submission-email";
import { deliverEmailWithSupabaseFallback } from "@/lib/email-delivery-fallback";
import { generateClientQuotePdf } from "@/lib/client-quote-pdf";
import {
  analyzeQuoteComparison,
  buildClientQuoteSummary,
  quoteLineMatchStatus,
  type ClientQuoteAttachmentRecord,
  type QuoteComparisonBidRecord,
  type QuoteComparisonItemRecord,
  type QuoteComparisonRecord,
} from "@/lib/quote-comparison";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

const comparisonPath = (comparisonId: string) => `/admin/quote-comparison/${comparisonId}`;
const CLIENT_QUOTE_ATTACHMENT_BUCKET = "project-uploads";
const CLIENT_QUOTE_MAX_FILES = 10;
const CLIENT_QUOTE_MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function cleanAttachmentDisplayName(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 180) || "attachment";
}

function cleanMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0;
}

function cleanSignedMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function cleanUnitPrice(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 10_000) / 10_000 : 0;
}

function cleanMarkup(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.min(Math.round(amount * 1000) / 1000, 10_000) : 0;
}

function cleanTaxPercent(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.min(Math.round(amount * 10_000) / 10_000, 100) : 0;
}

function cleanQuantity(value: number) {
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, 100_000_000) : null;
}

async function ensureComparisonEditable(supabase: SupabaseClient, comparisonId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("quote_comparisons")
    .select("status")
    .eq("id", comparisonId)
    .maybeSingle<{ status: string }>();

  if (error || !data) return "The comparison could not be found.";
  if (!['draft', 'review'].includes(data.status)) return "Reopen this comparison before changing it.";
  return null;
}

async function ensureComparisonItemsEditable(supabase: SupabaseClient, comparisonId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("quote_comparisons")
    .select("status,request_id")
    .eq("id", comparisonId)
    .maybeSingle<{ status: string; request_id: string | null }>();

  if (error || !data) return "The comparison could not be found.";
  if (!["draft", "review"].includes(data.status)) return "Reopen this comparison before changing it.";
  if (data.request_id) return "Client-request items are locked for apples-to-apples comparison.";
  return null;
}

export async function createQuoteComparisonAction(input: {
  title: string;
  department: string;
  jobAddress: string;
  projectId?: string | null;
}): Promise<ActionResult<{ comparisonId: string }>> {
  const { supabase, user } = await requireStaffProfile("suppliers");
  const title = cleanText(input.title, 160);
  if (!title) return { ok: false, error: "Enter a name for this comparison." };

  const projectId = cleanText(input.projectId || "", 100) || null;
  const { data, error } = await supabase
    .from("quote_comparisons")
    .insert({
      title,
      department: cleanText(input.department, 120),
      job_address: cleanText(input.jobAddress, 500),
      project_id: projectId,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    console.error("Quote comparison creation failed", error);
    return { ok: false, error: "Could not create the comparison. The database update may still need to be applied." };
  }

  revalidatePath("/admin/quote-comparison");
  return { ok: true, data: { comparisonId: data.id } };
}

export async function updateQuoteComparisonAction(input: {
  comparisonId: string;
  title: string;
  department: string;
  jobAddress: string;
  projectId?: string | null;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const comparisonId = cleanText(input.comparisonId, 100);
  const title = cleanText(input.title, 160);
  if (!comparisonId || !title) return { ok: false, error: "A comparison name is required." };
  const lockedError = await ensureComparisonEditable(supabase, comparisonId);
  if (lockedError) return { ok: false, error: lockedError };

  const { error } = await supabase
    .from("quote_comparisons")
    .update({
      title,
      department: cleanText(input.department, 120),
      job_address: cleanText(input.jobAddress, 500),
      project_id: cleanText(input.projectId || "", 100) || null,
    })
    .eq("id", comparisonId);
  if (error) return { ok: false, error: "Could not save the comparison details." };

  revalidatePath(comparisonPath(comparisonId));
  revalidatePath("/admin/quote-comparison");
  return { ok: true };
}

export async function addQuoteComparisonItemAction(input: {
  comparisonId: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
}): Promise<ActionResult<{ item: QuoteComparisonItemRecord }>> {
  const { supabase } = await requireStaffProfile("suppliers");
  const description = cleanText(input.description, 500);
  const quantity = cleanQuantity(input.quantity);
  if (!description || quantity === null) return { ok: false, error: "Enter a material and a quantity greater than zero." };
  const lockedError = await ensureComparisonItemsEditable(supabase, input.comparisonId);
  if (lockedError) return { ok: false, error: lockedError };

  const { data: lastItem } = await supabase
    .from("quote_comparison_items")
    .select("sort_order")
    .eq("comparison_id", input.comparisonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data, error } = await supabase
    .from("quote_comparison_items")
    .insert({
      comparison_id: input.comparisonId,
      description,
      specification: cleanText(input.specification, 1000),
      quantity,
      unit: cleanText(input.unit, 40) || "each",
      sort_order: (lastItem?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single<QuoteComparisonItemRecord>();
  if (error || !data) return { ok: false, error: "Could not add this material." };

  revalidatePath(comparisonPath(input.comparisonId));
  return { ok: true, data: { item: data } };
}

export async function deleteQuoteComparisonItemAction(input: {
  comparisonId: string;
  itemId: string;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const lockedError = await ensureComparisonItemsEditable(supabase, input.comparisonId);
  if (lockedError) return { ok: false, error: lockedError };
  const { error } = await supabase
    .from("quote_comparison_items")
    .delete()
    .eq("id", input.itemId)
    .eq("comparison_id", input.comparisonId);
  if (error) return { ok: false, error: "Could not remove this material." };
  revalidatePath(comparisonPath(input.comparisonId));
  return { ok: true };
}

export async function addQuoteComparisonSupplierAction(input: {
  comparisonId: string;
  supplierId: string;
}): Promise<ActionResult<{ bid: QuoteComparisonBidRecord }>> {
  const { supabase } = await requireStaffProfile("suppliers");
  const lockedError = await ensureComparisonEditable(supabase, input.comparisonId);
  if (lockedError) return { ok: false, error: lockedError };
  const { data: snapshotData, error: snapshotError } = await supabase.rpc("staff_load_supplier_directory_snapshot");
  const suppliers = ((snapshotData as { settings?: { suppliers?: SupplierRoutingOption[] } } | null)?.settings?.suppliers ?? []);
  const supplier = suppliers.find((entry) => entry.id === input.supplierId);
  if (snapshotError || !supplier) return { ok: false, error: "Choose a supplier from the current directory." };

  const { data, error } = await supabase
    .from("quote_comparison_bids")
    .insert({
      comparison_id: input.comparisonId,
      supplier_id: supplier.id,
      supplier_name_snapshot: supplier.name,
      trust_level_snapshot: supplier.trustLevel || "not-reviewed",
    })
    .select("*")
    .single<QuoteComparisonBidRecord>();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "This supplier is already in the comparison." };
    return { ok: false, error: "Could not add this supplier." };
  }

  revalidatePath(comparisonPath(input.comparisonId));
  return { ok: true, data: { bid: data } };
}

export async function removeQuoteComparisonSupplierAction(input: {
  comparisonId: string;
  bidId: string;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const lockedError = await ensureComparisonEditable(supabase, input.comparisonId);
  if (lockedError) return { ok: false, error: lockedError };
  const { data: bid, error: bidError } = await supabase
    .from("quote_comparison_bids")
    .select("id")
    .eq("id", input.bidId)
    .eq("comparison_id", input.comparisonId)
    .maybeSingle<{ id: string }>();
  if (bidError || !bid) return { ok: false, error: "The supplier quote could not be found in this comparison." };
  const { error } = await supabase
    .from("quote_comparison_bids")
    .delete()
    .eq("id", input.bidId)
    .eq("comparison_id", input.comparisonId);
  if (error) return { ok: false, error: "Could not remove this supplier quote." };
  revalidatePath(comparisonPath(input.comparisonId));
  return { ok: true };
}

export async function saveQuoteComparisonClientTargetsAction(input: {
  comparisonId: string;
  clientDeliveryCharge: number;
  clientTaxPercent: number;
  items: Array<{ itemId: string; clientUnitPrice: number | null }>;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const comparisonId = cleanText(input.comparisonId, 100);
  if (!comparisonId || !Array.isArray(input.items) || input.items.length > 500) return { ok: false, error: "The client target prices are invalid." };
  const lockedError = await ensureComparisonEditable(supabase, comparisonId);
  if (lockedError) return { ok: false, error: lockedError };
  const itemIds = [...new Set(input.items.map((item) => cleanText(item.itemId, 100)).filter(Boolean))];
  const { data: existing, error: loadError } = await supabase.from("quote_comparison_items").select("id").eq("comparison_id", comparisonId).in("id", itemIds).returns<Array<{ id: string }>>();
  if (loadError || (existing ?? []).length !== itemIds.length) return { ok: false, error: "One of the material lines is no longer available." };
  const updates = await Promise.all(input.items.map((item) => {
    const raw = item.clientUnitPrice;
    const value = raw === null || raw === undefined || !Number.isFinite(Number(raw)) ? null : cleanUnitPrice(Number(raw));
    return supabase.from("quote_comparison_items").update({ client_unit_price: value }).eq("comparison_id", comparisonId).eq("id", item.itemId);
  }));
  if (updates.some((result) => result.error)) return { ok: false, error: "The client target prices could not be saved." };
  const { error: comparisonError } = await supabase.from("quote_comparisons").update({
    client_delivery_charge: cleanMoney(input.clientDeliveryCharge),
    client_tax_percent: cleanTaxPercent(input.clientTaxPercent),
  }).eq("id", comparisonId);
  if (comparisonError) return { ok: false, error: "The client delivery and tax could not be saved." };
  revalidatePath(comparisonPath(comparisonId));
  return { ok: true };
}

export async function importRequestClientQuotePricesAction(input: {
  comparisonId: string;
  attachmentId: string;
}): Promise<ActionResult<{
  fileName: string;
  matchedCount: number;
  extractedCount: number;
  prices: Array<{ itemId: string; clientUnitPrice: number }>;
  deliveryCharge: number | null;
  taxPercent: number | null;
}>> {
  const { supabase } = await requireStaffProfile("suppliers");
  if (!UUID_PATTERN.test(input.comparisonId) || !UUID_PATTERN.test(input.attachmentId)) {
    return { ok: false, error: "Choose a client quote from this request." };
  }
  const lockedError = await ensureComparisonEditable(supabase, input.comparisonId);
  if (lockedError) return { ok: false, error: lockedError };

  const { data: comparison, error: comparisonError } = await supabase
    .from("quote_comparisons")
    .select("id,request_id")
    .eq("id", input.comparisonId)
    .maybeSingle<{ id: string; request_id: string | null }>();
  if (comparisonError || !comparison?.request_id) {
    return { ok: false, error: "This comparison is not connected to a client request." };
  }

  const { data: attachment, error: attachmentError } = await supabase
    .from("quote_request_attachments")
    .select("id,request_id,file_name,file_path,file_type,file_size")
    .eq("id", input.attachmentId)
    .eq("request_id", comparison.request_id)
    .maybeSingle<{ id: string; request_id: string; file_name: string; file_path: string; file_type: string; file_size: number }>();
  if (attachmentError || !attachment) {
    return { ok: false, error: "That client quote is not attached to this exact request." };
  }

  const { data: comparisonItems, error: itemsError } = await supabase
    .from("quote_comparison_items")
    .select("id,description,specification")
    .eq("comparison_id", input.comparisonId)
    .order("sort_order")
    .returns<Array<{ id: string; description: string; specification: string }>>();
  if (itemsError || !comparisonItems?.length) {
    return { ok: false, error: "This comparison has no request lines to match." };
  }

  try {
    const admin = createAdminClient();
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from(CLIENT_QUOTE_ATTACHMENT_BUCKET)
      .download(attachment.file_path);
    if (downloadError || !fileBlob) throw downloadError ?? new Error("Client quote download failed");
    const file = new File([fileBlob], attachment.file_name, { type: attachment.file_type });
    const extraction = await extractSupplierQuoteFile(file, "", async (payload) => {
      const { data, error } = await supabase.functions.invoke("supplier-quote-ocr", { body: payload });
      if (error) throw error;
      return data;
    });
    const { matches } = matchRequestClientQuoteItems(extraction.items, comparisonItems);
    const extractedCount = extraction.items.filter((item) => item.unitPrice !== null || (item.lineTotal !== null && item.quantity > 0)).length;
    if (!matches.length) {
      return { ok: false, error: "No priced lines in this client quote matched the request. The file was kept; review the material names or enter prices manually." };
    }
    const updates = await Promise.all(matches.map((match) => supabase
      .from("quote_comparison_items")
      .update({ client_unit_price: cleanUnitPrice(match.clientUnitPrice) })
      .eq("comparison_id", input.comparisonId)
      .eq("id", match.comparisonItemId)));
    if (updates.some((update) => update.error)) throw new Error("Client line price update failed");

    const hasDelivery = Number(extraction.metadata.deliveryCharge) > 0;
    const hasTax = Number(extraction.metadata.taxPercent) > 0;
    if (hasDelivery || hasTax) {
      const values: { client_delivery_charge?: number; client_tax_percent?: number } = {};
      if (hasDelivery) values.client_delivery_charge = cleanMoney(extraction.metadata.deliveryCharge);
      if (hasTax) values.client_tax_percent = cleanTaxPercent(extraction.metadata.taxPercent);
      const { error } = await supabase.from("quote_comparisons").update(values).eq("id", input.comparisonId);
      if (error) throw error;
    }
    revalidatePath(comparisonPath(input.comparisonId));
    return {
      ok: true,
      data: {
        fileName: attachment.file_name,
        matchedCount: matches.length,
        extractedCount,
        prices: matches.map((match) => ({ itemId: match.comparisonItemId, clientUnitPrice: cleanUnitPrice(match.clientUnitPrice) })),
        deliveryCharge: hasDelivery ? cleanMoney(extraction.metadata.deliveryCharge) : null,
        taxPercent: hasTax ? cleanTaxPercent(extraction.metadata.taxPercent) : null,
      },
    };
  } catch (error) {
    console.error("Client quote import failed", error);
    return { ok: false, error: "The client quote could not be read. The attachment is still saved; try again or enter the client prices manually." };
  }
}

export async function saveQuoteComparisonBidAction(input: {
  comparisonId: string;
  bidId: string;
  deliveryCharge: number;
  taxPercent: number;
  leadTimeDays: number | null;
  notes: string;
  prices: Array<{ itemId: string; unitPrice: number | null; isAvailable: boolean }>;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const leadTime = input.leadTimeDays === null ? null : Math.max(0, Math.min(3650, Math.round(input.leadTimeDays)));
  const { error } = await supabase.rpc("staff_save_quote_comparison_bid", {
    p_comparison_id: input.comparisonId,
    p_bid_id: input.bidId,
    p_delivery_charge: cleanMoney(input.deliveryCharge),
    p_tax_percent: cleanTaxPercent(input.taxPercent),
    p_lead_time_days: leadTime,
    p_notes: cleanText(input.notes, 4000),
    p_prices: input.prices.map((price) => ({
      item_id: price.itemId,
      unit_price: price.unitPrice === null ? null : cleanUnitPrice(price.unitPrice),
      is_available: price.isAvailable,
    })),
  });
  if (error) {
    if (error.message.includes("comparison_locked")) return { ok: false, error: "Reopen this comparison before changing prices." };
    return { ok: false, error: "Could not save this supplier quote." };
  }

  revalidatePath(comparisonPath(input.comparisonId));
  return { ok: true };
}

export async function confirmQuoteComparisonPriceMatchAction(input: {
  comparisonId: string;
  bidId: string;
  itemId: string;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const lockedError = await ensureComparisonEditable(supabase, input.comparisonId);
  if (lockedError) return { ok: false, error: lockedError };
  const { data: bid, error: bidError } = await supabase
    .from("quote_comparison_bids")
    .select("id")
    .eq("id", input.bidId)
    .eq("comparison_id", input.comparisonId)
    .maybeSingle<{ id: string }>();
  if (bidError || !bid) return { ok: false, error: "The supplier quote could not be found in this comparison." };
  const { error } = await supabase
    .from("quote_comparison_prices")
    .update({ notes: "" })
    .eq("bid_id", input.bidId)
    .eq("item_id", input.itemId);
  if (error) return { ok: false, error: "The supplier item match could not be confirmed." };
  revalidatePath(comparisonPath(input.comparisonId));
  return { ok: true };
}

export async function awardQuoteComparisonBidAction(input: {
  comparisonId: string;
  bidId: string;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const [itemsResult, bidsResult] = await Promise.all([
    supabase.from("quote_comparison_items").select("*").eq("comparison_id", input.comparisonId).returns<QuoteComparisonItemRecord[]>(),
    supabase
      .from("quote_comparison_bids")
      .select("*,quote_comparison_prices(*)")
      .eq("comparison_id", input.comparisonId)
      .returns<QuoteComparisonBidRecord[]>(),
  ]);
  if (itemsResult.error || bidsResult.error) return { ok: false, error: "Could not verify the comparison." };
  const analysis = analyzeQuoteComparison(itemsResult.data ?? [], bidsResult.data ?? []).find((entry) => entry.bidId === input.bidId);
  if (!analysis || analysis.blocked || !analysis.eligible || analysis.missingItemCount > 0) {
    return { ok: false, error: "This supplier cannot be selected until material prices, delivery, tax, and lead time are complete." };
  }
  const selectedBid = (bidsResult.data ?? []).find((bid) => bid.id === input.bidId);
  const prices = new Map((selectedBid?.quote_comparison_prices ?? []).map((price) => [price.item_id, price]));
  const weakMatch = (itemsResult.data ?? []).find((item) => {
    const sourceDescription = prices.get(item.id)?.notes ?? "";
    const matchStatus = quoteLineMatchStatus(item, sourceDescription);
    return sourceDescription && matchStatus !== "exact" && matchStatus !== "manual";
  });
  if (weakMatch) return { ok: false, error: `Review the supplier match for ${weakMatch.description} before selecting this supplier.` };

  const { error } = await supabase.rpc("staff_award_quote_comparison_bid", {
    p_comparison_id: input.comparisonId,
    p_bid_id: input.bidId,
  });
  if (error) return { ok: false, error: "Could not select this supplier. Reopen the comparison and try again." };

  revalidatePath(comparisonPath(input.comparisonId));
  revalidatePath("/admin/quote-comparison");
  return { ok: true };
}

export async function saveClientQuoteAction(input: {
  comparisonId: string;
  clientId: string;
  quoteNumber: string;
  expiresOn: string | null;
  clientMessage: string;
  clientDeliveryCharge: number;
  clientTaxPercent: number;
  items: Array<{ itemId: string; markupPercent: number; clientUnitPrice: number }>;
}): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const comparisonId = cleanText(input.comparisonId, 100);
  const clientId = cleanText(input.clientId, 100);
  const quoteNumber = cleanText(input.quoteNumber, 40).toUpperCase();
  if (!comparisonId || !clientId) return { ok: false, error: "Choose a client before saving the quote." };
  if (quoteNumber.length < 3) return { ok: false, error: "Enter a quote number." };
  if (!input.items.length) return { ok: false, error: "Add materials and client pricing before saving." };
  const expiresOn = input.expiresOn && /^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) ? input.expiresOn : null;

  const { error } = await supabase.rpc("staff_save_quote_comparison_client_quote", {
    p_comparison_id: comparisonId,
    p_client_id: clientId,
    p_quote_number: quoteNumber,
    p_expires_on: expiresOn,
    p_client_message: cleanText(input.clientMessage, 4000),
    p_client_delivery_charge: cleanMoney(input.clientDeliveryCharge),
    p_client_tax_percent: cleanTaxPercent(input.clientTaxPercent),
    p_items: input.items.map((item) => ({
      item_id: item.itemId,
      markup_percent: cleanMarkup(item.markupPercent),
      client_unit_price: cleanUnitPrice(item.clientUnitPrice),
    })),
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This quote number is already in use." };
    if (error.message.includes("supplier_selection_required")) return { ok: false, error: "Select the winning supplier before preparing the client quote." };
    if (error.message.includes("client_not_found")) return { ok: false, error: "Choose an active client with an email address." };
    if (error.message.includes("client_prices_incomplete")) return { ok: false, error: "Every material needs a client price." };
    console.error("Client quote save failed", error);
    return { ok: false, error: "Could not save the client quote." };
  }

  revalidatePath(comparisonPath(comparisonId));
  revalidatePath("/admin/quote-comparison");
  return { ok: true };
}

export async function sendClientQuoteAction(comparisonId: string): Promise<ActionResult<{ recipient: string; providerId: string | null }>> {
  const { supabase, user } = await requireStaffProfile("suppliers");
  const safeComparisonId = cleanText(comparisonId, 100);
  const [comparisonResult, itemsResult, bidsResult, attachmentsResult] = await Promise.all([
    supabase.from("quote_comparisons").select("*").eq("id", safeComparisonId).maybeSingle<QuoteComparisonRecord>(),
    supabase.from("quote_comparison_items").select("*").eq("comparison_id", safeComparisonId).order("sort_order").returns<QuoteComparisonItemRecord[]>(),
    supabase.from("quote_comparison_bids").select("*,quote_comparison_prices(*)").eq("comparison_id", safeComparisonId).returns<QuoteComparisonBidRecord[]>(),
    supabase.from("quote_comparison_client_attachments").select("id,comparison_id,file_name,file_path,file_type,file_size,created_at").eq("comparison_id", safeComparisonId).order("created_at").returns<ClientQuoteAttachmentRecord[]>(),
  ]);
  const comparison = comparisonResult.data;
  const items = itemsResult.data ?? [];
  const bids = bidsResult.data ?? [];
  if (comparisonResult.error || itemsResult.error || bidsResult.error || attachmentsResult.error || !comparison) {
    return { ok: false, error: "Could not load the saved client quote." };
  }
  if (!comparison.client_id || !comparison.client_email_snapshot) return { ok: false, error: "Choose a client and save the quote first." };
  if (!comparison.awarded_bid_id) return { ok: false, error: "Select the winning supplier first." };
  const selectedBid = bids.find((bid) => bid.id === comparison.awarded_bid_id);
  const summary = buildClientQuoteSummary(items, selectedBid, comparison.client_delivery_charge, comparison.client_tax_percent);
  if (!summary.complete) return { ok: false, error: "Every material needs a supplier cost and client price before sending." };
  if (summary.clientTotal <= 0) return { ok: false, error: "The client quote total must be greater than zero." };

  const pdf = await generateClientQuotePdf({
    comparison,
    clientName: comparison.client_name_snapshot || comparison.client_email_snapshot,
    createdAt: new Date(),
    summary,
  });
  const attachmentRecords = attachmentsResult.data ?? [];
  const attachmentBinaryTotal = attachmentRecords.reduce((sum, attachment) => sum + Number(attachment.file_size || 0), pdf.byteLength);
  if (attachmentRecords.length > CLIENT_QUOTE_MAX_FILES || attachmentBinaryTotal > CLIENT_QUOTE_MAX_TOTAL_SIZE + pdf.byteLength) {
    return { ok: false, error: "The quote attachments are too large to email. Remove a file and try again." };
  }
  const clientAttachments: Array<{ filename: string; content: string }> = [];
  for (const attachment of attachmentRecords) {
    const { data, error } = await supabase.storage.from(CLIENT_QUOTE_ATTACHMENT_BUCKET).download(attachment.file_path);
    if (error || !data) {
      console.error("Client quote attachment download failed", { attachmentId: attachment.id, error });
      return { ok: false, error: `${attachment.file_name} could not be attached. Remove it or upload it again.` };
    }
    clientAttachments.push({ filename: cleanAttachmentDisplayName(attachment.file_name), content: Buffer.from(await data.arrayBuffer()).toString("base64") });
  }
  const deliveryId = crypto.randomUUID();
  const delivery = await deliverEmailWithSupabaseFallback(
    () => sendClientQuoteEmail({
      comparisonId: comparison.id,
      quoteNumber: comparison.quote_number,
      recipientName: comparison.client_name_snapshot || "Client",
      recipientEmail: comparison.client_email_snapshot,
      jobAddress: comparison.job_address,
      expiresOn: comparison.expires_on,
      message: comparison.client_message,
      items: summary.lines.map((line) => ({
        description: line.description,
        specification: line.specification,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.clientUnitPrice ?? 0,
        lineTotal: line.clientLineTotal,
      })),
      deliveryCharge: summary.clientDeliveryCharge,
      taxPercent: summary.clientTaxPercent,
      taxAmount: summary.clientTaxAmount,
      total: summary.clientTotal,
      pdfBase64: pdf.toString("base64"),
      attachments: clientAttachments,
      idempotencyKey: `avantia-client-quote-${comparison.id}-${deliveryId}`,
    }),
    () => supabase.functions.invoke<{ ok?: boolean; providerId?: string | null; error?: string }>("send-supplier-quote", {
      body: {
        action: "send_client_quote",
        requestId: comparison.id,
        deliveryId,
        attachment: { filename: `${comparison.quote_number}.pdf`, content: pdf.toString("base64") },
      },
    }),
  );
  const sent = delivery.status === "sent";
  const providerId = delivery.status === "sent" ? delivery.providerId : null;
  const deliveryError = delivery.status === "failed" ? delivery.error : delivery.status === "not_configured" ? "Email is not configured." : "";
  const { error: auditError } = await supabase.from("quote_comparison_client_deliveries").insert({
    comparison_id: comparison.id,
    recipient_name: comparison.client_name_snapshot || comparison.client_email_snapshot,
    recipient_email: comparison.client_email_snapshot,
    quote_number_snapshot: comparison.quote_number,
    subject: `Avantia Build material quote ${comparison.quote_number}`,
    client_total_snapshot: cleanMoney(summary.clientTotal),
    client_tax_percent_snapshot: cleanTaxPercent(summary.clientTaxPercent),
    client_tax_amount_snapshot: cleanMoney(summary.clientTaxAmount),
    profit_snapshot: cleanSignedMoney(summary.profit),
    items_snapshot: summary.lines.map((line) => ({
      description: line.description,
      specification: line.specification,
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.clientUnitPrice,
      line_total: line.clientLineTotal,
    })),
    attachments_snapshot: attachmentRecords.map((attachment) => ({
      id: attachment.id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      file_size: attachment.file_size,
    })),
    provider_id: providerId,
    delivery_status: sent ? "sent" : "failed",
    error_message: deliveryError,
    created_by: user.id,
  });
  if (auditError) console.error("Client quote delivery audit failed", auditError);

  if (!sent) {
    if (delivery.status === "not_configured") return { ok: false, error: "Website email is not configured." };
    return { ok: false, error: delivery.status === "failed" ? delivery.error : "The client quote was not sent." };
  }

  const sentAt = new Date().toISOString();
  const { error: statusError } = await supabase
    .from("quote_comparisons")
    .update({ client_quote_status: "sent", quote_sent_at: sentAt })
    .eq("id", comparison.id);
  if (statusError) console.error("Client quote sent status update failed", statusError);

  revalidatePath(comparisonPath(comparison.id));
  revalidatePath("/admin/quote-comparison");
  return { ok: true, data: { recipient: comparison.client_email_snapshot, providerId } };
}

export async function reopenQuoteComparisonAction(comparisonId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const { error } = await supabase.rpc("staff_reopen_quote_comparison", { p_comparison_id: comparisonId });
  if (error) return { ok: false, error: "Could not reopen this comparison." };
  revalidatePath(comparisonPath(comparisonId));
  revalidatePath("/admin/quote-comparison");
  return { ok: true };
}

export async function archiveQuoteComparisonAction(comparisonId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const { error } = await supabase.from("quote_comparisons").update({ status: "archived" }).eq("id", comparisonId);
  if (error) return { ok: false, error: "Could not archive this comparison." };
  revalidatePath(comparisonPath(comparisonId));
  revalidatePath("/admin/quote-comparison");
  return { ok: true };
}

export async function deleteQuoteComparisonAction(comparisonId: string): Promise<ActionResult> {
  const { supabase } = await requireStaffProfile("suppliers");
  const { error } = await supabase.from("quote_comparisons").delete().eq("id", comparisonId);
  if (error) return { ok: false, error: "Could not delete this comparison." };
  revalidatePath("/admin/quote-comparison");
  return { ok: true };
}
