"use server";

import { revalidatePath } from "next/cache";

import { requireStaffProfile } from "@/lib/auth";
import { verifyDiscoveryCandidateToken } from "@/lib/discovery-fallback";
import { selectLeadDiscoveryCandidates, type LeadDepartment } from "@/lib/lead-discovery";
import { requireOwnerAccess } from "@/lib/owner-access";
import type { ShopQualificationSettings } from "@/lib/shop-qualification";

type LeadResult = { ok: true } | { ok: false; error: string };

const LEAD_STATUSES = ["new", "contacted", "qualified", "not_interested"] as const;
const CLIENT_LANGUAGES = ["en", "es"] as const;
const DISCOVERY_PROVIDERS = ["codex_openclaw", "exa_fallback"] as const;

function refreshOutreach() {
  revalidatePath("/admin/goals-progress");
  revalidatePath("/admin/users");
}

function sourceDomains(values: Array<string | null | undefined>) {
  return values.flatMap((value) => {
    if (!value) return [];
    try { return [new URL(value).hostname.toLowerCase().replace(/^www\./, "")]; } catch { return []; }
  });
}

export async function approveGeneratedLeadAction(input: {
  companyName: string;
  email: string | null;
  phone: string | null;
  sourceUrl: string;
  category: string;
  location: string;
  matchExplanation: string;
  department: LeadDepartment;
  zipCode: string;
  provider: string;
  approvalToken: string;
}): Promise<LeadResult> {
  const { supabase, user } = await requireOwnerAccess("/admin/users?view=leads");
  const provider = DISCOVERY_PROVIDERS.find((value) => value === input.provider);
  const department = Number(input.department);
  if (!provider || ![1, 2, 3].includes(department) || !/^\d{5}$/.test(input.zipCode)) return { ok: false, error: "This discovery result is not valid." };

  const signedIdentity = {
    userId: user.id,
    companyName: input.companyName,
    email: input.email,
    phone: input.phone,
    sourceUrl: input.sourceUrl,
    category: input.category,
    location: input.location,
    matchExplanation: input.matchExplanation,
    department,
    zipCode: input.zipCode,
    provider,
  };
  if (!verifyDiscoveryCandidateToken(input.approvalToken, signedIdentity)) return { ok: false, error: "This discovery result expired or was changed. Run Find Leads again." };

  const companyName = input.companyName.trim().replace(/\s+/g, " ").slice(0, 160);
  const email = input.email?.trim().toLowerCase().slice(0, 320) || null;
  const phone = input.phone?.trim().slice(0, 40) || null;
  if (!companyName || (!email && !phone)) return { ok: false, error: "A verified public email or phone is required before adding this lead." };

  const [leadsResult, customersResult, supplierResult] = await Promise.all([
    supabase.from("manager_outreach_leads").select("email,phone,notes").limit(5_000).returns<Array<{ email: string | null; phone: string | null; notes: string | null }>>(),
    supabase.from("profiles").select("email,phone").limit(5_000).returns<Array<{ email: string | null; phone: string | null }>>(),
    supabase.rpc("staff_load_supplier_directory_snapshot"),
  ]);
  if (leadsResult.error || customersResult.error || supplierResult.error) return { ok: false, error: "The lead could not be checked. Please try again." };
  const suppliers = ((supplierResult.data as { settings?: ShopQualificationSettings } | null)?.settings?.suppliers ?? []);
  const existingLeads = leadsResult.data ?? [];
  const existingCustomers = customersResult.data ?? [];
  const sourceUrls = existingLeads.map((lead) => lead.notes?.match(/Source:\s+(https:\/\/\S+)/i)?.[1]);
  const candidate = selectLeadDiscoveryCandidates({
    sources: [{ title: companyName, url: input.sourceUrl, text: [email, phone].filter(Boolean).join(" ") }],
    existingEmails: [...existingLeads.flatMap((lead) => lead.email ? [lead.email] : []), ...existingCustomers.flatMap((customer) => customer.email ? [customer.email] : []), ...suppliers.flatMap((supplier) => [supplier.email, ...(supplier.additionalContacts ?? []).map((contact) => contact.email)].filter(Boolean) as string[])],
    existingPhones: [...existingLeads.flatMap((lead) => lead.phone ? [lead.phone] : []), ...existingCustomers.flatMap((customer) => customer.phone ? [customer.phone] : []), ...suppliers.flatMap((supplier) => [supplier.phone, supplier.whatsapp, ...(supplier.additionalContacts ?? []).map((contact) => contact.phone)].filter(Boolean) as string[])],
    existingDomains: [...sourceDomains(sourceUrls), ...sourceDomains(suppliers.map((supplier) => supplier.portalUrl))],
    limit: 1,
  })[0];
  if (!candidate) return { ok: false, error: "This lead already exists or its public source could not be verified." };

  const note = [
    `Generated lead · ${input.category.slice(0, 100)} · ZIP ${input.zipCode}`,
    input.location ? `Location: ${input.location.slice(0, 160)}` : "",
    `Provider: ${provider}`,
    input.matchExplanation.slice(0, 360),
    `Source: ${candidate.sourceUrl}`,
  ].filter(Boolean).join(" · ").slice(0, 1_000);
  const { error } = await supabase.from("manager_outreach_leads").insert({
    full_name: candidate.companyName,
    company_name: candidate.companyName,
    email: candidate.email,
    phone: candidate.phone,
    notes: note,
    status: "new",
    relationship_level: department,
    preferred_language: "en",
    created_by: user.id,
  });
  if (error) return { ok: false, error: "The lead could not be added. Please try again." };
  refreshOutreach();
  return { ok: true };
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
  const relationshipLevel = Number.isInteger(input.relationshipLevel) && input.relationshipLevel >= 1 && input.relationshipLevel <= 5 ? input.relationshipLevel : 5;
  const preferredLanguage = CLIENT_LANGUAGES.find((language) => language === input.preferredLanguage) ?? "en";

  if (fullName.length < 2) return { ok: false, error: "Enter the lead's name." };
  if (!email && !phone) return { ok: false, error: "Enter an email or phone number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (phone && (!/^[+()\d\s.-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) {
    return { ok: false, error: "Enter a valid phone number." };
  }

  const { data: existingLeads, error: existingError } = await supabase
    .from("manager_outreach_leads")
    .select("full_name,email,phone")
    .limit(5000)
    .returns<Array<{ full_name: string; email: string | null; phone: string | null }>>();
  if (existingError) return { ok: false, error: "The lead could not be checked. Please try again." };
  const phoneDigits = phone.replace(/\D/g, "");
  const duplicate = (existingLeads ?? []).find((lead) =>
    Boolean((email && lead.email?.trim().toLowerCase() === email) || (phoneDigits && lead.phone?.replace(/\D/g, "") === phoneDigits)),
  );
  if (duplicate) return { ok: false, error: `${duplicate.full_name} already exists in the Lead Directory.` };

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
  const relationshipLevel = Number.isInteger(input.relationshipLevel) && input.relationshipLevel >= 1 && input.relationshipLevel <= 5 ? input.relationshipLevel : 5;
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
    return { ok: false, error: "Choose a valid lead department." };
  }
  const { error } = await supabase
    .from("manager_outreach_leads")
    .update({ relationship_level: relationshipLevel })
    .eq("id", input.id);
  if (error) return { ok: false, error: "The lead department could not be updated." };

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
