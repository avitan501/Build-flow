"use server";

import { revalidatePath } from "next/cache";

import { requireStaffProfile } from "@/lib/auth";

type LeadResult = { ok: true } | { ok: false; error: string };

const LEAD_STATUSES = ["new", "contacted", "qualified", "not_interested"] as const;

function refreshOutreach() {
  revalidatePath("/admin/goals-progress");
}

export async function createOutreachLeadAction(input: {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  notes: string;
}): Promise<LeadResult> {
  const { supabase, user } = await requireStaffProfile("customers");
  const fullName = input.fullName.trim().replace(/\s+/g, " ").slice(0, 160);
  const companyName = input.companyName.trim().replace(/\s+/g, " ").slice(0, 180);
  const email = input.email.trim().toLowerCase().slice(0, 320);
  const phone = input.phone.trim().slice(0, 40);
  const notes = input.notes.trim().slice(0, 1000);

  if (fullName.length < 2) return { ok: false, error: "Enter the lead's name." };
  if (!email && !phone) return { ok: false, error: "Enter an email or phone number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };

  const { error } = await supabase.from("manager_outreach_leads").insert({
    full_name: fullName,
    company_name: companyName || null,
    email: email || null,
    phone: phone || null,
    notes: notes || null,
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

export async function updateOutreachLeadStatusAction(input: { id: string; status: string }): Promise<LeadResult> {
  const { supabase } = await requireStaffProfile("customers");
  const status = LEAD_STATUSES.find((value) => value === input.status);
  if (!status) return { ok: false, error: "Choose a valid lead status." };

  const { error } = await supabase.from("manager_outreach_leads").update({ status }).eq("id", input.id);
  if (error) return { ok: false, error: "The lead status could not be updated." };

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
