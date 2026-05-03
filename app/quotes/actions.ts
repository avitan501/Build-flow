"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectMaterialRecord, ProjectQuoteItemRecord, ProjectQuoteRecord, ProjectRecord } from "@/lib/projects";

function redirectToQuotes(projectId: string, key: "error" | "success", value: string) {
  const params = new URLSearchParams({ projectId, [key]: value });
  redirect(`/quotes?${params.toString()}`);
}

async function requireOwnedProject(projectId: string, ownerId: string, supabase: Awaited<ReturnType<typeof requireSignedInProfile>>["supabase"]) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle<Pick<ProjectRecord, "id">>();

  if (projectError || !project) {
    return null;
  }

  return project;
}

export async function createProjectQuoteAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const notesRaw = String(formData.get("notes") || "").trim();

  if (!projectId) {
    redirect("/projects?error=missing-project");
  }

  const project = await requireOwnedProject(projectId, user.id, supabase);

  if (!project) {
    redirectToQuotes(projectId, "error", "project-not-found");
  }

  const { error: insertError } = await supabase.from("project_quotes").insert({
    project_id: projectId,
    owner_id: user.id,
    status: "draft",
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: notesRaw || null,
  });

  if (insertError) {
    redirectToQuotes(projectId, "error", "quote-create-failed");
  }

  redirectToQuotes(projectId, "success", "quote-created");
}

async function requireOwnedQuote(params: {
  projectId: string;
  quoteId: string;
  ownerId: string;
  supabase: Awaited<ReturnType<typeof requireSignedInProfile>>["supabase"];
}) {
  const { data: quote, error: quoteError } = await params.supabase
    .from("project_quotes")
    .select("id, project_id, owner_id, status")
    .eq("id", params.quoteId)
    .eq("project_id", params.projectId)
    .eq("owner_id", params.ownerId)
    .maybeSingle<Pick<ProjectQuoteRecord, "id" | "project_id" | "owner_id" | "status">>();

  if (quoteError || !quote) {
    return null;
  }

  return quote;
}

export async function addMaterialsToQuoteAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const quoteId = String(formData.get("quoteId") || "").trim();

  if (!projectId) {
    redirect("/projects?error=missing-project");
  }

  if (!quoteId) {
    redirectToQuotes(projectId, "error", "quote-not-found");
  }

  const project = await requireOwnedProject(projectId, user.id, supabase);

  if (!project) {
    redirectToQuotes(projectId, "error", "project-not-found");
  }

  const quote = await requireOwnedQuote({ projectId, quoteId, ownerId: user.id, supabase });

  if (!quote) {
    redirectToQuotes(projectId, "error", "quote-not-found");
  }

  const verifiedQuote = quote as Pick<ProjectQuoteRecord, "id" | "project_id" | "owner_id" | "status">;

  if (verifiedQuote.status !== "draft") {
    redirectToQuotes(projectId, "error", "quote-not-draft");
  }

  const { data: existingItems, error: existingItemsError } = await supabase
    .from("project_quote_items")
    .select("id")
    .eq("quote_id", quoteId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .returns<Pick<ProjectQuoteItemRecord, "id">[]>();

  if (existingItemsError) {
    redirectToQuotes(projectId, "error", "quote-items-load-failed");
  }

  if ((existingItems || []).length > 0) {
    redirectToQuotes(projectId, "success", "quote-materials-exist");
  }

  const { data: materials, error: materialsError } = await supabase
    .from("project_materials")
    .select("id, name, quantity, unit")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .returns<Pick<ProjectMaterialRecord, "id" | "name" | "quantity" | "unit">[]>();

  if (materialsError) {
    redirectToQuotes(projectId, "error", "materials-load-failed");
  }

  if ((materials || []).length === 0) {
    redirectToQuotes(projectId, "error", "materials-not-found");
  }

  const rows = (materials || []).map((material) => ({
    quote_id: quoteId,
    project_id: projectId,
    owner_id: user.id,
    material_id: material.id,
    name: material.name,
    quantity: material.quantity,
    unit: material.unit,
    unit_price: 0,
    line_total: 0,
  }));

  const { error: insertError } = await supabase.from("project_quote_items").insert(rows);

  if (insertError) {
    redirectToQuotes(projectId, "error", "quote-materials-create-failed");
  }

  redirectToQuotes(projectId, "success", "quote-materials-added");
}

