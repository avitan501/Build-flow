import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Clock3,
  Languages,
  Megaphone,
  PhoneCall,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { AddTargetClient } from "@/components/buildflow/add-target-client";
import { AffiliateProgramTracker } from "@/components/buildflow/affiliate-program-tracker";
import { AddManagerGoal, CustomManagerGoals, type ManagerGoalRecord } from "@/components/buildflow/manager-goals";
import type {
  AffiliateActivity,
  AffiliateAttachment,
  AffiliateChecklistItem,
  AffiliateIntegration,
  AffiliateProgram,
  AffiliateTrackerSettings,
} from "@/lib/affiliate-tracker";
import { requireAdminProfile, requireManagerPortalProfile } from "@/lib/auth";

const SHOP_PREVIEW_URL = "https://build-flow-wfl3-em41309w2-avitanneto-1804s-projects.vercel.app/shop";
const NEW_TARGET = { name: "Aharon Cohen", phone: "+1 (516) 507-6948" };

type ClientTarget = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
};

const publishSteps = [
  { label: "New Shop prepared", complete: true },
  { label: "Phone and desktop review", complete: true },
  { label: "Owner approval", complete: false },
  { label: "Publish on main website", complete: false },
];

function clientName(client: ClientTarget) {
  return client.full_name?.trim() || client.company_name?.trim() || client.email || "Unnamed client";
}

function GoalNumber({ children }: { children: number | string }) {
  return <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">{children}</span>;
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
  return <AffiliateProgramTracker programs={programResult.data ?? []} checklist={checklistResult.data ?? []} activities={activityResult.data ?? []} attachments={signedAttachments} integrations={integrationResult.data ?? []} settings={settingsResult.data} />;
}

