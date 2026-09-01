"use server";

import { revalidatePath } from "next/cache";

import { requireStaffProfile } from "@/lib/auth";

type LeadResult = { ok: true } | { ok: false; error: string };

const LEAD_STATUSES = ["new", "contacted", "qualified", "not_interested"] as const;
const CLIENT_LANGUAGES = ["en", "es"] as const;

function refreshOutreach() {
  revalidatePath("/admin/goals-progress");
}

export async function createOutreachLeadAction(input: {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  notes: string;
  relationshipLevel: number;
  preferredLanguage: string;
}): Promise<LeadResult> {
  const { supabase, user } = await requireStaffProfile("customers");
  const fullName = input.fullName.trim().replace(/\s+/g, " ").slice(0, 160);
  const companyName = input.companyName.trim().replace(/\s+/g, " ").slice(0, 180);
  const email = input.email.trim().toLowerCase().slice(0, 320);
  const phone = input.phone.trim().slice(0, 40);
  const notes = input.notes.trim().slice(0, 1000);
  const relationshipLevel = Number.isInteger(input.relationshipLevel) && input.relationshipLevel >= 1 && input.relationshipLevel <= 5 ? input.relationshipLevel : 1;
  const preferredLanguage = CLIENT_LANGUAGES.find((language) => language === input.preferredLanguage) ?? "en";

  if (fullName.length < 2) return { ok: false, error: "Enter the lead's name." };
  if (!email && !phone) return { ok: false, error: "Enter an email or phone number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (phone && (!/^[+()\d\s.-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const { error } = await supabase.from("manager_outreach_leads").insert({
    full_name: fullName,
    company_name: companyName || null,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
    relationship_level: relationshipLevel,
    preferred_language: preferredLanguage,
    created_by: user.id,
  });
  if (error) {
    console.error("[goals-progress] lead insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, error: "The lead could not be added. Please try again." };
  }

  refreshOutreach();
  return { ok: true };
}

export async function updateOutreachLeadAction(input: {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  notes: string;
  relationshipLevel: number;
  preferredLanguage: string;
}): Promise<LeadResult> {
  const { supabase } = await requireStaffProfile("customers");
  const fullName = input.fullName.trim().replace(/\s+/g, " ").slice(0, 160);
  const companyName = input.companyName.trim().replace(/\s+/g, " ").slice(0, 180);
  const email = input.email.trim().toLowerCase().slice(0, 320);
  const phone = input.phone.trim().slice(0, 40);
  const notes = input.notes.trim().slice(0, 1000);
  const relationshipLevel = Number.isInteger(input.relationshipLevel) && input.relationshipLevel >= 1 && input.relationshipLevel <= 5 ? input.relationshipLevel : 1;
  const preferredLanguage = CLIENT_LANGUAGES.find((language) => language === input.preferredLanguage) ?? "en";

  if (fullName.length < 2) return { ok: false, error: "Enter the lead's name." };
  if (!email && !phone) return { ok: false, error: "Enter an email or phone number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (phone && (!/^[+()\d\s.-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) return { ok: false, error: "Enter a valid phone number." };

  const { data, error } = await supabase.from("manager_outreach_leads").update({
    full_name: fullName,
    company_name: companyName || null,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
    relationship_level: relationshipLevel,
    preferred_language: preferredLanguage,
  }).eq("id", input.id).select("id").maybeSingle<{ id: string }>();
  if (error || !data) return { ok: false, error: "The lead could not be updated. Please try again." };

  refreshOutreach();
  return { ok: true };
}

export async function updateClientLanguageAction(input: { id: string; target: "lead" | "client"; language: string }): Promise<LeadResult> {
  const { supabase } = await requireStaffProfile("customers");
  const language = CLIENT_LANGUAGES.find((value) => value === input.language);
  if (!language) return { ok: false, error: "Choose English or Spanish." };

  const result = input.target === "client"
    ? await supabase.from("profiles").update({ preferred_language: language }).eq("id", input.id).eq("role", "client")
    : await supabase.from("manager_outreach_leads").update({ preferred_language: language }).eq("id", input.id);
  if (result.error) return { ok: false, error: "The client language could not be updated." };

  refreshOutreach();
  return { ok: true };
}

export async function updateOutreachLeadStatusAction(input: { id: string; status: string }): Promise<LeadResult> {
  const { supabase } = await requireStaffProfile("customers");
  const status = LEAD_STATUSES.find((value) => value === input.status);
  if (!status) return { ok: false, error: "Choose a valid lead status." };

  const { error } = await supabase.from("manager_outreach_leads").update({ status }).eq("id", input.id);
  if (error) return { ok: false, error: "The lead status could not be updated." };

  refreshOutreach();
  return { ok: true };
}

export async function updateOutreachLeadRelationshipAction(input: { id: string; relationshipLevel: number }): Promise<LeadResult> {
  const { supabase } = await requireStaffProfile("customers");
  const relationshipLevel = Number(input.relationshipLevel);
  if (!Number.isInteger(relationshipLevel) || relationshipLevel < 1 || relationshipLevel > 5) {
    return { ok: false, error: "Choose a valid lead group." };
  }
  const { error } = await supabase
    .from("manager_outreach_leads")
    .update({ relationship_level: relationshipLevel })
    .eq("id", input.id);
  if (error) return { ok: false, error: "The lead group could not be updated." };

  refreshOutreach();
  return { ok: true };
}

export async function deleteOutreachLeadAction(id: string): Promise<LeadResult> {
  const { supabase } = await requireStaffProfile("customers");
  const { error } = await supabase.from("manager_outreach_leads").delete().eq("id", id);
  if (error) return { ok: false, error: "The lead could not be removed." };

  refreshOutreach();
  return { ok: true };
}
