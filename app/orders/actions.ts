"use server";

import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { generateOrderPdf } from "@/lib/order-pdf";
import {
  buildProjectUploadStoragePath,
  createProjectEvent,
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectOrderRecord,
  type ProjectQuoteItemRecord,
  type ProjectQuoteRecord,
  type ProjectRecord,
} from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";

function redirectToOrders(projectId: string, key: "error" | "success", value: string) {
  const params = new URLSearchParams({ projectId, [key]: value });
  redirect(`/orders?${params.toString()}`);
}

function isDuplicateKeyError(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

async function cleanupFailedOrderPdf(params: {
  orderId: string;
  uploadId: string;
  filePath: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("project_uploads").delete().eq("id", params.uploadId);
    await admin.from("project_orders").delete().eq("id", params.orderId);
    await admin.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).remove([params.filePath]);
  } catch (error) {
    console.error("Order PDF cleanup failed", error);
  }
}

async function requireOwnedProject(projectId: string, ownerId: string, supabase: Awaited<ReturnType<typeof requireSignedInProfile>>["supabase"]) {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle<ProjectRecord>();

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
    .select("id, project_id, owner_id, status, subtotal, tax, total, notes")
    .eq("id", params.quoteId)
    .eq("project_id", params.projectId)
    .eq("owner_id", params.ownerId)
    .maybeSingle<Pick<ProjectQuoteRecord, "id" | "project_id" | "owner_id" | "status" | "subtotal" | "tax" | "total" | "notes">>();

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
  const verifiedProject = project as ProjectRecord;

  const quote = await requireOwnedQuote({ projectId, quoteId, ownerId: user.id, supabase });
  if (!quote) {
    redirectToOrders(projectId, "error", "quote-not-found");
  }

  const verifiedQuote = quote as Pick<ProjectQuoteRecord, "id" | "project_id" | "owner_id" | "status" | "subtotal" | "tax" | "total" | "notes">;

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

  const orderId = verifiedQuote.id;
  const uploadId = crypto.randomUUID();
  const createdAt = new Date();

  const { data: quoteItems, error: quoteItemsError } = await supabase
    .from("project_quote_items")
    .select("id, quote_id, project_id, owner_id, material_id, name, quantity, unit, unit_price, line_total, created_at")
    .eq("quote_id", verifiedQuote.id)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .returns<ProjectQuoteItemRecord[]>();

  if (quoteItemsError) {
    redirectToOrders(projectId, "error", "order-pdf-items-failed");
  }

  const { data: latestExistingOrder, error: latestExistingOrderError } = await supabase
    .from("project_orders")
    .select("id")
    .eq("quote_id", verifiedQuote.id)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<Pick<ProjectOrderRecord, "id">>();

  if (latestExistingOrderError) {
    redirectToOrders(projectId, "error", "order-check-failed");
  }

  if (latestExistingOrder) {
    redirectToOrders(projectId, "success", "order-already-exists");
  }

  const pdfFileName = `order-${orderId.slice(0, 8)}.pdf`;
  const pdfBytes = generateOrderPdf({
    project: verifiedProject,
    quote: verifiedQuote,
    order: {
      id: orderId,
      createdAt,
      notes: notesRaw || verifiedQuote.notes || null,
    },
    items: quoteItems ?? [],
  });
  const filePath = buildProjectUploadStoragePath({
    ownerId: user.id,
    projectId,
    uploadId,
    fileName: pdfFileName,
  });

  const { data: order, error: insertError } = await supabase
    .from("project_orders")
    .insert({
      id: orderId,
      project_id: projectId,
      owner_id: user.id,
      quote_id: verifiedQuote.id,
      status: "approved",
      tracking_status: "not_started",
      total: verifiedQuote.total,
      notes: notesRaw || verifiedQuote.notes || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !order) {
    if (isDuplicateKeyError(insertError)) {
      redirectToOrders(projectId, "success", "order-already-exists");
    }
    redirectToOrders(projectId, "error", "order-create-failed");
  }

  const createdOrder = order as { id: string };
  const { error: storageError } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).upload(filePath, pdfBytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (storageError) {
    console.error("Order PDF storage upload error", {
      message: storageError.message,
      name: storageError.name,
      projectId,
      orderId: createdOrder.id,
    });
    await cleanupFailedOrderPdf({ orderId: createdOrder.id, uploadId, filePath });
    redirectToOrders(projectId, "error", "order-pdf-upload-failed");
  }

  const { error: uploadInsertError } = await supabase.from("project_uploads").insert({
    id: uploadId,
    project_id: projectId,
    owner_id: user.id,
    file_name: pdfFileName,
    file_path: filePath,
    file_type: "application/pdf",
    file_size: pdfBytes.byteLength,
    status: "ready",
  });

  if (uploadInsertError) {
    console.error("Order PDF metadata insert error", {
      message: uploadInsertError.message,
      code: uploadInsertError.code,
      projectId,
      orderId: createdOrder.id,
    });
    await cleanupFailedOrderPdf({ orderId: createdOrder.id, uploadId, filePath });
    redirectToOrders(projectId, "error", "order-pdf-record-failed");
  }

  await createProjectEvent({
    supabase,
    projectId,
    ownerId: user.id,
    eventType: "order_created",
    source: "orders",
    title: "Order created",
    description: "An order was created from an approved quote and a PDF copy was saved to the project.",
    metadata: { order_id: createdOrder.id, quote_id: verifiedQuote.id, upload_id: uploadId, file_name: pdfFileName },
  });

  await createProjectEvent({
    supabase,
    projectId,
    ownerId: user.id,
    eventType: "file_uploaded",
    source: "orders",
    title: "Order PDF saved",
    description: `${pdfFileName} was saved to the project documents.`,
    metadata: { order_id: createdOrder.id, quote_id: verifiedQuote.id, upload_id: uploadId, file_name: pdfFileName },
  });

  redirectToOrders(projectId, "success", "order-created");
}
