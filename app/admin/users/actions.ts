"use server";

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
export type CustomerContactUpdateState = {
  status: "idle" | "success" | "error";
  message: string;
};

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

export async function updateCustomerContact(
  _previousState: CustomerContactUpdateState,
  formData: FormData,
): Promise<CustomerContactUpdateState> {
  const { supabase } = await requireStaffProfile("customers");
  const userId = String(formData.get("userId") || "").trim();
  if (!validUuid(userId)) return { status: "error", message: "This customer could not be identified." };

  const fullName = String(formData.get("fullName") || "").trim().replace(/\s+/g, " ").slice(0, 160);
  const companyName = String(formData.get("companyName") || "").trim().replace(/\s+/g, " ").slice(0, 180);
  const phone = String(formData.get("phone") || "").trim().slice(0, 80);
  if (fullName.length < 2) return { status: "error", message: "Enter the customer's name." };

  const { error } = await supabase.rpc("staff_update_customer_contact", {
    customer_id: userId,
    customer_full_name: fullName,
    customer_company_name: companyName,
    customer_phone: phone,
  });
  if (error) return { status: "error", message: "The contact could not be saved. Please try again." };

  const { data: saved, error: verifyError } = await supabase
    .from("profiles")
    .select("full_name,company_name,phone,role")
    .eq("id", userId)
    .maybeSingle<{ full_name: string | null; company_name: string | null; phone: string | null; role: string }>();
  const expectedCompany = companyName || null;
  const expectedPhone = phone || null;
  if (verifyError || !saved || saved.role !== "client" || saved.full_name !== fullName || saved.company_name !== expectedCompany || saved.phone !== expectedPhone) {
    return { status: "error", message: "The contact was not changed. Refresh the page and try again." };
  }

  revalidatePath("/admin/users");
  return { status: "success", message: "Contact saved." };
}

export async function createRequestForClientAction(input: {
  customerId?: string;
  newClient?: ManagerNewClientInput;
  department: string;
  title?: string;
  lines: ManagerRequestLineInput[];
  notes?: string;
}): Promise<CreateClientRequestResult> {
  const { supabase } = await requireStaffProfile("customers");
  let customerId = input.customerId?.trim() || "";

  if (input.newClient) {
    const fullName = input.newClient.fullName.trim().replace(/\s+/g, " ").slice(0, 160);
    const email = input.newClient.email.trim().toLowerCase().slice(0, 320);
    const phone = input.newClient.phone?.trim().slice(0, 40) || null;
    const companyName = input.newClient.companyName?.trim().slice(0, 180) || null;
    if (fullName.length < 2) return { ok: false, error: "Enter the new client's name." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid client email address." };

    const { data: existingClient, error: existingClientError } = await supabase
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
      const { data: createdClient, error: createClientError } = await supabase.functions.invoke<{
        ok?: boolean;
        customerId?: string;
        error?: string;
      }>("create-manager-client", {
        body: { fullName, email, phone, companyName },
      });
      if (createClientError || !createdClient?.ok || !validUuid(createdClient.customerId || "")) {
        if (createdClient?.error === "email_in_use_by_staff") return { ok: false, error: "That email belongs to a staff account." };
        if (createdClient?.error === "client_inactive") return { ok: false, error: "That client account is inactive." };
        return { ok: false, error: "Could not create the new client. Please try again." };
      }
      customerId = createdClient.customerId || "";
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
  const requestTitle = input.title?.trim().slice(0, 180) || (department ? `${department} request` : "Material request");
  const { data: requestId, error: requestError } = await supabase.rpc("staff_create_client_request", {
    p_customer_id: customerId,
    p_department: storedDepartment,
    p_title: requestTitle,
    p_lines: lines,
    p_notes: notes,
  });
  if (requestError || !validUuid(String(requestId || ""))) {
    const message = requestError?.message || "";
    if (message.includes("client_inactive")) return { ok: false, error: "This customer account is inactive." };
    if (message.includes("client_not_available")) return { ok: false, error: "This customer account is not available." };
    if (message.includes("invalid_material")) return { ok: false, error: "Check every material name, quantity, and unit." };
    return { ok: false, error: "The request could not be saved. No order was submitted." };
  }

  revalidatePath("/admin/users");
  revalidatePath("/owner/materials/requests");
  revalidatePath(`/owner/materials/requests/${requestId}`);
  return { ok: true, requestId: String(requestId), customerId };
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

  const { data: preparation, error: prepareError } = await supabase.rpc("staff_prepare_customer_deletion", { p_customer_id: normalizedId });
  if (prepareError) return { ok: false, error: deletionError(prepareError.message, "customer") };

  const queuedFileCount = Number((preparation as { queued_file_count?: number } | null)?.queued_file_count ?? 0);
  let cleanupFailed = false;
  if (queuedFileCount > 0) {
    try {
      await cleanupQueuedFiles("customer", normalizedId);
    } catch (error) {
      cleanupFailed = true;
      console.error("Customer file cleanup failed before account deletion.", error);
    }
  }

  const { error: deleteError } = await supabase.rpc("staff_delete_customer_account", { p_customer_id: normalizedId });
  if (deleteError) return { ok: false, error: deletionError(deleteError.message, "customer") };

  let warning: string | undefined;
  if (cleanupFailed) {
    try {
      const admin = createAdminClient();
      const { error: staleQueueError } = await admin
        .from("manager_file_deletion_queue")
        .delete()
        .eq("target_type", "customer")
        .eq("target_id", normalizedId);
      if (staleQueueError) throw staleQueueError;
    } catch (error) {
      console.error("Customer was deleted, but stale file cleanup records remain.", error);
      warning = "The customer was deleted, but stale file-cleanup records remain for an administrator to review.";
    }
  }

  const { data: remaining, error: verifyError } = await supabase
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
