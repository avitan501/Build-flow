import {
  Archive,
  ArrowRight,
  ChevronDown,
  PhoneCall,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AddTargetClient } from "@/components/buildflow/add-target-client";
import { ClientTargetCallGuide } from "@/components/buildflow/client-target-call-guide";
import { ContractorCallScript } from "@/components/buildflow/carlos-outreach-scripts";
import {
  AddOutreachLead,
  ClientLanguageSelect,
  OutreachLeadList,
  type OutreachLeadRecord,
} from "@/components/buildflow/client-target-outreach";
import { type ManagerGoalRecord } from "@/components/buildflow/manager-goals";
import { ManagerGoalStatusSelect } from "@/components/buildflow/manager-goal-status-select";
import { ManagerGoalPrioritySelect } from "@/components/buildflow/manager-goal-priority-select";
import { requireManagerPortalProfile } from "@/lib/auth";
import {
  CARLOS_FIXED_GOALS,
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
  priority = 3,
  canManagePriority = false,
  fixedKey,
  children,
}: {
  id?: string;
  number: number;
  eyebrow: string;
  title: string;
  description?: string;
  status?: ManagerGoalStatus;
  priority?: number;
  canManagePriority?: boolean;
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
        <span className="col-start-2 mt-1 flex flex-wrap items-center gap-1">
          <ManagerGoalStatusSelect fixedKey={fixedKey} status={status} />
          <ManagerGoalPrioritySelect fixedKey={fixedKey} priority={priority} canManage={canManagePriority} />
        </span>
      </summary>
      <div className="border-t border-slate-200 p-3 sm:p-4">{children}</div>
    </details>
  );
}

function SupplierNetworkGoalLink({
  status,
  priority,
  canManagePriority,
}: {
  status: ManagerGoalStatus;
  priority: number;
  canManagePriority: boolean;
}) {
  return (
    <section
      id="supplier-affiliate-program"
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <Link
        href="/admin/supplier-network"
        className="grid min-h-16 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 transition hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0066cc]"
      >
        <GoalNumber>2</GoalNumber>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#0066cc]">Supplier network</p>
          <h3 className="text-sm font-semibold leading-5">Build Supplier Relationships</h3>
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-4 text-slate-500">Open suppliers, channels, contacts and next steps.</p>
        </div>
        <ArrowRight className="h-4 w-4 text-[#0066cc]" aria-hidden="true" />
      </Link>
      <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-3 py-1.5 pl-[3.5rem]">
        <ManagerGoalStatusSelect fixedKey="supplier-affiliate-program" status={status} />
        <ManagerGoalPrioritySelect fixedKey="supplier-affiliate-program" priority={priority} canManage={canManagePriority} />
      </div>
    </section>
  );
}

function AbcSupplyDemoGoal({ status, priority }: { status: ManagerGoalStatus; priority: number }) {
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
      priority={priority}
      canManagePriority
      number={3}
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
  priority,
  canManagePriority,
}: {
  clients: ClientTarget[];
  leads: OutreachLeadRecord[];
  canManageClients: boolean;
  status: ManagerGoalStatus;
  priority: number;
  canManagePriority: boolean;
}) {
  return (
    <GoalDisclosure
      id="client-target"
      fixedKey="client-target"
      status={status}
      priority={priority}
      canManagePriority={canManagePriority}
      number={1}
      eyebrow="Clients"
      title="Contact New Clients"
      description="Call new leads and record the next step."
    >
      <ContractorCallScript />
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
        .select("id,task_key,title,next_step,status,source_chat_title,priority")
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
            priority: number;
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
  const fixedPriorities = new Map(
    allPublishedTasks.map((task) => [task.task_key, task.priority]),
  );
  const priorityFor = (key: CarlosFixedGoalKey) =>
    fixedPriorities.get(`carlos-fixed-${key}`) ?? 3;
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
          priority={priorityFor("client-target")}
          canManagePriority={access.owner}
        />
      ),
    },
    {
      key: "supplier-affiliate-program",
      content: (
        <SupplierNetworkGoalLink
          status={statusFor("supplier-affiliate-program")}
          priority={priorityFor("supplier-affiliate-program")}
          canManagePriority={access.owner}
        />
      ),
    },
    ...(access.owner
      ? [
          {
            key: "abc-supply-demo" as const,
            content: (
              <AbcSupplyDemoGoal status={statusFor("abc-supply-demo")} priority={priorityFor("abc-supply-demo")} />
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
