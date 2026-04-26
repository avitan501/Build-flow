import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

  if (!session.user) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminProfile() {
  const session = await requireSignedInProfile();

  if (!session.profile || session.profile.role !== "admin") {
    redirect("/dashboard");
  }

  return session;
}
