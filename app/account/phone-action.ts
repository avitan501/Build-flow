"use server"

import { revalidatePath } from "next/cache"
import { getSessionWithProfile } from "@/lib/auth"
import { normalizePhoneNumber } from "@/lib/auth-phone"
import { createAdminClient } from "@/lib/supabase/admin"

function validContactPhone(value: string) { return value.length <= 40 && /^\+?[\d\s().-]+$/.test(value.trim()) && value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15 }

export type AccountPhoneResult = { ok: true; phone: string } | { ok: false; error: string; conflict?: { phone: string | null } }

export async function saveAccountPhone(input: { actorId: string; phone: string; expectedPhone: string | null }): Promise<AccountPhoneResult> {
  try {
    const { user, profile } = await getSessionWithProfile()
    if (!user || !profile || !input || input.actorId !== user.id) return { ok: false, error: "Your session changed. Reload before editing your phone." }
    if (typeof input.phone !== "string" || !validContactPhone(input.phone) || (input.expectedPhone !== null && typeof input.expectedPhone !== "string")) return { ok: false, error: "Enter a valid phone number with 7–15 digits." }
    const phone = normalizePhoneNumber(input.phone)
    const admin = createAdminClient()
    // Atomic compare-and-set, scoped only to the authenticated account. Do not
    // use a profile ID from the browser as the write target.
    let update = admin.from("profiles").update({ phone }).eq("id", user.id)
    update = input.expectedPhone === null ? update.is("phone", null) : update.eq("phone", input.expectedPhone)
    const { data, error } = await update.select("phone").maybeSingle()
    if (error) return { ok: false, error: "Phone was not saved. Try again." }
    if (!data) {
      const latest = await admin.from("profiles").select("phone").eq("id", user.id).maybeSingle()
      if (latest.error || !latest.data) return { ok: false, error: "Phone could not be checked. Try again." }
      // Recover a lost acknowledgement without overwriting a different value.
      if (latest.data.phone !== phone) return { ok: false, error: "Your phone changed in another window. Review the saved phone.", conflict: { phone: latest.data.phone } }
    }
    revalidatePath("/account")
    return { ok: true, phone }
  } catch {
    return { ok: false, error: "Phone was not saved. Check your connection and try again." }
  }
}
