import {
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Megaphone,
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
import { WebsiteFixNotes } from "@/components/buildflow/website-fix-notes";
import { DAILY_WORK_SUMMARY_PREFIX } from "@/lib/daily-work-summary";
import type {
  AffiliateActivity,
  AffiliateAttachment,
  AffiliateChecklistItem,
  AffiliateIntegration,
  AffiliateProgram,
  AffiliateTrackerSettings,
} from "@/lib/affiliate-tracker";
import { requireAdminProfile, requireManagerPortalProfile } from "@/lib/auth";

const WEBSITE_FIX_NOTE_PREFIX = "website_fix_note:";

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

function GoalDisclosure({ number, eyebrow, title, description, children }: { number: number; eyebrow: string; title: string; description?: string; children: ReactNode }) {
  return <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
  return <GoalDisclosure number={3} eyebrow="Supplier program" title="Supplier Affiliate Program" description="50 construction-focused targets · Direct call routes first."><div className="grid gap-4"><AffiliateCallList programs={programResult.data ?? []} /><AffiliateProgramTracker programs={programResult.data ?? []} checklist={checklistResult.data ?? []} activities={activityResult.data ?? []} attachments={signedAttachments} integrations={integrationResult.data ?? []} settings={settingsResult.data} hideHeading /></div></GoalDisclosure>;
}

function FixWebsiteGoal({ notes }: { notes: ManagerGoalRecord[] }) {
  const openNotes = notes.filter((note) => note.status === "open").length;
  return <GoalDisclosure number={1} eyebrow="Website" title="Fix Website" description={`${openNotes} open notes · Add, change, or remove items before publishing.`}><WebsiteFixNotes notes={notes} /></GoalDisclosure>;
}

function BeatQuoteGoal({ owner }: { owner: boolean }) {
  return <GoalDisclosure number={2} eyebrow="Campaign" title="Launch campaign: Beat Your Quote" description="Send the flyer to contractors who already have a material quote.">
    <div className="flex gap-3 rounded-md bg-sky-50 p-4"><Megaphone className="h-5 w-5 shrink-0 text-[#0066cc]" /><p className="text-sm leading-6 text-slate-700">Send the flyer to contractors who already have a material quote and invite them to upload it for comparison.</p></div>
    <div className="mt-4 flex flex-wrap gap-2">{owner ? <Link href="/admin/goals-progress/beat-your-quote-flyer" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">Open campaign flyer<ArrowRight className="h-4 w-4" /></Link> : null}<Link href="/beat-a-quote" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Test customer page<ArrowUpRight className="h-4 w-4" /></Link></div>
  </GoalDisclosure>;
}

function ClientTargetGoal({ clients, leads, canManageClients }: { clients: ClientTarget[]; leads: OutreachLeadRecord[]; canManageClients: boolean }) {
  return <GoalDisclosure number={1} eyebrow="Outreach" title="Client Target" description="Leads to contact and active clients in one place.">
    <div className="flex flex-wrap gap-2">{canManageClients ? <><AddOutreachLead /><AddTargetClient /></> : null}<ClientTargetCallGuide /></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <OutreachLeadList leads={leads} />
      <details className="overflow-hidden rounded-md border border-slate-200 bg-white"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600"><span>Clients in the system</span><span className="text-slate-500">{clients.length} clients · Open</span></summary><div className="flex justify-end border-t border-slate-100 px-3 py-2"><Link href="/admin/users" className="text-xs font-semibold text-[#0066cc]">Full directory</Link></div>{clients.length ? clients.map((client) => <div key={client.id} className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-100 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{clientName(client)}</p><p className="truncate text-xs text-slate-500">{client.company_name || client.email || client.phone || "Contact details needed"}</p></div><ClientLanguageSelect id={client.id} name={clientName(client)} language={client.preferred_language} />{client.phone ? <a href={`tel:${client.phone}`} aria-label={`Call ${clientName(client)}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600"><PhoneCall className="h-4 w-4" /></a> : null}</div>) : <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No clients added yet.</p>}</details>
    </div>
  </GoalDisclosure>;
}

function SupplierPricingGoal() {
  return <GoalDisclosure number={2} eyebrow="Purchasing" title="Call suppliers and find what they sell cheaper than anyone else" description="Collect strongest-priced items, delivery minimums, and lead times.">
    <div className="grid gap-3 text-sm text-slate-600"><p className="flex gap-2"><CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Ask each supplier for their strongest-priced items, delivery minimum, lead time, and quote expiration.</p><p className="flex gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />Enter the prices in the catalog and keep the best suppliers per department.</p></div>
    <div className="mt-4 flex flex-wrap gap-2"><Link href="/admin/vendors" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Supplier Directory<ArrowRight className="h-4 w-4" /></Link><Link href="/admin/catalog" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Enter catalog prices</Link></div>
  </GoalDisclosure>;
}

export default async function GoalsProgressPage() {
  const { supabase, access } = await requireManagerPortalProfile();
  let goalsQuery = supabase.from("manager_goals").select("id,assignee,title,details,status").order("status").order("created_at", { ascending: false });
  if (!access.owner) goalsQuery = goalsQuery.eq("assignee", "carlos");
  const [clientResult, goalResult, leadResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,company_name,email,phone,preferred_language").eq("role", "client").eq("is_active", true).order("created_at", { ascending: false }).limit(5).returns<ClientTarget[]>(),
    goalsQuery.returns<ManagerGoalRecord[]>(),
    supabase.from("manager_outreach_leads").select("id,full_name,company_name,email,phone,notes,status,relationship_level,preferred_language").order("status").order("created_at", { ascending: false }).returns<OutreachLeadRecord[]>(),
  ]);
  const clients = clientResult.error ? [] : clientResult.data ?? [];
  const goals = goalResult.error ? [] : goalResult.data ?? [];
  const leads = leadResult.error ? [] : leadResult.data ?? [];
  const websiteNotes = goals.filter((goal) => goal.details?.startsWith(WEBSITE_FIX_NOTE_PREFIX));
  const regularGoals = goals.filter((goal) => !goal.details?.startsWith(WEBSITE_FIX_NOTE_PREFIX) && !goal.details?.startsWith(DAILY_WORK_SUMMARY_PREFIX));

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10"><div className="mx-auto max-w-6xl">
    <header className="border-b border-slate-200 pb-6"><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Manager Portal</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Goals &amp; Progress</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Company priorities organized by owner. Add new goals under the person responsible for completing them.</p></header>

    <div className="mt-7 grid gap-9">
      <section aria-labelledby="carlos-goals-title"><PersonHeader assignee="carlos" description="Clients, suppliers, and pricing outreach" /><CustomManagerGoals goals={regularGoals.filter((goal) => goal.assignee === "carlos")} /><div className="mt-4 grid gap-4"><ClientTargetGoal clients={clients} leads={leads} canManageClients={access.customers} /><SupplierPricingGoal />{access.owner ? <OwnerAffiliateGoal /> : <GoalDisclosure number={3} eyebrow="Supplier program" title="Supplier Affiliate Program" description="50 construction-focused targets with direct call routes first."><AffiliateCallList /></GoalDisclosure>}</div></section>

      {access.owner ? <section aria-labelledby="david-goals-title"><PersonHeader assignee="david" description="Website and campaign launch" /><CustomManagerGoals goals={regularGoals.filter((goal) => goal.assignee === "david")} /><div className="mt-4 grid gap-4"><FixWebsiteGoal notes={websiteNotes} /><BeatQuoteGoal owner /></div></section> : null}
    </div>
  </div></main>;
}
