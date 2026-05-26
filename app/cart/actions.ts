"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { createProjectEvent, type ProjectRecord } from "@/lib/projects";
import { buildShopProducts } from "@/lib/shop-catalog";
import { calculateShopCartTax, type ShopCartQuoteLineInput } from "@/lib/shop-checkout";
import { loadShopItems } from "@/lib/shop-loader";
import { createAdminClient } from "@/lib/supabase/admin";

function redirectToCart(key: "error" | "success", value: string) {
  const params = new URLSearchParams({ [key]: value });
  redirect(`/cart?${params.toString()}`);
}

async function cleanupFailedCartQuote(quoteId: string) {
  try {
    const admin = createAdminClient();
    await admin.from("project_quotes").delete().eq("id", quoteId);
  } catch (error) {
    console.error("Cart quote cleanup failed", error);
  }
}

function parseCartQuoteLines(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const lineMap = new Map<string, number>();

    for (const line of parsed) {
      if (!line || typeof line !== "object") continue;

      const productId = String((line as Partial<ShopCartQuoteLineInput>).productId || "").trim();
      const quantity = Number((line as Partial<ShopCartQuoteLineInput>).quantity || 0);

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;

      lineMap.set(productId, Number(((lineMap.get(productId) || 0) + quantity).toFixed(2)));
    }

    return Array.from(lineMap.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  } catch {
    return [];
  }
}

export async function createQuoteFromCartAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const cartLines = parseCartQuoteLines(formData.get("cartLines"));

  if (!projectId) {
    redirectToCart("error", "project-required");
  }

  if (cartLines.length === 0) {
    redirectToCart("error", "cart-empty");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>();

  if (projectError || !project) {
    redirectToCart("error", "project-not-found");
  }

  const quantitiesByProductId = new Map(cartLines.map((line) => [line.productId, line.quantity]));

  let catalogProducts: ReturnType<typeof buildShopProducts> = [];

  try {
    const catalogResult = await loadShopItems({ limit: 200 });
    catalogProducts = buildShopProducts(catalogResult.data, catalogResult.error);
  } catch (error) {
    console.error("Cart quote catalog load error", error);
    redirectToCart("error", "cart-items-load-failed");
  }

  const validItems = catalogProducts.filter((item) => quantitiesByProductId.has(item.id));

  if (validItems.length === 0) {
    redirectToCart("error", "cart-items-invalid");
  }

  const quoteItems = validItems.map((item) => {
    const quantity = quantitiesByProductId.get(item.id) || 0;
    const unitPrice = Number(Number(item.price || 0).toFixed(2));
    const lineTotal = Number((quantity * unitPrice).toFixed(2));

    return {
      project_id: projectId,
      owner_id: user.id,
      material_id: null,
      name: item.name,
      quantity,
      unit: item.unit,
      unit_price: unitPrice,
      line_total: lineTotal,
    };
  });

  const subtotal = Number(quoteItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2));
  const tax = calculateShopCartTax(subtotal);
  const total = Number((subtotal + tax).toFixed(2));

  if (total <= 0) {
    redirectToCart("error", "cart-total-invalid");
  }

  const { data: quote, error: quoteInsertError } = await supabase
    .from("project_quotes")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      status: "draft",
      subtotal,
      tax,
      total,
      notes: "Created from shop cart request.",
    })
    .select("id")
    .single<{ id: string }>();

  if (quoteInsertError || !quote) {
    redirectToCart("error", "cart-quote-create-failed");
  }

  const createdQuote = quote as { id: string };
  const quoteId = createdQuote.id;
  const rows = quoteItems.map((item) => ({
    ...item,
    quote_id: quoteId,
  }));

  const { error: quoteItemsInsertError } = await supabase.from("project_quote_items").insert(rows);

  if (quoteItemsInsertError) {
    await cleanupFailedCartQuote(quoteId);
    redirectToCart("error", "cart-quote-items-create-failed");
  }

  await createProjectEvent({
    supabase,
    projectId,
    ownerId: user.id,
    eventType: "quote_created",
    source: "quotes",
    title: "Shop cart quote requested",
    description: "A draft quote was created from the shop cart.",
    metadata: { quote_id: quoteId, item_count: quoteItems.length, subtotal, tax, total },
  });

  redirect(`/quotes?projectId=${encodeURIComponent(projectId)}&success=cart-quote-created`);
}
