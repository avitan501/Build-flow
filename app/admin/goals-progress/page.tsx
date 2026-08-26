import {
  ArrowRight,
  CircleDollarSign,
  PhoneCall,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AddTargetClient } from "@/components/buildflow/add-target-client";
import { AffiliateProgramTracker } from "@/components/buildflow/affiliate-program-tracker";
import { AffiliateCallList } from "@/components/buildflow/affiliate-call-list";
import { ClientTargetCallGuide } from "@/components/buildflow/client-target-call-guide";
import { AddOutreachLead, ClientLanguageSelect, OutreachLeadList, type OutreachLeadRecord } from "@/components/buildflow/client-target-outreach";
import { AddManagerGoal, CustomManagerGoals, type ManagerGoalRecord } from "@/components/buildflow/manager-goals";
import { DAILY_WORK_SUMMARY_PREFIX } from "@/lib/daily-work-summary";
import { SUPPLIER_PARTNER_NOTES_PREFIX } from "@/lib/supplier-partners/store";
import type {
  AffiliateActivity,
  AffiliateAttachment,
  AffiliateChecklistItem,
  AffiliateIntegration,
  AffiliateProgram,
  AffiliateTrackerSettings,
} from "@/lib/affiliate-tracker";
import { requireAdminProfile, requireManagerPortalProfile } from "@/lib/auth";

type ClientTarget = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_language: "en" | "es";
};

function clientName(client: ClientTarget) {
  return client.full_name?.trim() || client.company_name?.trim() || client.email || "Unnamed client";
}

function GoalNumber({ children }: { children: number | string }) {
  return <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">{children}</span>;
}

