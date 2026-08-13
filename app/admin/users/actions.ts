"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAdminProfile, requireStaffProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminAction = "approve" | "reject" | "suspend" | "change_role";
type RoleValue = "admin" | "staff" | "client";
type DeletionTarget = "customer" | "project" | "request";
type DeleteManagerRecordResult =
  | { ok: true; warning?: string }
  | { ok: false; error: string };
export type ManagerRequestLineInput = { name: string; quantity: number; unit: string };
export type ManagerNewClientInput = { fullName: string; email: string; phone?: string; companyName?: string };
export type CreateClientRequestResult =
  | { ok: true; requestId: string; customerId: string }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUuid(value: string) {
  return UUID_PATTERN.test(value.trim());
}

async function cleanupQueuedFiles(targetType: DeletionTarget, targetId: string) {
  const admin = createAdminClient();
  const { data: queued, error: queueError } = await admin
    .from("manager_file_deletion_queue")
    .select("id,bucket_id,object_path")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .returns<Array<{ id: string; bucket_id: string; object_path: string }>>();

  if (queueError) throw new Error("Could not load queued file cleanup.");
  if (!queued?.length) return;

  const byBucket = new Map<string, Array<{ id: string; objectPath: string }>>();
  for (const file of queued) {
    const entries = byBucket.get(file.bucket_id) ?? [];
    entries.push({ id: file.id, objectPath: file.object_path });
    byBucket.set(file.bucket_id, entries);
  }

  for (const [bucket, entries] of byBucket) {
    for (let index = 0; index < entries.length; index += 1000) {
      const chunk = entries.slice(index, index + 1000);
      let removablePaths = chunk.map((file) => file.objectPath);

      if (targetType !== "customer") {
        const [{ data: uploads, error: uploadsError }, { data: attachments, error: attachmentsError }] = await Promise.all([
          admin.from("project_uploads").select("file_path").in("file_path", removablePaths).returns<Array<{ file_path: string }>>(),
          admin.from("quote_request_attachments").select("file_path").in("file_path", removablePaths).returns<Array<{ file_path: string }>>(),
        ]);
        if (uploadsError || attachmentsError) throw new Error("Could not verify uploaded file ownership.");

        const stillReferenced = new Set([...(uploads ?? []), ...(attachments ?? [])].map((file) => file.file_path));
        removablePaths = removablePaths.filter((filePath) => !stillReferenced.has(filePath));
      }

      if (removablePaths.length) {
        const { error: storageError } = await admin.storage.from(bucket).remove(removablePaths);
        if (storageError) throw new Error("Could not remove all uploaded files.");
      }

      const { error: dequeueError } = await admin
        .from("manager_file_deletion_queue")
        .delete()
        .in("id", chunk.map((file) => file.id));
      if (dequeueError) throw new Error("Could not complete queued file cleanup.");
    }
  }
}

function deletionError(message: string, target: DeletionTarget) {
  if (message.includes(`${target}_not_found`)) return `This ${target} was already deleted.`;
  if (message.includes("only_open_requests_can_be_deleted")) return "Only open requests can be deleted.";
  if (message.includes("only_customer_accounts_can_be_deleted")) return "Staff and administrator accounts cannot be deleted here.";
  if (message.includes("cannot_delete_current_account")) return "You cannot delete your own account.";
  if (message.includes("customer_has_manager_history")) return "This account has manager history and cannot be deleted as a customer.";
  if (message.includes("customer_files_must_be_removed_first")) return "The customer was not deleted because uploaded files could not be removed. Please try again.";
  return `Could not delete this ${target}. No unrelated records were changed.`;
}

