import {
  Archive,
  ArrowRight,
  ChevronDown,
  CircleDollarSign,
  ListTodo,
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
import {
  AddOutreachLead,
  ClientLanguageSelect,
  OutreachLeadList,
  type OutreachLeadRecord,
} from "@/components/buildflow/client-target-outreach";
import {
  AddManagerGoal,
  CustomManagerGoals,
  type ManagerGoalRecord,
} from "@/components/buildflow/manager-goals";
import { ManagerGoalStatusSelect } from "@/components/buildflow/manager-goal-status-select";
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
import {
  fixedGoalKey as parseFixedGoalKey,
  type CarlosFixedGoalKey,
  type ManagerGoalStatus,
} from "@/lib/manager-goal-status";

type ClientTarget = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_language: "en" | "es";
};

function clientName(client: ClientTarget) {
  return (
    client.full_name?.trim() ||
    client.company_name?.trim() ||
    client.email ||
    "Unnamed client"
  );
}

function GoalNumber({ children }: { children: number | string }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-bold text-white">
      {children}
    </span>
  );
}

function GoalDisclosure({
  id,
  number,
  eyebrow,
  title,
  description,
  status = "open",
  fixedKey,
  children,
}: {
  id?: string;
  number: number;
  eyebrow: string;
  title: string;
  description?: string;
  status?: ManagerGoalStatus;
  fixedKey: CarlosFixedGoalKey;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className="group scroll-mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-3 py-2">
        <GoalNumber>{number}</GoalNumber>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-bold uppercase tracking-[.1em] text-[#0066cc]">
            {eyebrow}
          </p>
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {description ? (
            <p className="truncate text-[10px] text-slate-500">{description}</p>
          ) : null}
        </div>
        <ManagerGoalStatusSelect fixedKey={fixedKey} status={status} />
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-slate-200 p-3 sm:p-4">{children}</div>
    </details>
  );
}

function PersonHeader({
  assignee,
  description,
}: {
  assignee: "david" | "carlos";
  description: string;
}) {
  const name = assignee === "david" ? "David" : "Carlos";
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
          <UserRound className="h-5 w-5" />
        </span>
        <div>
          <h2 id={`${assignee}-goals-title`} className="text-2xl font-semibold">
            {name}
          </h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
      <AddManagerGoal assignee={assignee} />
    </header>
  );
}

async function OwnerAffiliateGoal({ status }: { status: ManagerGoalStatus }) {
  const { supabase } = await requireAdminProfile();
  const [
    programResult,
    checklistResult,
    activityResult,
    attachmentResult,
    integrationResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("affiliate_programs")
      .select("*")
      .order("priority")
      .order("supplier_name")
      .returns<AffiliateProgram[]>(),
    supabase
      .from("affiliate_program_checklist")
      .select("*")
      .order("sort_order")
      .returns<AffiliateChecklistItem[]>(),
    supabase
      .from("affiliate_program_activities")
      .select("*")
      .order("activity_date", { ascending: false })
      .limit(500)
      .returns<AffiliateActivity[]>(),
    supabase
      .from("affiliate_program_attachments")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<AffiliateAttachment[]>(),
    supabase
      .from("affiliate_integrations")
      .select("*")
      .order("created_at")
      .returns<AffiliateIntegration[]>(),
    supabase
      .from("affiliate_tracker_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle<AffiliateTrackerSettings>(),
  ]);
  if (
    programResult.error ||
    checklistResult.error ||
    activityResult.error ||
    attachmentResult.error ||
    integrationResult.error ||
    settingsResult.error ||
    !settingsResult.data
  )
    throw new Error("The affiliate tracker could not load.");
  const signedAttachments = await Promise.all(
    (attachmentResult.data ?? []).map(async (attachment) => ({
      ...attachment,
      signed_url:
        (
          await supabase.storage
            .from("affiliate-confirmations")
            .createSignedUrl(attachment.file_path, 1800)
        ).data?.signedUrl ?? null,
    })),
  );
  return (
    <GoalDisclosure
      id="supplier-affiliate-program"
      fixedKey="supplier-affiliate-program"
      status={status}
      number={3}
      eyebrow="Supplier program"
      title="Supplier Affiliate Program"
      description="50 construction-focused targets · Direct call routes first."
    >
      <div className="grid gap-4">
        <AffiliateCallList programs={programResult.data ?? []} />
        <AffiliateProgramTracker
          programs={programResult.data ?? []}
          checklist={checklistResult.data ?? []}
          activities={activityResult.data ?? []}
          attachments={signedAttachments}
          integrations={integrationResult.data ?? []}
          settings={settingsResult.data}
          hideHeading
        />
      </div>
    </GoalDisclosure>
  );
}

