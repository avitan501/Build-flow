"use server"

import { revalidatePath } from "next/cache"
import { getSessionWithProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export type AccountNameResult = { ok: true; name: string } | { ok: false; error: string; conflict?: { name: string | null } }

export async function saveAccountName(input: { actorId: string; name: string; expectedName: string | null }): Promise<AccountNameResult> {
  try {
    const { user, profile } = await getSessionWithProfile()
    if (!user || !profile || !input || input.actorId !== user.id) return { ok: false, error: "Your session changed. Reload before editing your name." }
    if (typeof input.name !== "string" || input.name.trim().length < 2 || input.name.trim().length > 200 || (input.expectedName !== null && typeof input.expectedName !== "string")) return { ok: false, error: "Enter a name with 2–200 characters." }
    const name = input.name.trim()
    const admin = createAdminClient()
    // Atomic compare-and-set, scoped only to the authenticated account. Do not
    // use a profile ID from the browser as the write target.
    let update = admin.from("profiles").update({ full_name: name }).eq("id", user.id)
    update = input.expectedName === null ? update.is("full_name", null) : update.eq("full_name", input.expectedName)
    const { data, error } = await update.select("full_name").maybeSingle()
    if (error) return { ok: false, error: "Name was not saved. Try again." }
    if (!data) {
      const latest = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
      if (latest.error || !latest.data) return { ok: false, error: "Name could not be checked. Try again." }
      // Recover a lost acknowledgement without overwriting a different value.
      if (latest.data.full_name !== name) return { ok: false, error: "Your name changed in another window. Review the saved name.", conflict: { name: latest.data.full_name } }
    }
    revalidatePath("/account")
    return { ok: true, name }
  } catch {
    return { ok: false, error: "Name was not saved. Check your connection and try again." }
  }
}