function PublishWebsiteGoal() {
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="publish-goal-title">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
      <div className="flex min-w-0 gap-3"><GoalNumber>1</GoalNumber><div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Website</p><h3 id="publish-goal-title" className="mt-1 text-xl font-semibold">Publish website</h3><p className="mt-1 text-sm text-slate-600">Review the new Shop, approve it, and publish it on the main website.</p></div></div>
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"><Clock3 className="h-3.5 w-3.5" />Owner review</span>
    </div>
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div><div className="flex items-center justify-between"><span className="text-sm font-semibold">Progress</span><strong className="text-xl tabular-nums">50%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 bg-[#0071e3]" /></div><ol className="mt-3 grid sm:grid-cols-2">{publishSteps.map((step) => <li key={step.label} className="flex min-h-10 items-center gap-2 border-b border-slate-100 text-sm font-medium"><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${step.complete ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-400"}`}>{step.complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>{step.label}</li>)}</ol></div>
      <div className="border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><a href={SHOP_PREVIEW_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Open new Shop<ArrowUpRight className="h-4 w-4" /></a><p className="mt-2 text-xs leading-5 text-slate-500">Preview for final website review.</p></div>
    </div>
  </section>;
}

function BeatQuoteGoal({ owner }: { owner: boolean }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="campaign-goal-title">
    <div className="flex gap-3"><GoalNumber>2</GoalNumber><div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Campaign</p><h3 id="campaign-goal-title" className="mt-1 text-xl font-semibold">Launch campaign: Beat Your Quote</h3></div></div>
    <div className="mt-4 flex gap-3 rounded-md bg-sky-50 p-4"><Megaphone className="h-5 w-5 shrink-0 text-[#0066cc]" /><p className="text-sm leading-6 text-slate-700">Send the flyer to contractors who already have a material quote and invite them to upload it for comparison.</p></div>
    <div className="mt-4 flex flex-wrap gap-2">{owner ? <Link href="/admin/goals-progress/beat-your-quote-flyer" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">Open campaign flyer<ArrowRight className="h-4 w-4" /></Link> : null}<Link href="/beat-a-quote" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Test customer page<ArrowUpRight className="h-4 w-4" /></Link></div>
  </section>;
}

function ClientTargetGoal({ clients, owner }: { clients: ClientTarget[]; owner: boolean }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="clients-goal-title">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><GoalNumber>1</GoalNumber><div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Outreach</p><h3 id="clients-goal-title" className="mt-1 text-xl font-semibold">Client Target</h3><p className="mt-1 text-sm text-slate-600">Call contractors and builders who regularly purchase materials.</p></div></div>{owner ? <AddTargetClient /> : null}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700"><UserRound className="h-5 w-5" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase text-emerald-700">New target</p><p className="truncate text-sm font-semibold">{NEW_TARGET.name}</p><p className="text-xs text-slate-600">{NEW_TARGET.phone}</p></div><a href="tel:+15165076948" aria-label={`Call ${NEW_TARGET.name}`} className="ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white"><PhoneCall className="h-4 w-4" /></a></div>
      <Link href="/admin/goals-progress/client-target" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"><Languages className="h-4 w-4" />Open call guide<ArrowRight className="h-4 w-4" /></Link>
    </div>
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200"><div className="grid grid-cols-[minmax(0,1fr)_auto] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500"><span>Other target clients</span><Link href="/admin/users" className="text-[#0066cc]">Full directory</Link></div>{clients.length ? clients.map((client) => <div key={client.id} className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-100 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{clientName(client)}</p><p className="truncate text-xs text-slate-500">{client.company_name || client.email || client.phone || "Contact details needed"}</p></div>{client.phone ? <a href={`tel:${client.phone}`} aria-label={`Call ${clientName(client)}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600"><PhoneCall className="h-4 w-4" /></a> : null}</div>) : <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">No other targets added yet.</p>}</div>
  </section>;
}

function SupplierPricingGoal() {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="supplier-goal-title">
    <div className="flex gap-3"><GoalNumber>2</GoalNumber><div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Purchasing</p><h3 id="supplier-goal-title" className="mt-1 text-xl font-semibold">Call suppliers and find what they sell cheaper than anyone else</h3></div></div>
    <div className="mt-4 grid gap-3 text-sm text-slate-600"><p className="flex gap-2"><CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Ask each supplier for their strongest-priced items, delivery minimum, lead time, and quote expiration.</p><p className="flex gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />Enter the prices in the catalog and keep the best suppliers per department.</p></div>
    <div className="mt-4 flex flex-wrap gap-2"><Link href="/admin/vendors" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Supplier Directory<ArrowRight className="h-4 w-4" /></Link><Link href="/admin/catalog" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Enter catalog prices</Link></div>
  </section>;
}

export default async function GoalsProgressPage() {
  const { supabase, access } = await requireManagerPortalProfile();
  const [clientResult, goalResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,company_name,email,phone").eq("role", "client").eq("is_active", true).order("created_at", { ascending: false }).limit(5).returns<ClientTarget[]>(),
    supabase.from("manager_goals").select("id,assignee,title,details,status").order("status").order("created_at", { ascending: false }).returns<ManagerGoalRecord[]>(),
  ]);
  const clients = clientResult.error ? [] : clientResult.data ?? [];
  const goals = goalResult.error ? [] : goalResult.data ?? [];

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10"><div className="mx-auto max-w-6xl">
    <header className="border-b border-slate-200 pb-6"><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Manager Portal</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Goals &amp; Progress</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Company priorities organized by owner. Add new goals under the person responsible for completing them.</p></header>

    <div className="mt-7 grid gap-9">
      <section aria-labelledby="david-goals-title"><PersonHeader assignee="david" description="Website and campaign launch" /><CustomManagerGoals goals={goals.filter((goal) => goal.assignee === "david")} /><div className="mt-4 grid gap-4"><PublishWebsiteGoal /><BeatQuoteGoal owner={access.owner} /></div></section>

      <section aria-labelledby="carlos-goals-title"><PersonHeader assignee="carlos" description="Clients, suppliers, and pricing outreach" /><CustomManagerGoals goals={goals.filter((goal) => goal.assignee === "carlos")} /><div className="mt-4 grid gap-4"><ClientTargetGoal clients={clients} owner={access.owner} /><SupplierPricingGoal />{access.owner ? <OwnerAffiliateGoal /> : <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="affiliate-goal-title"><div className="flex gap-3"><GoalNumber>3</GoalNumber><div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Supplier program</p><h3 id="affiliate-goal-title" className="mt-1 text-xl font-semibold">Supplier Affiliate Program</h3><p className="mt-2 text-sm text-slate-600">Call suppliers, track opportunities, and report progress to David. The owner manages private account details.</p></div></div></section>}</div></section>
    </div>
  </div></main>;
}
