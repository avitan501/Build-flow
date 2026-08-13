"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireStaffProfile } from "@/lib/auth";
import { analyzeQuoteComparison, type QuoteComparisonBidRecord, type QuoteComparisonItemRecord } from "@/lib/quote-comparison";
import type { SupplierRoutingOption } from "@/lib/shop-qualification";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

const comparisonPath = (comparisonId: string) => `/admin/quote-comparison/${comparisonId}`;

function cleanText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function cleanMoney(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0;
}

function cleanUnitPrice(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 10_000) / 10_000 : 0;
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
  const lockedError = await ensureComparisonEditable(supabase, input.comparisonId);
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
  const lockedError = await ensureComparisonEditable(supabase, input.comparisonId);
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
  const { error } = await supabase
    .from("quote_comparison_bids")
    .delete()
    .eq("id", input.bidId)
    .eq("comparison_id", input.comparisonId);
  if (error) return { ok: false, error: "Could not remove this supplier quote." };
  revalidatePath(comparisonPath(input.comparisonId));
  return { ok: true };
}

export async function saveQuoteComparisonBidAction(input: {
  comparisonId: string;
  bidId: string;
  deliveryCharge: number;
  taxAmount: number;
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
    p_tax_amount: cleanMoney(input.taxAmount),
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
  if (!analysis || analysis.blocked || analysis.pricedItemCount === 0) {
    return { ok: false, error: "This supplier cannot be selected until it has valid pricing and an allowed trust level." };
  }

  const { error } = await supabase.rpc("staff_award_quote_comparison_bid", {
    p_comparison_id: input.comparisonId,
    p_bid_id: input.bidId,
  });
  if (error) return { ok: false, error: "Could not select this supplier. Reopen the comparison and try again." };

  revalidatePath(comparisonPath(input.comparisonId));
  revalidatePath("/admin/quote-comparison");
  return { ok: true };
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
