"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import { normalizePhoneNumber } from "@/lib/auth-phone";
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
