"use server"

import { revalidatePath } from "next/cache"
import { requireSignedInProfile } from "@/lib/auth"
import { normalizePhoneNumber } from "@/lib/auth-phone"

export type ContactSnapshot = { email: string | null; phone: string | null; revision: number }
export type ContactSaveResult = { ok: true; snapshot: ContactSnapshot } | { ok: false; error: string; conflict?: ContactSnapshot }

export async function saveAccountContacts(input: { actorId: string; email: string; phone: string; expectedRevision: number }): Promise<ContactSaveResult> {
  try {
    const { user, supabase } = await requireSignedInProfile()
    if (!input || input.actorId !== user.id) return { ok: false, error: "Your session changed. Reload before editing contacts." }
    if (typeof input.email !== "string" || typeof input.phone !== "string" || input.email.length > 254 || input.phone.length > 40 || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false, error: "Check your contact details and reload if necessary." }
    const email = input.email.trim().toLowerCase(), rawPhone = input.phone.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid alternate email, or leave it empty." }
    if (rawPhone && (!/^\+?[\d\s().-]+$/.test(rawPhone) || rawPhone.replace(/\D/g, "").length < 7 || rawPhone.replace(/\D/g, "").length > 15)) return { ok: false, error: "Enter a valid alternate phone, or leave it empty." }
    const { data, error } = await supabase.rpc("save_account_contacts", { p_email: email || null, p_phone: rawPhone ? normalizePhoneNumber(rawPhone) : null, p_expected_revision: input.expectedRevision })
    if (error || !data) return { ok: false, error: "Contacts were not saved. Retry when your connection is available." }
    if (!data.ok) return { ok: false, error: "Your contacts changed elsewhere. Review the saved values.", conflict: data.conflict }
    revalidatePath("/account")
    return { ok: true, snapshot: { email: data.email, phone: data.phone, revision: Number(data.revision) } }
  } catch { return { ok: false, error: "Contacts were not saved. Check your session and retry." } }
}
