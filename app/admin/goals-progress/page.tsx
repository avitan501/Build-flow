import {
  Archive,
  ArrowRight,
  ChevronDown,
  PhoneCall,
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
import { type ManagerGoalRecord } from "@/components/buildflow/manager-goals";
import { ManagerGoalStatusSelect } from "@/components/buildflow/manager-goal-status-select";
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
  CARLOS_FIXED_GOALS,
  fixedGoalKey as parseFixedGoalKey,
  type CarlosFixedGoalKey,
  type ManagerGoalStatus,
} from "@/lib/manager-goal-status";
import { SUPPLIER_PARTNERS } from "@/lib/supplier-partners/catalog";

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
      <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2.5">
        <span>
          <GoalNumber>{number}</GoalNumber>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#0066cc]">
            {eyebrow}
          </p>
          <h3 className="text-sm font-semibold leading-5">{title}</h3>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180"
          aria-hidden="true"
        />
        <span className="col-start-2 mt-1 flex items-center">
          <ManagerGoalStatusSelect fixedKey={fixedKey} status={status} />
        </span>
      </summary>
      <div className="border-t border-slate-200 p-3 sm:p-4">{children}</div>
    </details>
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
      eyebrow="Programs"
      title="API, Affiliate & Partnership"
      description="Manage supplier APIs, affiliate programs, and partnerships."
    >
      <div className="grid gap-4">
        <AffiliateCallList
          programs={programResult.data ?? []}
          activities={activityResult.data ?? []}
        />
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
      eyebrow="ABC"
      title="Prepare ABC Demo"
      description="Finish branch, product, price, and demo checks."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm">
          <div>
            <p className="font-semibold text-slate-950">
              Pre-production review
            </p>
            <p className="mt-0.5 text-slate-600">
              Thursday, September 3 · 2:30 PM ET
            </p>
          </div>
          <span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#0066cc]">
            In progress
          </span>
        </div>
        <nav
          aria-label="ABC demo sections"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {steps.map(([label, href], index) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-[#0066cc]"
            >
              <span>
                {index + 1}. {label}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
            Catalog workflow ready
          </span>
          <span className="rounded-md bg-amber-50 px-3 py-2 font-semibold text-amber-900">
            ABC action: Sandbox user sign-in + NY branch
          </span>
        </div>
        <Link
          href="/admin/abc"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[#0071e3] px-5 text-sm font-semibold text-white"
        >
          Open full demo
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </GoalDisclosure>
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
      eyebrow="Clients"
      title="Contact New Clients"
      description="Call new leads and record the next step."
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

function SupplierPartnershipGoal({ status }: { status: ManagerGoalStatus }) {
  const lists = [
    { label: "Suppliers from the Show", count: SUPPLIER_PARTNERS.length, href: "/owner/partnerships" },
    { label: "Suppliers from Friends", count: 0, href: "/admin/vendors" },
    { label: "Suppliers from Google", count: 0, href: "/admin/vendors" },
  ];
  return (
    <GoalDisclosure
      id="supplier-partnerships"
      fixedKey="supplier-partnerships"
      status={status}
      number={4}
      eyebrow="Partnerships"
      title="Build Supplier Relationships"
      description="Contact suppliers and record the next follow-up."
    >
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        {lists.map((list, index) => <Link key={list.label} href={list.href} className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-3 text-sm last:border-b-0 hover:bg-slate-50"><span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span><span className="min-w-0 flex-1 font-semibold">{list.label}</span><span className="text-xs tabular-nums text-slate-500">{list.count}</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>)}
      </div>
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
    .select("id,assignee,title,details,status,is_focus")
    .eq("assignee", "carlos")
    .order("status")
    .order("created_at", { ascending: false });
  const [clientResult, goalResult, leadResult, publishedResult] =
    await Promise.all([
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
      supabase
        .from("website_work_items")
        .select("id,task_key,title,next_step,status,source_chat_title")
        .eq("published_to_carlos", true)
        .eq("item_kind", "task")
        .not("status", "in", "(completed,superseded,archived)")
        .order("priority")
        .order("sort_order")
        .returns<
          Array<{
            id: string;
            task_key: string;
            title: string;
            next_step: string;
            status: string;
            source_chat_title: string | null;
          }>
        >(),
    ]);
  const clients = clientResult.error ? [] : (clientResult.data ?? []);
  const goals = goalResult.error ? [] : (goalResult.data ?? []);
  const leads = leadResult.error ? [] : (leadResult.data ?? []);
  const carlosFixedTaskKeys = new Set(
    Object.keys(CARLOS_FIXED_GOALS).map((key) => `carlos-fixed-${key}`),
  );
  const allPublishedTasks = publishedResult.error
    ? []
    : (publishedResult.data ?? []);
  const publishedTaskKeys = new Set(
    allPublishedTasks.map((task) => task.task_key),
  );
  const publishedTasks = allPublishedTasks.filter(
    (task) => !carlosFixedTaskKeys.has(task.task_key),
  );
  const fixedStatuses = new Map<CarlosFixedGoalKey, ManagerGoalStatus>();
  for (const goal of goals) {
    const key = parseFixedGoalKey(goal.details);
    if (key) fixedStatuses.set(key, goal.status);
  }
  const statusFor = (key: CarlosFixedGoalKey) =>
    fixedStatuses.get(key) ?? "open";
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
      key: "supplier-affiliate-program",
      content: access.owner ? (
        <OwnerAffiliateGoal status={statusFor("supplier-affiliate-program")} />
      ) : (
        <GoalDisclosure
          id="supplier-affiliate-program"
          fixedKey="supplier-affiliate-program"
          status={statusFor("supplier-affiliate-program")}
          number={3}
          eyebrow="Programs"
          title="API, Affiliate & Partnership"
          description="Manage supplier APIs, affiliate programs, and partnerships."
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
  const visibleFixedGoals = fixedGoals.filter((goal) =>
    publishedTaskKeys.has(`carlos-fixed-${goal.key}`),
  );
  const activeFixedGoals = visibleFixedGoals.filter(
    (goal) => statusFor(goal.key) !== "archived",
  );
  const archivedFixedGoals = visibleFixedGoals.filter(
    (goal) => statusFor(goal.key) === "archived",
  );

  const goalsWorkspace = (
    <>
      <section
        className="grid gap-2 md:grid-cols-2 xl:grid-cols-3"
        aria-label="Carlos tasks"
      >
        {activeFixedGoals.map((goal) => (
          <div
            key={goal.key}
            className="min-w-0 has-[>details[open]]:md:col-span-2 has-[>details[open]]:xl:col-span-3"
          >
            {goal.content}
          </div>
        ))}
      </section>
      {publishedTasks.length ? (
        <section
          className="mt-3 overflow-hidden rounded-lg border border-sky-200 bg-white"
          aria-labelledby="published-by-david"
        >
          <header className="border-b border-sky-100 bg-sky-50 px-3 py-2.5">
            <h3
              id="published-by-david"
              className="text-xs font-bold uppercase tracking-[.12em] text-sky-800"
            >
              From David
            </h3>
          </header>
          <div className="divide-y divide-slate-100">
            {publishedTasks.map((task) => (
              <div key={task.id} className="px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-950">
                  {task.title}
                </p>
                {task.next_step ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {task.next_step}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {archivedFixedGoals.length ? (
        <details className="group mt-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold text-slate-600">
            <Archive className="h-3.5 w-3.5" />
            <span className="flex-1">Archived priority goals</span>
            <span>{archivedFixedGoals.length}</span>
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t border-slate-200 p-2 md:grid-cols-2 xl:grid-cols-3">
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
            Carlos Dashboard
          </h1>
        </header>

        <section aria-label="Carlos tasks" className="mt-7">
          {goalsWorkspace}
        </section>
      </div>
    </main>
  );
}

export default async function GoalsProgressPage() {
  return <CarlosGoalsWorkspace />;
}