function AbcSupplyDemoGoal({ status }: { status: ManagerGoalStatus }) {
  const steps = [
    ["Customer connection", "/account/abc"],
    ["Ship-To", "/admin/abc#ship-to"],
    ["Authorized branch", "/admin/abc#branch"],
    ["Product search", "/admin/abc#product-search"],
    ["Unit & quantity", "/admin/abc#unit-quantity"],
    ["Availability & price", "/admin/abc#availability-price"],
    ["Demo script", "/admin/abc#demo-notes"],
  ] as const;

  return (
    <GoalDisclosure
      id="abc-supply-demo"
      fixedKey="abc-supply-demo"
      status={status}
      number={5}
      eyebrow="Supplier pricing"
      title="ABC Supply Demo"
      description="ABC certification workflow and private customer pricing."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm"><div><p className="font-semibold text-slate-950">Pre-production review</p><p className="mt-0.5 text-slate-600">Thursday, September 3 · 2:30 PM ET</p></div><span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#0066cc]">In progress</span></div>
        <nav aria-label="ABC demo sections" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(([label, href], index) => <Link key={href} href={href} className="flex min-h-11 items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-[#0066cc]"><span>{index + 1}. {label}</span><ArrowRight className="h-4 w-4" /></Link>)}
        </nav>
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">Website workflow built</span><span className="rounded-md bg-amber-50 px-3 py-2 font-semibold text-amber-900">NY sandbox branch: ABC action needed</span></div>
        <Link href="/admin/abc" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white">Open full demo<ArrowRight className="h-4 w-4" /></Link>
      </div>
    </GoalDisclosure>
  );
}