async function applyUserAction(formData: FormData, action: AdminAction) {
  const { profile, supabase } = await requireAdminProfile();
  const adminProfile = profile;

  if (!adminProfile) {
    throw new Error("Admin profile is required.");
  }

  const userId = String(formData.get("userId") || "").trim();
  const nextRole = String(formData.get("role") || "").trim() as RoleValue;

  if (!userId) {
    throw new Error("Missing user id.");
  }

  if (userId === adminProfile.id) {
    throw new Error("Admin cannot change their own approval or role from this screen.");
  }

  const { data: targetUser, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, approval_status, is_active")
    .eq("id", userId)
    .single();

  if (targetError || !targetUser) {
    throw new Error("Target user not found.");
  }

  const oldRole = targetUser.role;
  const oldApprovalStatus = targetUser.approval_status;
  const patch: Record<string, string | boolean | null> = {};
  const audit: Record<string, string | null> = {
    old_role: oldRole,
    new_role: oldRole,
    old_approval_status: oldApprovalStatus,
    new_approval_status: oldApprovalStatus,
  };

  if (action === "approve") {
    patch.approval_status = "approved";
    patch.is_active = true;
    patch.approved_by = adminProfile.id;
    patch.approved_at = new Date().toISOString();
    audit.old_role = null;
    audit.new_role = null;
    audit.new_approval_status = "approved";
  }

  if (action === "reject") {
    patch.approval_status = "rejected";
    audit.old_role = null;
    audit.new_role = null;
    audit.new_approval_status = "rejected";
  }

  if (action === "suspend") {
    patch.approval_status = "suspended";
    patch.is_active = false;
    audit.old_role = null;
    audit.new_role = null;
    audit.new_approval_status = "suspended";
  }

  if (action === "change_role") {
    if (!["admin", "staff", "client"].includes(nextRole)) {
      throw new Error("Invalid role selected.");
    }

    patch.role = nextRole;
    audit.new_role = nextRole;
    audit.old_approval_status = null;
    audit.new_approval_status = null;
  }

  const { error: updateError } = await supabase.from("profiles").update(patch).eq("id", userId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to update user.");
  }

  const actionName =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : action === "suspend"
          ? "suspended"
          : "role_changed";

  const { error: auditError } = await supabase.from("approval_actions").insert({
    user_id: userId,
    action: actionName,
    old_role: audit.old_role,
    new_role: audit.new_role,
    old_approval_status: audit.old_approval_status,
    new_approval_status: audit.new_approval_status,
    performed_by: adminProfile.id,
  });

  if (auditError) {
    throw new Error(auditError.message || "Failed to write approval audit log.");
  }

  revalidatePath("/admin/users");
}

export async function approvePendingUser(formData: FormData) {
  await applyUserAction(formData, "approve");
}

export async function rejectUser(formData: FormData) {
  await applyUserAction(formData, "reject");
}

export async function suspendUser(formData: FormData) {
  await applyUserAction(formData, "suspend");
}

export async function changeUserRole(formData: FormData) {
  await applyUserAction(formData, "change_role");
}

export async function updateCustomerContact(formData: FormData) {
  const { supabase } = await requireStaffProfile("customers");
  const userId = String(formData.get("userId") || "").trim();
  if (!userId) throw new Error("Missing customer id.");

  const { error } = await supabase.rpc("staff_update_customer_contact", {
    customer_id: userId,
    customer_full_name: String(formData.get("fullName") || ""),
    customer_company_name: String(formData.get("companyName") || ""),
    customer_phone: String(formData.get("phone") || ""),
  });
  if (error) throw new Error(error.message || "Failed to update customer contact.");
  revalidatePath("/admin/users");
}

export async function createRequestForClientAction(input: {
  customerId?: string;
  newClient?: ManagerNewClientInput;
  department: string;
  title?: string;
  lines: ManagerRequestLineInput[];
  notes?: string;
}): Promise<CreateClientRequestResult> {
  const { user, profile } = await requireStaffProfile("customers");
  const admin = createAdminClient();
  let customerId = input.customerId?.trim() || "";

  if (input.newClient) {
    const fullName = input.newClient.fullName.trim().replace(/\s+/g, " ").slice(0, 160);
    const email = input.newClient.email.trim().toLowerCase().slice(0, 320);
    const phone = input.newClient.phone?.trim().slice(0, 40) || null;
    const companyName = input.newClient.companyName?.trim().slice(0, 180) || null;
    if (fullName.length < 2) return { ok: false, error: "Enter the new client's name." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid client email address." };

    const { data: existingClient, error: existingClientError } = await admin
      .from("profiles")
      .select("id,role,is_active")
      .ilike("email", email)
      .limit(1)
      .maybeSingle<{ id: string; role: string; is_active: boolean }>();
    if (existingClientError) return { ok: false, error: "Could not check the client directory." };
    if (existingClient) {
      if (existingClient.role !== "client") return { ok: false, error: "That email belongs to a staff account." };
      if (!existingClient.is_active) return { ok: false, error: "That client account is inactive." };
      customerId = existingClient.id;
    } else {
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone, company_name: companyName },
      });
      if (authError || !authData.user) return { ok: false, error: "Could not create the new client account." };
      customerId = authData.user.id;
      const { error: profileError } = await admin.from("profiles").upsert({
        id: customerId,
        email,
        full_name: fullName,
        phone,
        company_name: companyName,
        role: "client",
        approval_status: "approved",
        is_active: true,
      }, { onConflict: "id" });
      if (profileError) {
        await admin.auth.admin.deleteUser(customerId);
        return { ok: false, error: "Could not save the new client profile." };
      }
    }
  }

  if (!validUuid(customerId)) return { ok: false, error: "Choose a client or add a new one." };

  const department = input.department.trim().slice(0, 100);
  const storedDepartment = department || "Unassigned";

  const lines = input.lines
    .map((line) => ({
      name: line.name.trim().slice(0, 300),
      quantity: Number(line.quantity),
      unit: line.unit.trim().slice(0, 40) || "each",
    }))
    .filter((line) => line.name);
  if (!lines.length) return { ok: false, error: "Add at least one material item." };
  if (lines.length > 50) return { ok: false, error: "Keep each request to 50 material lines or fewer." };
  if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > 1_000_000)) {
    return { ok: false, error: "Every item needs a valid quantity greater than zero." };
  }

  const notes = input.notes?.trim().slice(0, 4000) || "";
  const { data: customer, error: customerError } = await admin
    .from("profiles")
    .select("id,role,is_active")
    .eq("id", customerId)
    .maybeSingle<{ id: string; role: string; is_active: boolean }>();
  if (customerError || !customer || customer.role !== "client") return { ok: false, error: "This customer account is not available." };
  if (!customer.is_active) return { ok: false, error: "This customer account is inactive." };

  const { data: existingProject, error: projectLookupError } = await admin
    .from("projects")
    .select("id")
    .eq("owner_id", customerId)
    .eq("name", "Material Requests")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (projectLookupError) return { ok: false, error: "Could not prepare the customer request workspace." };

  let projectId = existingProject?.id || "";
  if (!projectId) {
    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({ owner_id: customerId, name: "Material Requests", status: "active" })
      .select("id")
      .single<{ id: string }>();
    if (projectError || !project) return { ok: false, error: "Could not prepare the customer request workspace." };
    projectId = project.id;
  }

  const requestTitle = input.title?.trim().slice(0, 180) || (department ? `${department} request` : "Material request");
  const now = new Date().toISOString();
  const { data: request, error: requestError } = await admin
    .from("quote_requests")
    .insert({ project_id: projectId, owner_id: customerId, title: requestTitle, status: "submitted", submitted_at: now })
    .select("id")
    .single<{ id: string }>();
  if (requestError || !request) return { ok: false, error: "Could not create the client request." };

  const { error: itemError } = await admin.from("quote_request_items").insert(lines.map((line, index) => ({
    request_id: request.id,
    project_id: projectId,
    owner_id: customerId,
    catalog_item_id: null,
    name: line.name,
    department: storedDepartment,
    item_type: "custom_priced",
    quantity: line.quantity,
    unit: line.unit,
    unit_price: 0,
    qualification_status: "not_required",
    metadata: {
      created_by_manager: true,
      created_by: user.id,
      ...(index === 0 && notes ? { request_details: notes } : {}),
    },
  })));
  if (itemError) {
    await admin.from("quote_requests").delete().eq("id", request.id);
    return { ok: false, error: "Could not save the material breakdown. No request was created." };
  }

  await admin.from("project_events").insert({
    project_id: projectId,
    owner_id: customerId,
    event_type: "material_added",
    source: "admin",
    title: `${requestTitle} created by manager`,
    description: `Created on behalf of the client by ${profile?.full_name || user.email || "a staff member"}.`,
    metadata: { quote_request_id: request.id, created_by_manager: user.id },
  });

  revalidatePath("/admin/users");
  revalidatePath("/owner/materials/requests");
  revalidatePath(`/owner/materials/requests/${request.id}`);
  return { ok: true, requestId: request.id, customerId };
}

