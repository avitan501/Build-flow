"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { normalizePhoneNumber, phoneLoginEmailForPhone } from "@/lib/auth-phone";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateAlternateContacts() {
  await requireSignedInProfile();
  // Legacy forms have no displayed revision. Never bypass contact CAS.
  redirect("/account?error=contacts-reload");
}

export async function updateNotificationPreferences(formData: FormData) {
  const { supabase } = await requireSignedInProfile();
  const { error } = await supabase.auth.updateUser({
    data: {
      notification_email: formData.get("notificationEmail") === "on",
      notification_sms: formData.get("notificationSms") === "on",
    },
  });

  if (error) redirect("/account?error=notifications");
  revalidatePath("/account");
  redirect("/account?updated=notifications");
}

export async function setAccountPassword(formData: FormData) {
  const { supabase, user, profile } = await requireSignedInProfile()
  const password = String(formData.get("password") || "")
  const confirmation = String(formData.get("passwordConfirmation") || "")
  if (password.length < 8) redirect("/account?error=password")
  if (password !== confirmation) redirect("/account?error=password-match")
  if (user.email) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) redirect("/account?error=password-save")
  } else {
    const phone = normalizePhoneNumber(user.phone || profile?.phone || "")
    const loginEmail = phoneLoginEmailForPhone(phone)
    if (!phone || !loginEmail) redirect("/account?error=password-save")
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(user.id, { email: loginEmail, email_confirm: true, phone, phone_confirm: true, password })
    if (error) redirect("/account?error=password-save")
    await admin.from("profiles").update({ email: loginEmail, phone }).eq("id", user.id)
  }
  redirect("/account?updated=password")
}