function AiTaskInbox() {
  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-sky-200 bg-[#f7fbff] shadow-sm">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0066cc] text-white">
          <ListTodo className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#0066cc]">
            Phone task intake
          </p>
          <h3 className="text-sm font-semibold text-slate-950">
            AI messages &amp; tasks
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Review phone instructions and screenshots before they become a task,
            contact, lead, supplier, or material request.
          </p>
        </div>
        <Link
          href="/owner/ai-inbox"
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-xs font-semibold text-white"
        >
          Open Task To Do
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

function ClientTargetGoal({
  clients,
  leads,
  canManageClients,
  status,
}: {
  clients: ClientTarget[];
  leads: OutreachLeadRecord[];
  canManageClients: boolean;
  status: ManagerGoalStatus;
}) {
  return (
    <GoalDisclosure
      id="client-target"
      fixedKey="client-target"
      status={status}
      number={1}
      eyebrow="Outreach"
      title="Client Target"
      description="Leads to contact and active clients in one place."
    >
      <div className="flex flex-wrap gap-2">
        {canManageClients ? (
          <>
            <AddOutreachLead />
            <AddTargetClient />
          </>
        ) : null}
        <ClientTargetCallGuide />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <OutreachLeadList leads={leads} />
        <details className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600">
            <span>Clients in the system</span>
            <span className="text-slate-500">
              {clients.length} clients · Open
            </span>
          </summary>
          <div className="flex justify-end border-t border-slate-100 px-3 py-2">
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-[#0066cc]"
            >
              Full directory
            </Link>
          </div>
          {clients.length ? (
            clients.map((client) => (
              <div
                key={client.id}
                className="flex min-h-12 items-center justify-between gap-3 border-t border-slate-100 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {clientName(client)}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {client.company_name ||
                      client.email ||
                      client.phone ||
                      "Contact details needed"}
                  </p>
                </div>
                <ClientLanguageSelect
                  id={client.id}
                  name={clientName(client)}
                  language={client.preferred_language}
                />
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    aria-label={`Call ${clientName(client)}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600"
                  >
                    <PhoneCall className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            ))
          ) : (
            <p className="border-t border-slate-100 px-3 py-4 text-sm text-slate-500">
              No clients added yet.
            </p>
          )}
        </details>
      </div>
    </GoalDisclosure>
  );
}

function SupplierPricingGoal({ status }: { status: ManagerGoalStatus }) {
  return (
    <GoalDisclosure
      id="call-suppliers"
      fixedKey="call-suppliers"
      status={status}
      number={2}
      eyebrow="Purchasing"
      title="Call Supplier"
      description="Find what each supplier sells cheaper than anyone else."
    >
      <div className="grid gap-3 text-sm text-slate-600">
        <p className="flex gap-2">
          <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Ask each supplier for their strongest-priced items, delivery minimum,
          lead time, and quote expiration.
        </p>
        <p className="flex gap-2">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc]" />
          Enter the prices in the catalog and keep the best suppliers per
          department.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/owner/partnerships"
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white"
        >
          Show supplier partnerships
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/admin/vendors"
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
        >
          Supplier Directory
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/admin/catalog"
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold"
        >
          Enter catalog prices
        </Link>
        <Link
          href="/owner/delivery-requests"
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold"
        >
          Delivery requests
        </Link>
      </div>
    </GoalDisclosure>
  );
}

function SupplierPartnershipGoal({ status }: { status: ManagerGoalStatus }) {
  return (
    <GoalDisclosure
      id="supplier-partnerships"
      fixedKey="supplier-partnerships"
      status={status}
      number={4}
      eyebrow="Supplier relationships"
      title="Supplier Partnership"
      description="Show contacts, outreach drafts, follow-ups, and partnership progress."
    >
      <p className="text-sm leading-6 text-slate-600">
        Open Carlos&apos;s supplier workspace to contact researched companies
        and track every next step.
      </p>
      <Link
        href="/owner/partnerships"
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white"
      >
        Open Supplier Partnerships
        <ArrowRight className="h-4 w-4" />
      </Link>
    </GoalDisclosure>
  );
}

export async function CarlosGoalsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { supabase, access } = await requireManagerPortalProfile();
  const goalsQuery = supabase
    .from("manager_goals")
    .select("id,assignee,title,details,status")
    .eq("assignee", "carlos")
    .order("status")
    .order("created_at", { ascending: false });
  const [clientResult, goalResult, leadResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,company_name,email,phone,preferred_language")
      .eq("role", "client")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<ClientTarget[]>(),
    goalsQuery.returns<ManagerGoalRecord[]>(),
    supabase
      .from("manager_outreach_leads")
      .select(
        "id,full_name,company_name,email,phone,notes,status,relationship_level,preferred_language",
      )
      .order("status")
      .order("created_at", { ascending: false })
      .returns<OutreachLeadRecord[]>(),
  ]);
  const clients = clientResult.error ? [] : (clientResult.data ?? []);
  const goals = goalResult.error ? [] : (goalResult.data ?? []);
  const leads = leadResult.error ? [] : (leadResult.data ?? []);
  const fixedStatuses = new Map<CarlosFixedGoalKey, ManagerGoalStatus>();
  for (const goal of goals) {
    const key = parseFixedGoalKey(goal.details);
    if (key) fixedStatuses.set(key, goal.status);
  }
  const statusFor = (key: CarlosFixedGoalKey) =>
    fixedStatuses.get(key) ?? "open";
  const regularGoals = goals
    .filter(
      (goal) =>
        !goal.details?.startsWith(DAILY_WORK_SUMMARY_PREFIX) &&
        !goal.details?.startsWith(SUPPLIER_PARTNER_NOTES_PREFIX) &&
        !parseFixedGoalKey(goal.details),
    )
    .filter((goal) => goal.assignee === "carlos");
  const fixedGoals: Array<{ key: CarlosFixedGoalKey; content: ReactNode }> = [
    {
      key: "client-target",
      content: (
        <ClientTargetGoal
          clients={clients}
          leads={leads}
          canManageClients={access.customers}
          status={statusFor("client-target")}
        />
      ),
    },
    {
      key: "call-suppliers",
      content: <SupplierPricingGoal status={statusFor("call-suppliers")} />,
    },
    {
      key: "supplier-affiliate-program",
      content: access.owner ? (
        <OwnerAffiliateGoal status={statusFor("supplier-affiliate-program")} />
      ) : (
        <GoalDisclosure
          id="supplier-affiliate-program"
          fixedKey="supplier-affiliate-program"
          status={statusFor("supplier-affiliate-program")}
          number={3}
          eyebrow="Supplier program"
          title="Supplier Affiliate Program"
          description="50 construction-focused targets with direct call routes first."
        >
          <AffiliateCallList />
        </GoalDisclosure>
      ),
    },
    {
      key: "supplier-partnerships",
      content: (
        <SupplierPartnershipGoal status={statusFor("supplier-partnerships")} />
      ),
    },
    ...(access.owner
      ? [
          {
            key: "abc-supply-demo" as const,
            content: (
              <AbcSupplyDemoGoal status={statusFor("abc-supply-demo")} />
            ),
          },
        ]
      : []),
  ];
  const activeFixedGoals = fixedGoals.filter(
    (goal) => statusFor(goal.key) !== "archived",
  );
  const archivedFixedGoals = fixedGoals.filter(
    (goal) => statusFor(goal.key) === "archived",
  );

  const goalsWorkspace = (
    <>
      {embedded ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Task To Do</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Open a task or work area here without leaving the dashboard.
            </p>
          </div>
          <AddManagerGoal assignee="carlos" />
        </div>
      ) : null}
      {access.owner ? <AiTaskInbox /> : null}
      <CustomManagerGoals goals={regularGoals} />
      <div className="mt-3 grid gap-2">
        {activeFixedGoals.map((goal) => (
          <div key={goal.key}>{goal.content}</div>
        ))}
      </div>
      {archivedFixedGoals.length ? (
        <details className="group mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-slate-600">
            <Archive className="h-3.5 w-3.5" />
            <span className="flex-1">Archived priority goals</span>
            <span>{archivedFixedGoals.length}</span>
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-slate-200 p-2">
            {archivedFixedGoals.map((goal) => (
              <div key={goal.key}>{goal.content}</div>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );

  if (embedded) return <div className="p-3 sm:p-4">{goalsWorkspace}</div>;

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase text-[#0066cc]">
            Manager Portal
          </p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
            Task To Do
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Phone instructions, daily tasks, client outreach, supplier calls,
            and follow-up work in one workspace.
          </p>
        </header>

        <section aria-labelledby="carlos-goals-title" className="mt-7">
          <PersonHeader
            assignee="carlos"
            description="Tasks, clients, suppliers, and follow-up work"
          />
          {goalsWorkspace}
        </section>
      </div>
    </main>
  );
}

export default async function GoalsProgressPage() {
  return <CarlosGoalsWorkspace />;
}
