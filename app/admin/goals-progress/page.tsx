import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Clock3,
  Megaphone,
  PhoneCall,
  Languages,
  Target,
} from "lucide-react";
import Link from "next/link";

import { AddTargetClient } from "@/components/buildflow/add-target-client";
import { AffiliateProgramTracker } from "@/components/buildflow/affiliate-program-tracker";
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
  if (programResult.error || checklistResult.error || activityResult.error || attachmentResult.error || integrationResult.error || settingsResult.error || !settingsResult.data) {
    throw new Error("The affiliate tracker could not load.");
  }
  const signedAttachments = await Promise.all((attachmentResult.data ?? []).map(async (attachment) => ({
    ...attachment,
    signed_url: (await supabase.storage.from("affiliate-confirmations").createSignedUrl(attachment.file_path, 1800)).data?.signedUrl ?? null,
  })));

  return <AffiliateProgramTracker
    programs={programResult.data ?? []}
    checklist={checklistResult.data ?? []}
    activities={activityResult.data ?? []}
    attachments={signedAttachments}
    integrations={integrationResult.data ?? []}
    settings={settingsResult.data}
  />;
}

export default async function GoalsProgressPage() {
  const { supabase, access } = await requireManagerPortalProfile();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,company_name,email,phone")
    .eq("role", "client")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<ClientTarget[]>();
  const clients = error ? [] : data ?? [];

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager Portal</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">Goals &amp; Progress</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Five company priorities, with the people and tools needed to move each one forward.</p>
        </header>

        <div className="mt-6 grid gap-5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="publish-goal-title">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div className="flex min-w-0 gap-3">
                <GoalNumber>1</GoalNumber>
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Website</p><h2 id="publish-goal-title" className="mt-1 text-xl font-semibold">Publish new website</h2><p className="mt-1 text-sm text-slate-600">Review the new Shop, approve it, and publish it on the main website.</p></div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"><Clock3 className="h-3.5 w-3.5" />Owner review</span>
            </div>
            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <div>
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">Progress</span><strong className="text-xl tabular-nums">50%</strong></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 bg-[#0071e3]" /></div>
                <ol className="mt-4 grid gap-x-5 sm:grid-cols-2">{publishSteps.map((step) => <li key={step.label} className="flex min-h-11 items-center gap-2 border-b border-slate-100 text-sm font-medium"><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${step.complete ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-400"}`}>{step.complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}</span>{step.label}</li>)}</ol>
              </div>
              <div className="border-t border-slate-200 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><a href={SHOP_PREVIEW_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Open new Shop<ArrowUpRight className="h-4 w-4" /></a><p className="mt-2 text-xs leading-5 text-slate-500">Preview only. Production remains unchanged until approved.</p></div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="clients-goal-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3"><GoalNumber>2</GoalNumber><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Outreach</p><h2 id="clients-goal-title" className="mt-1 text-xl font-semibold">Build a client target list and collect feedback</h2><p className="mt-1 text-sm text-slate-600">Start with contractors and builders who regularly purchase materials.</p></div></div>
              {access.owner ? <AddTargetClient /> : null}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[#0066cc]"><Languages className="h-4 w-4" /></span>
                <div><p className="text-sm font-semibold text-slate-950">English and Spanish call guide</p><p className="text-xs text-slate-600">A step-by-step conversation Carlos can follow with each target client.</p></div>
              </div>
              <Link href="/admin/goals-progress/client-target" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Open conversation guide<ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="overflow-hidden rounded-md border border-slate-200">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500"><span>Recent target clients</span><Link href="/admin/users" className="text-[#0066cc]">Full directory</Link></div>
                {clients.length ? clients.map((client) => <div key={client.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-slate-100 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{clientName(client)}</p><p className="truncate text-xs text-slate-500">{client.company_name || client.email || client.phone || "Contact details needed"}</p></div><div className="flex shrink-0 gap-1">{client.phone ? <a href={`tel:${client.phone}`} aria-label={`Call ${clientName(client)}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600"><PhoneCall className="h-4 w-4" /></a> : null}{client.email ? <a href={`mailto:${client.email}?subject=${encodeURIComponent("Quick feedback on Avantia Build")}`} className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700">Email</a> : null}</div></div>) : <p className="border-t border-slate-100 px-3 py-5 text-sm text-slate-500">Add the first target client to begin.</p>}
              </div>
              <div><p className="text-sm font-semibold">How to target them</p><ol className="mt-3 grid gap-3 text-sm text-slate-600"><li><strong className="text-slate-900">1. Invite:</strong> Ask for a 10-minute website test.</li><li><strong className="text-slate-900">2. Observe:</strong> Have them submit one real material request.</li><li><strong className="text-slate-900">3. Record:</strong> Ask what was unclear, slow, or missing.</li><li><strong className="text-slate-900">4. Offer:</strong> Compare one current supplier quote.</li></ol></div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="supplier-goal-title">
              <div className="flex gap-3"><GoalNumber>3</GoalNumber><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Purchasing</p><h2 id="supplier-goal-title" className="mt-1 text-xl font-semibold">Call suppliers and find their cheapest items</h2></div></div>
              <div className="mt-5 grid gap-3 text-sm text-slate-600"><p className="flex gap-2"><CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Ask each supplier for their 10 strongest prices, delivery minimum, lead time, and quote expiration.</p><p className="flex gap-2"><Target className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />Enter those prices in the catalog, then keep the best three or four suppliers per department.</p></div>
              <div className="mt-5 flex flex-wrap gap-2"><Link href="/admin/vendors" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Supplier Directory<ArrowRight className="h-4 w-4" /></Link><Link href="/admin/catalog" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Enter catalog prices</Link></div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="campaign-goal-title">
              <div className="flex gap-3"><GoalNumber>4</GoalNumber><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Campaign</p><h2 id="campaign-goal-title" className="mt-1 text-xl font-semibold">Launch “Beat Your Quote”</h2></div></div>
              <div className="mt-5 flex gap-3 rounded-md bg-sky-50 p-4"><Megaphone className="h-5 w-5 shrink-0 text-[#0066cc]" /><p className="text-sm leading-6 text-slate-700">Send the flyer to contractors who already have a material quote. The flyer directs them to upload it for comparison.</p></div>
              <div className="mt-5 flex flex-wrap gap-2">{access.owner ? <Link href="/admin/goals-progress/beat-your-quote-flyer" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white">Open campaign flyer<ArrowRight className="h-4 w-4" /></Link> : null}<Link href="/beat-a-quote" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold">Test customer page<ArrowUpRight className="h-4 w-4" /></Link></div>
            </section>
          </div>

          {access.owner ? <OwnerAffiliateGoal /> : <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="affiliate-goal-title"><div className="flex gap-3"><GoalNumber>5</GoalNumber><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066cc]">Affiliate revenue</p><h2 id="affiliate-goal-title" className="mt-1 text-xl font-semibold">Set up supplier affiliate programs</h2><p className="mt-2 text-sm text-slate-600">The owner manages affiliate applications, approvals, and account details.</p></div></div></section>}
        </div>
      </div>
    </main>
  );
}
