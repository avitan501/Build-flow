"use server"

import { revalidatePath } from "next/cache"

import { requireStaffProfile } from "@/lib/auth"
import { buildQuickLeadNotes, normalizeOutreachLeadEmail, normalizeOutreachLeadPhone } from "@/lib/outreach-lead-normalization"

export type QuickLeadInput = {
  fullName: string
  companyName: string
  phone: string
  email: string
  source: string
  status: string
  followUpDate: string
  note: string
  rawText: string
}

export type QuickLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; error: string; duplicateId?: string }

const STATUSES = new Set(["new", "contacted", "qualified", "not_interested"])

function clean(value: string, maximum: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maximum)
}

export async function quickAddOutreachLeadAction(input: QuickLeadInput): Promise<QuickLeadResult> {
  const { supabase, user } = await requireStaffProfile("customers")
  const fullName = clean(input.fullName, 160)
  const companyName = clean(input.companyName, 180)
  const phone = clean(input.phone, 40)
  const email = normalizeOutreachLeadEmail(String(input.email || "")).slice(0, 320)
  const normalizedPhone = normalizeOutreachLeadPhone(phone)
  const source = clean(input.source, 80)
  const status = STATUSES.has(input.status) ? input.status : "new"
  const followUpDate = /^\d{4}-\d{2}-\d{2}$/.test(input.followUpDate) ? input.followUpDate : ""
  const note = clean(input.note, 500)
  const rawText = String(input.rawText || "").trim().slice(0, 700)

  if (fullName.length < 2) return { ok: false, error: "Enter the lead’s name." }
  if (!email && !phone) return { ok: false, error: "Enter an email or phone number." }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." }
  if (phone && (!/^[+()\d\s.-]+$/.test(phone) || normalizedPhone.length < 7)) return { ok: false, error: "Enter a valid phone number." }

  const { data: existing, error: lookupError } = await supabase
    .from("manager_outreach_leads")
    .select("id,full_name,email,phone")
    .limit(5000)
    .returns<Array<{ id: string; full_name: string; email: string | null; phone: string | null }>>()
  if (lookupError) return { ok: false, error: "Existing leads could not be checked. Nothing was saved." }

  const duplicate = (existing ?? []).find((lead) =>
    Boolean(email && lead.email && normalizeOutreachLeadEmail(lead.email) === email)
    || Boolean(normalizedPhone && lead.phone && normalizeOutreachLeadPhone(lead.phone) === normalizedPhone)
  )
  if (duplicate) return { ok: false, duplicateId: duplicate.id, error: `${duplicate.full_name} already has this phone number or email.` }

  const notes = buildQuickLeadNotes({ source, followUpDate, note, rawText })
  const { data, error } = await supabase.from("manager_outreach_leads").insert({
    full_name: fullName,
    company_name: companyName || null,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
    status,
    relationship_level: 1,
    preferred_language: "en",
    created_by: user.id,
  }).select("id").single<{ id: string }>()
  if (error || !data) return { ok: false, error: "The lead could not be saved. Nothing was added." }

  revalidatePath("/admin/ai-tools/quick-add-lead")
  revalidatePath("/admin/users")
  revalidatePath("/admin/goals-progress")
  return { ok: true, leadId: data.id }
}