export async function updateQuoteItemPricingAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const quoteId = String(formData.get("quoteId") || "").trim();
  const itemId = String(formData.get("itemId") || "").trim();
  const unitPriceRaw = String(formData.get("unitPrice") || "").trim();

  if (!projectId) {
    redirect("/projects?error=missing-project");
  }

  if (!quoteId) {
    redirectToQuotes(projectId, "error", "quote-not-found");
  }

  if (!itemId) {
    redirectToQuotes(projectId, "error", "quote-item-not-found");
  }

  const parsedUnitPrice = Number(unitPriceRaw);
  if (unitPriceRaw.length === 0 || Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
    redirectToQuotes(projectId, "error", "quote-item-price-invalid");
  }

  const unitPrice = Number(parsedUnitPrice.toFixed(2));

  const project = await requireOwnedProject(projectId, user.id, supabase);
  if (!project) {
    redirectToQuotes(projectId, "error", "project-not-found");
  }

  const quote = await requireOwnedQuote({ projectId, quoteId, ownerId: user.id, supabase });
  if (!quote) {
    redirectToQuotes(projectId, "error", "quote-not-found");
  }

  const verifiedQuote = quote as Pick<ProjectQuoteRecord, "id" | "project_id" | "owner_id" | "status">;

  if (verifiedQuote.status !== "draft") {
    redirectToQuotes(projectId, "error", "quote-not-draft");
  }

  const { data: item, error: itemError } = await supabase
    .from("project_quote_items")
    .select("id, quote_id, project_id, owner_id, quantity")
    .eq("id", itemId)
    .eq("quote_id", quoteId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<Pick<ProjectQuoteItemRecord, "id" | "quote_id" | "project_id" | "owner_id" | "quantity">>();

  if (itemError || !item) {
    redirectToQuotes(projectId, "error", "quote-item-not-found");
  }

  const verifiedItem = item as Pick<ProjectQuoteItemRecord, "id" | "quote_id" | "project_id" | "owner_id" | "quantity">;

  const quantity = verifiedItem.quantity ?? 0;
  const lineTotal = Number((quantity * unitPrice).toFixed(2));

  const { error: updateItemError } = await supabase
    .from("project_quote_items")
    .update({
      unit_price: unitPrice,
      line_total: lineTotal,
    })
    .eq("id", itemId)
    .eq("quote_id", quoteId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (updateItemError) {
    redirectToQuotes(projectId, "error", "quote-item-update-failed");
  }

  const { data: quoteItems, error: quoteItemsError } = await supabase
    .from("project_quote_items")
    .select("line_total")
    .eq("quote_id", quoteId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .returns<Pick<ProjectQuoteItemRecord, "line_total">[]>();

  if (quoteItemsError) {
    redirectToQuotes(projectId, "error", "quote-items-load-failed");
  }

  const subtotal = Number(
    ((quoteItems || []).reduce((sum, quoteItem) => sum + Number(quoteItem.line_total || 0), 0)).toFixed(2),
  );

  const { error: updateQuoteError } = await supabase
    .from("project_quotes")
    .update({
      subtotal,
      tax: 0,
      total: subtotal,
    })
    .eq("id", quoteId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id);

  if (updateQuoteError) {
    redirectToQuotes(projectId, "error", "quote-totals-update-failed");
  }

  redirectToQuotes(projectId, "success", "quote-item-price-updated");
}
