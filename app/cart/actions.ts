"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { sendCartSubmissionEmail } from "@/lib/cart-submission-email";
import { createProjectEvent, type ProjectRecord } from "@/lib/projects";
import type { ShopCartItemDetails, ShopCustomCartItem } from "@/lib/shop-cart";
import { buildShopProducts } from "@/lib/shop-catalog";
import { calculateShopCartTax, type ShopCartQuoteLineInput } from "@/lib/shop-checkout";
import { loadShopItems } from "@/lib/shop-loader";
import { createAdminClient } from "@/lib/supabase/admin";

function redirectToCart(key: "error" | "success", value: string): never {
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

function parseCartDetails(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ShopCartItemDetails => Boolean(item && typeof item === "object" && typeof (item as ShopCartItemDetails).productId === "string"));
  } catch {
    return [];
  }
}

function parseCustomLines(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ShopCustomCartItem => Boolean(item && typeof item === "object" && typeof (item as ShopCustomCartItem).id === "string"))
      .map((item) => ({
        ...item,
        name: String(item.name || "Custom request").trim() || "Custom request",
        category: String(item.category || "Services").trim() || "Services",
        quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        unit: String(item.unit || "Request").trim() || "Request",
        unitPrice: Number.isFinite(Number(item.unitPrice)) && Number(item.unitPrice) >= 0 ? Number(item.unitPrice) : 0,
        answers: Array.isArray(item.answers) ? item.answers : [],
      }));
  } catch {
    return [];
  }
}

function buildQualificationNotes(details: ShopCartItemDetails[], customLines: ShopCustomCartItem[]) {
  const sections: string[] = [];

  for (const detail of details) {
    if (detail.answers.length === 0 && detail.qualificationStatus !== "skipped") continue;
    const answers = detail.answers.map((answer) => `${answer.label}: ${answer.value}`).join("; ");
    sections.push(`${detail.productName} - ${detail.qualificationStatus}${answers ? ` - ${answers}` : ""}`);
  }

  for (const item of customLines) {
    const answers = item.answers.map((answer) => `${answer.label}: ${answer.value}`).join("; ");
    sections.push(`${item.name}${item.fileName ? ` (${item.fileName})` : ""} - ${item.qualificationStatus}${answers ? ` - ${answers}` : ""}`);
  }

  if (sections.length === 0) return "Created from shop cart request.";
  return `Created from shop cart request.\n\nQualifying details:\n${sections.map((section) => `- ${section}`).join("\n")}`;
}

export async function createQuoteFromCartAction(formData: FormData) {
  const { supabase, user, profile } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const cartLines = parseCartQuoteLines(formData.get("cartLines"));
  const cartDetails = parseCartDetails(formData.get("cartDetails"));
  const customLines = parseCustomLines(formData.get("customLines"));

  if (!projectId) {
    redirectToCart("error", "project-required");
  }

  if (cartLines.length === 0 && customLines.length === 0) {
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

  if (validItems.length === 0 && customLines.length === 0) {
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
  }).concat(
    customLines.map((item) => {
      const unitPrice = Number(Number(item.unitPrice || 0).toFixed(2));
      const lineTotal = Number((item.quantity * unitPrice).toFixed(2));

      return {
        project_id: projectId,
        owner_id: user.id,
        material_id: null,
        name: item.fileName ? `${item.name} - ${item.fileName}` : item.name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: unitPrice,
        line_total: lineTotal,
      };
    }),
  );

  const subtotal = Number(quoteItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2));
  const tax = calculateShopCartTax(subtotal);
  const total = Number((subtotal + tax).toFixed(2));

  if (quoteItems.length === 0) {
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
      notes: buildQualificationNotes(cartDetails, customLines),
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

  const emailResult = await sendCartSubmissionEmail({
    quoteId,
    project,
    customer: {
      email: user.email ?? null,
      profile,
    },
    quoteItems,
    cartDetails,
    customLines,
    subtotal,
    tax,
    total,
  });

  await createProjectEvent({
    supabase,
    projectId,
    ownerId: user.id,
    eventType: "quote_created",
    source: "quotes",
    title: "Shop cart quote requested",
    description: emailResult.owner.status === "sent"
      ? emailResult.client.status === "sent"
        ? "A request was created and confirmation emails were sent to the owner and client."
        : "A request was created and emailed to the owner; client confirmation was not delivered."
      : "A request was created, but the owner notification was not delivered.",
    metadata: {
      quote_id: quoteId,
      item_count: quoteItems.length,
      subtotal,
      tax,
      total,
      has_qualifying_details: cartDetails.length > 0 || customLines.length > 0,
      owner_email_status: emailResult.status,
      client_email_status: emailResult.client.status,
    },
  });

  const successCode =
    emailResult.status === "sent"
      ? "cart-quote-created-email-sent"
      : emailResult.status === "not_configured"
        ? "cart-quote-created-email-not-configured"
        : "cart-quote-created-email-failed";

  redirect(`/quotes?projectId=${encodeURIComponent(projectId)}&success=${successCode}`);
}