export async function deleteOpenRequestAction(requestId: string): Promise<DeleteManagerRecordResult> {
  const { supabase } = await requireStaffProfile("customers");
  const normalizedId = requestId.trim();
  if (!validUuid(normalizedId)) return { ok: false, error: "This request could not be identified." };

  const { error } = await supabase.rpc("staff_delete_customer_quote_request", { p_request_id: normalizedId });
  if (error) return { ok: false, error: deletionError(error.message, "request") };

  let warning: string | undefined;
  try {
    await cleanupQueuedFiles("request", normalizedId);
  } catch {
    warning = "The request was deleted. Its uploaded files are queued for cleanup.";
  }

  revalidatePath("/admin/users");
  revalidatePath("/projects");
  return { ok: true, warning };
}

export async function deleteProjectAction(projectId: string): Promise<DeleteManagerRecordResult> {
  const { supabase } = await requireStaffProfile("customers");
  const normalizedId = projectId.trim();
  if (!validUuid(normalizedId)) return { ok: false, error: "This project could not be identified." };

  const { error } = await supabase.rpc("staff_delete_customer_project", { p_project_id: normalizedId });
  if (error) return { ok: false, error: deletionError(error.message, "project") };

  let warning: string | undefined;
  try {
    await cleanupQueuedFiles("project", normalizedId);
  } catch {
    warning = "The project was deleted. Its uploaded files are queued for cleanup.";
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  return { ok: true, warning };
}

export async function deleteCustomerAction(customerId: string): Promise<DeleteManagerRecordResult> {
  const { supabase } = await requireAdminProfile();
  const normalizedId = customerId.trim();
  if (!validUuid(normalizedId)) return { ok: false, error: "This customer could not be identified." };

  const { error: prepareError } = await supabase.rpc("staff_prepare_customer_deletion", { p_customer_id: normalizedId });
  if (prepareError) return { ok: false, error: deletionError(prepareError.message, "customer") };

  let cleanupFailed = false;
  try {
    await cleanupQueuedFiles("customer", normalizedId);
  } catch (error) {
    cleanupFailed = true;
    console.error("Customer file cleanup failed before account deletion.", error);
  }

  const { error: deleteError } = await supabase.rpc("staff_delete_customer_account", { p_customer_id: normalizedId });
  if (deleteError) return { ok: false, error: deletionError(deleteError.message, "customer") };

  const admin = createAdminClient();
  let warning: string | undefined;
  if (cleanupFailed) {
    const { error: staleQueueError } = await admin
      .from("manager_file_deletion_queue")
      .delete()
      .eq("target_type", "customer")
      .eq("target_id", normalizedId);
    if (staleQueueError) {
      console.error("Customer was deleted, but stale file cleanup records remain.", staleQueueError);
      warning = "The customer was deleted, but stale file-cleanup records remain for an administrator to review.";
    }
  }

  const { data: remaining, error: verifyError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", normalizedId)
    .maybeSingle<{ id: string }>();
  if (verifyError || remaining) return { ok: false, error: "The customer deletion could not be verified. Refresh before trying again." };

  revalidatePath("/admin/users");
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  return warning ? { ok: true, warning } : { ok: true };
}
