import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { isApprovedManagerIdentity, managerCapabilities, type StaffCapability } from "@/lib/owner-identity";

export type ProfileRecord = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  role: "admin" | "staff" | "client";
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  is_active: boolean;
  created_at?: string;
};

export async function getSessionWithProfile() {
  if (!hasSupabasePublicEnv()) {
    await cookies();
    return { supabase: null, user: null, profile: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, company_name, phone, role, approval_status, is_active, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (error) {
    throw new Error("Failed to load current profile.");
  }

  return { supabase, user, profile: profile ?? null };
}

export async function requireSignedInProfile() {
  const session = await getSessionWithProfile();

  if (!session.user || !session.supabase) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminProfile() {
  const session = await requireSignedInProfile();
  const email = session.user.email || session.profile?.email || null;

  if (!isApprovedManagerIdentity({
    email,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  })) {
    redirect("/");
  }

  return session;
}

export async function requireStaffProfile(capability: StaffCapability) {
  const session = await requireSignedInProfile();
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email || null,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  });

  if (!access[capability]) redirect("/");
  return session;
}

export async function requireManagerPortalProfile() {
  const session = await requireSignedInProfile();
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email || null,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  });

  if (!access.owner && !access.customers && !access.suppliers) redirect("/");
  return { ...session, access };
}