function GoalDisclosure({ id, number, eyebrow, title, description, children }: { id?: string; number: number; eyebrow: string; title: string; description?: string; children: ReactNode }) {
  return <details id={id} className="group scroll-mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
      <GoalNumber>{number}</GoalNumber>
      <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase text-[#0066cc]">{eyebrow}</p><h3 className="mt-0.5 text-base font-semibold sm:text-lg">{title}</h3>{description ? <p className="mt-1 line-clamp-1 text-xs text-slate-500 sm:text-sm">{description}</p> : null}</div>
      <span className="shrink-0 text-xs font-semibold text-[#0066cc] group-open:hidden">Open</span><span className="hidden shrink-0 text-xs font-semibold text-slate-500 group-open:inline">Close</span>
    </summary>
    <div className="border-t border-slate-200 p-4 sm:p-5">{children}</div>
  </details>;
}

function PersonHeader({ assignee, description }: { assignee: "david" | "carlos"; description: string }) {
  const name = assignee === "david" ? "David" : "Carlos";
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3">
    <div className="flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white"><UserRound className="h-5 w-5" /></span><div><h2 id={`${assignee}-goals-title`} className="text-2xl font-semibold">{name}</h2><p className="text-sm text-slate-600">{description}</p></div></div>
    <AddManagerGoal assignee={assignee} />
  </header>;
}

async function OwnerAffiliateGoal() {
  const { supabase } = await requireAdminProfile();
  const [programResult, checklistResult, activityResult, attachmentResult, integrationResult, settingsResult] = await Promise.all([
    supabase.from("affiliate_programs").select("*").order("priority").order("supplier_name").returns<AffiliateProgram[]>(),
    supabase.from("affiliate_program_checklist").select("*").order("sort_order").returns<AffiliateChecklistItem[]>(),
    supabase.from("affiliate_program_activities").select("*").order("activity_date", { ascending: false }).limit(500).returns<AffiliateActivity[]>(),
    supabase.from("affiliate_program_attachments").select("*").order("created_at", { ascending: false }).returns<AffiliateAttachment[]>(),
    supabase.from("affiliate_integrations").select("*").order("created_at").returns<AffiliateIntegration[]>(),
    supabase.from("affiliate_tracker_settings").select("*").eq("id", "global").maybeSingle<AffiliateTrackerSettings>(),
  ]);
  if (programResult.error || checklistResult.error || activityResult.error || attachmentResult.error || integrationResult.error || settingsResult.error || !settingsResult.data) throw new Error("The affiliate tracker could not load.");
  const signedAttachments = await Promise.all((attachmentResult.data ?? []).map(async (attachment) => ({
    ...attachment,
    signed_url: (await supabase.storage.from("affiliate-confirmations").createSignedUrl(attachment.file_path, 1800)).data?.signedUrl ?? null,
  })));
  return <GoalDisclosure id="supplier-affiliate-program" number={3} eyebrow="Supplier program" title="Supplier Affiliate Program" description="50 construction-focused targets · Direct call routes first."><div className="grid gap-4"><AffiliateCallList programs={programResult.data ?? []} /><AffiliateProgramTracker programs={programResult.data ?? []} checklist={checklistResult.data ?? []} activities={activityResult.data ?? []} attachments={signedAttachments} integrations={integrationResult.data ?? []} settings={settingsResult.data} hideHeading /></div></GoalDisclosure>;
}

function AbcSupplyDemoGoal() {
  return <GoalDisclosure id="abc-supply-demo" number={5} eyebrow="Supplier pricing" title="ABC Supply Demo" description="Live product search and account pricing.">
    <Link href="/admin/abc" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white">Open ABC Supply Demo<ArrowRight className="h-4 w-4" /></Link>
  </GoalDisclosure>;
}

function ClientTargetGoal({ clients, leads, canManageClients }: { clients: ClientTarget[]; leads: OutreachLeadRecord[]; canManageClients: boolean }) {
  return <GoalDisclosure id="client-target" number={1} eyebrow="Outreach" title="Client Target" description="Leads to contact and active clients in one place.">
    <div className="flex flex-wrap gap-2">{canManageClients ? <><AddOutreachLead /><AddTargetClient /></> : null}<ClientTargetCallGuide /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <OutreachLeadList leads={leads} />
      <details className="overflow-hidden rounded-md border border-slate-200 bg-white"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600"><span>Clients in the system</span><span className="text-slate-500">{clients.length} clients · Open</span></summary><div className="flex justify-end border-t border-slate-100 px-3 py-2"><Link href="/admin/users" className="text-xs font-semibold text-[#0066cc]">Full directory</Link></div>{clients.length ? clients.map((client) => <div key={client.id} className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-100 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{clientName(client)}</p><p className="truncate text-xs text-slate-500">{client.company_name || client.email || client.phone || "Contact details needed"}</p></div><ClientLanguageSelect id={client.id} name={clientName(client)} language={client.preferred_language} />{client.phone ? <a href={`tel:${client.phone}`} aria-label={`Call ${clientName(client)}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600"><PhoneCall className="h-4 w-4" /></a> : null}</div>) : <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No clients added yet.</p>}</details>
    </div>
  </GoalDisclosure>;
}

function SupplierPricingGoal() {
  return <GoalDisclosure id="call-suppliers" number={2} eyebrow="Purchasing" title="Call Supplier" description="Find what each supplier sells cheaper than anyone else.">
    <div className="grid gap-3 text-sm text-slate-600"><p className="flex gap-2"><CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Ask each supplier for their strongest-priced items, delivery minimum, lead time, and quote expiration.</p><p className="flex gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />Enter the prices in the catalog and keep the best suppliers per department.</p></div>
    <div className="mt-4 flex flex-wrap gap-2"><Link href="/owner/partnerships" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">Show supplier partnerships<ArrowRight className="h-4 w-4" /></Link><Link href="/admin/vendors" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Supplier Directory<ArrowRight className="h-4 w-4" /></Link><Link href="/admin/catalog" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Enter catalog prices</Link><Link href="/owner/delivery-requests" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Delivery requests</Link></div>
  </GoalDisclosure>;
}

function SupplierPartnershipGoal() {
  return <GoalDisclosure id="supplier-partnerships" number={4} eyebrow="Supplier relationships" title="Supplier Partnership" description="Show contacts, outreach drafts, follow-ups, and partnership progress.">
    <p className="text-sm leading-6 text-slate-600">Open Carlos&apos;s supplier workspace to contact researched companies and track every next step.</p>
    <Link href="/owner/partnerships" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">Open Supplier Partnerships<ArrowRight className="h-4 w-4" /></Link>
  </GoalDisclosure>;
}

export default async function GoalsProgressPage() {
  const { supabase, access } = await requireManagerPortalProfile();
  const goalsQuery = supabase.from("manager_goals").select("id,assignee,title,details,status").eq("assignee", "carlos").order("status").order("created_at", { ascending: false });
  const [clientResult, goalResult, leadResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,company_name,email,phone,preferred_language").eq("role", "client").eq("is_active", true).order("created_at", { ascending: false }).limit(5).returns<ClientTarget[]>(),
    goalsQuery.returns<ManagerGoalRecord[]>(),
    supabase.from("manager_outreach_leads").select("id,full_name,company_name,email,phone,notes,status,relationship_level,preferred_language").order("status").order("created_at", { ascending: false }).returns<OutreachLeadRecord[]>(),
  ]);
  const clients = clientResult.error ? [] : clientResult.data ?? [];
  const goals = goalResult.error ? [] : goalResult.data ?? [];
  const leads = leadResult.error ? [] : leadResult.data ?? [];
  const regularGoals = goals.filter((goal) =>
    !goal.details?.startsWith(DAILY_WORK_SUMMARY_PREFIX) &&
    !goal.details?.startsWith(SUPPLIER_PARTNER_NOTES_PREFIX)
  ).filter((goal) => goal.assignee === "carlos");

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10"><div className="mx-auto max-w-6xl">
    <header className="border-b border-slate-200 pb-6"><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Manager Portal</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Carlos Goals</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Client outreach, supplier calls, partnerships, affiliate programs, and ABC pricing in one workspace.</p></header>

    <section aria-labelledby="carlos-goals-title" className="mt-7"><PersonHeader assignee="carlos" description="Clients, suppliers, and pricing outreach" /><CustomManagerGoals goals={regularGoals} /><div className="mt-4 grid gap-4"><ClientTargetGoal clients={clients} leads={leads} canManageClients={access.customers} /><SupplierPricingGoal />{access.owner ? <OwnerAffiliateGoal /> : <GoalDisclosure id="supplier-affiliate-program" number={3} eyebrow="Supplier program" title="Supplier Affiliate Program" description="50 construction-focused targets with direct call routes first."><AffiliateCallList /></GoalDisclosure>}<SupplierPartnershipGoal />{access.owner ? <AbcSupplyDemoGoal /> : null}</div></section>
  </div></main>;
}
