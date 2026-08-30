"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { normalizePhoneNumber, phoneLoginEmailForPhone } from "@/lib/auth-phone";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateAccountName(formData: FormData) {
  const { user } = await requireSignedInProfile();
  const fullName = String(formData.get("fullName") || "").trim();

  if (!fullName || fullName.length < 2) {
    redirect("/account?error=name");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ full_name: fullName }).eq("id", user.id);

  if (error) {
    redirect("/account?error=profile");
  }

  revalidatePath("/account");
  redirect("/account?updated=name");
}

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

export async function updateAlternateContacts(formData: FormData) {
  const { supabase } = await requireSignedInProfile();
  const alternateEmail = String(formData.get("alternateEmail") || "").trim().toLowerCase();
  const rawAlternatePhone = String(formData.get("alternatePhone") || "").trim();
  const alternatePhone = rawAlternatePhone ? normalizePhoneNumber(rawAlternatePhone) : "";

  if (alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail)) {
    redirect("/account?error=alternate-email");
  }

  if (rawAlternatePhone && (!alternatePhone || alternatePhone.length < 8)) {
    redirect("/account?error=alternate-phone");
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      alternate_email: alternateEmail || null,
      alternate_phone: alternatePhone || null,
    },
  });

  if (error) {
    redirect("/account?error=contacts");
  }

  revalidatePath("/account");
  redirect("/account?updated=contacts");
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
