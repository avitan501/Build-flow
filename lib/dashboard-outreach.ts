import { normalizeAuraPhone } from "@/lib/aura/identity";
import { effectiveLeadDepartment } from "@/lib/lead-discovery";

export const LEAD_OUTREACH_TASK_KEY = "david-lead-outreach-20261014";

export type DashboardOutreachLead = {
  id: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  preferred_language: string;
  relationship_level: number;
};

export type DashboardOutreachResult =
  | { ok: true; leads: DashboardOutreachLead[]; excludedCount: number }
  | { ok: false; error: string };

export function isInternalOutreachLead(lead: DashboardOutreachLead) {
  return /\binternal test (?:lead|contact)\b/i.test(lead.notes || "");
}

export function outreachPhone(lead: Pick<DashboardOutreachLead, "phone">) {
  const number = normalizeAuraPhone(lead.phone);
  if (!number) return null;
  const label = /^\+1\d{10}$/.test(number)
    ? `(${number.slice(2, 5)}) ${number.slice(5, 8)}-${number.slice(8)}`
    : number;
  return { href: `tel:${number}`, label };
}

export function outreachContactHref(lead: DashboardOutreachLead) {
  const params = new URLSearchParams({
    view: "leads",
    department: String(effectiveLeadDepartment(lead)),
    q: lead.phone?.trim() || lead.email?.trim() || lead.full_name,
  });
  return `/admin/users?${params.toString()}`;
}

export function matchesOutreachSearch(lead: DashboardOutreachLead, query: string) {
  const search = query.trim().toLocaleLowerCase();
  if (!search) return true;
  const text = [lead.full_name, lead.company_name, lead.phone, lead.email].filter(Boolean).join(" ").toLocaleLowerCase();
  if (text.includes(search)) return true;
  const digits = search.replace(/\D/g, "");
  return digits.length >= 3 && !/[a-z]/i.test(search) && Boolean(lead.phone?.replace(/\D/g, "").includes(digits));
}
