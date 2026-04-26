"use server";

import { revalidatePath } from "next/cache";

import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminAction = "approve" | "reject" | "suspend" | "change_role";
type RoleValue = "admin" | "staff" | "client";

async function applyUserAction(formData: FormData, action: AdminAction) {
  const { profile } = await requireAdminProfile();
  const adminProfile = profile;
  const admin = createAdminClient();

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

  const { data: targetUser, error: targetError } = await admin
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

  const { error: updateError } = await admin.from("profiles").update(patch).eq("id", userId);

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

  const { error: auditError } = await admin.from("approval_actions").insert({
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
