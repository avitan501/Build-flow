"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { normalizePhoneNumber } from "@/lib/auth-phone";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateAccountPhone(formData: FormData) {
  const { user } = await requireSignedInProfile();
  const rawPhone = String(formData.get("phone") || "");
  const phone = normalizePhoneNumber(rawPhone);

  if (!phone || phone.length < 8) {
    redirect("/account?error=phone");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ phone }).eq("id", user.id);

  if (error) {
    redirect("/account?error=profile");
  }

  revalidatePath("/account");
  redirect("/account?updated=phone");
}
