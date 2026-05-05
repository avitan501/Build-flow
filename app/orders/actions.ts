"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import type { ProjectOrderRecord, ProjectQuoteRecord, ProjectRecord } from "@/lib/projects";

function redirectToOrders(projectId: string, key: "error" | "success", value: string) {
  const params = new URLSearchParams({ projectId, [key]: value });
  redirect(`/orders?${params.toString()}`);
}

async function requireOwnedProject(projectId: string, ownerId: string, supabase: Awaited<ReturnType<typeof requireSignedInProfile>>["supabase"]) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle<Pick<ProjectRecord, "id">>();

  if (error || !project) {
    return null;
  }

  return project;
}

async function requireOwnedQuote(params: {
  projectId: string;
  quoteId: string;
  ownerId: string;
  supabase: Awaited<ReturnType<typeof requireSignedInProfile>>["supabase"];
}) {
  const { data: quote, error } = await params.supabase
    .from("project_quotes")
    .select("id, project_id, owner_id, status, total, notes")
    .eq("id", params.quoteId)
    .eq("project_id", params.projectId)
    .eq("owner_id", params.ownerId)
    .maybeSingle<Pick<ProjectQuoteRecord, "id" | "project_id" | "owner_id" | "status" | "total" | "notes">>();

  if (error || !quote) {
    return null;
  }

  return quote;
}

export async function createOrderFromApprovedQuoteAction(formData: FormData) {
  const { supabase, user } = await requireSignedInProfile();

  const projectId = String(formData.get("projectId") || "").trim();
  const quoteId = String(formData.get("quoteId") || "").trim();
  const notesRaw = String(formData.get("notes") || "").trim();

  if (!projectId) {
    redirect("/projects?error=missing-project");
  }

  if (!quoteId) {
    redirectToOrders(projectId, "error", "quote-not-found");
  }

  const project = await requireOwnedProject(projectId, user.id, supabase);
  if (!project) {
    redirectToOrders(projectId, "error", "project-not-found");
  }

  const quote = await requireOwnedQuote({ projectId, quoteId, ownerId: user.id, supabase });
  if (!quote) {
    redirectToOrders(projectId, "error", "quote-not-found");
  }

  const verifiedQuote = quote as Pick<ProjectQuoteRecord, "id" | "project_id" | "owner_id" | "status" | "total" | "notes">;

  if (verifiedQuote.status !== "approved") {
    redirectToOrders(projectId, "error", "quote-not-approved");
  }

  if (Number(verifiedQuote.total || 0) <= 0) {
    redirectToOrders(projectId, "error", "quote-total-invalid");
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("project_orders")
    .select("id")
    .eq("quote_id", verifiedQuote.id)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<Pick<ProjectOrderRecord, "id">>();

  if (existingOrderError) {
    redirectToOrders(projectId, "error", "order-check-failed");
  }

  if (existingOrder) {
    redirectToOrders(projectId, "success", "order-already-exists");
  }

  const { error: insertError } = await supabase.from("project_orders").insert({
    project_id: projectId,
    owner_id: user.id,
    quote_id: verifiedQuote.id,
    status: "approved",
    tracking_status: "not_started",
    total: verifiedQuote.total,
    notes: notesRaw || verifiedQuote.notes || null,
  });

  if (insertError) {
    redirectToOrders(projectId, "error", "order-create-failed");
  }

  redirectToOrders(projectId, "success", "order-created");
}
