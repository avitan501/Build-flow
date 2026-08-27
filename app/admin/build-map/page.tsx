import {
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  CreditCard,
  MessageCircleQuestion,
  PhoneCall,
  Sparkles,
  Store,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";

import { CarlosGoalsWorkspace } from "@/app/admin/goals-progress/page";
import type { ManagerGoalRecord } from "@/components/buildflow/manager-goals";
import { EmployeeClockStatus } from "@/components/buildflow/employee-clock-status";
import { ManagerDashboardAiSearch } from "@/components/buildflow/manager-dashboard-ai-search";
import { ManagerNotificationControl } from "@/components/buildflow/manager-notification-control";
import {
  ManagerTodayTasks,
  type ManagerTodayTask,
} from "@/components/buildflow/manager-today-tasks";
import {
  DAILY_WORK_SUMMARY_PREFIX,
  parseDailyWorkSummary,
} from "@/lib/daily-work-summary";
import { requireManagerPortalProfile } from "@/lib/auth";
import {
  COMMUNICATION_LOG_PREFIX,
  DASHBOARD_AI_HISTORY_PREFIX,
  EMPLOYEE_ACTIVITY_PREFIX,
  TODAY_TASK_PREFIX,
  parseDashboardAiHistory,
} from "@/lib/manager-command-center";
import {
  managerPipelineStage,
  type ManagerPipelineStage,
} from "@/lib/manager-dashboard";
import { SYSTEM_GOAL_STATUS_PREFIX } from "@/lib/manager-goal-status";

const QUO_INBOX_URL =
  "https://my.quo.com/inbox/PN7lAbkMJw/c/CN30389c1bd6c542e78fbcec10a4e91602";
const WHATSAPP_URL = "https://web.whatsapp.com/";
const WEBSITE_FIX_NOTE_PREFIX = "website_fix_note:";

type RequestRow = {
  id: string;
  owner_id: string;
  title: string;
  status: string;
  updated_at: string;
};

type ComparisonRow = {
  id: string;
  request_id: string | null;
  status: string;
  client_quote_status: string;
  updated_at: string;
};

type SupplierPackageRow = {
  request_id: string;
  status: string;
};

type ClientRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type DashboardGoalRecord = ManagerGoalRecord & {
  created_at: string;
  updated_at: string;
};

const pipelineTone: Record<ManagerPipelineStage, string> = {
  received: "border-amber-200 bg-amber-50 text-amber-700",
  pricing: "border-sky-200 bg-sky-50 text-sky-700",
  approval: "border-violet-200 bg-violet-50 text-violet-700",
  delivery: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const pipelineStages: Array<{
  id: ManagerPipelineStage;
  label: string;
  description: string;
  icon: typeof ClipboardList;
  symbolLabel: string;
}> = [
  {
    id: "received",
    label: "Received / needs shopping",
    description: "New client requests that still need supplier pricing.",
    icon: ClipboardList,
    symbolLabel: "New request",
  },
  {
    id: "pricing",
    label: "Priced / not sent",
    description: "Supplier pricing received, but no client quote was sent.",
    icon: BadgeDollarSign,
    symbolLabel: "Pricing ready",
  },
  {
    id: "approval",
    label: "Waiting for client",
    description: "Client quote sent and waiting for approval.",
    icon: MessageCircleQuestion,
    symbolLabel: "Waiting for client reply",
  },
  {
    id: "delivery",
    label: "Payment received / delivery",
    description: "Payment received; supplier delivery still needs completion.",
    icon: Truck,
    symbolLabel: "Ready for delivery",
  },
];

const closedRequestStatuses = new Set(["completed", "closed", "cancelled"]);

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function GoalDisclosure({
  assignee,
  goals,
  priorityCount,
  children,
}: {
  assignee: "carlos" | "david";
  goals: ManagerGoalRecord[];
  priorityCount: number;
  children: React.ReactNode;
}) {
  const name = assignee === "carlos" ? "Carlos" : "David";
  const openGoals = goals.filter((goal) => goal.status === "open").length;
  return (
    <details className="group border-t border-slate-200 first:border-t-0">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
          <UserRound className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm font-semibold">{name} goals</strong>
          <span className="mt-0.5 block text-xs text-slate-500">
            {priorityCount} priorities
            {openGoals ? ` · ${openGoals} custom open` : ""}
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-slate-100 bg-slate-50/60">{children}</div>
    </details>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage = "" } = await searchParams;
  const selectedStage = pipelineStages.some((item) => item.id === stage)
    ? (stage as ManagerPipelineStage)
    : null;
  const { supabase, access } = await requireManagerPortalProfile();
  let goalsQuery = supabase
    .from("manager_goals")
    .select("id,assignee,title,details,status,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (!access.owner) goalsQuery = goalsQuery.eq("assignee", "carlos");

  const [
    requestsResult,
    comparisonsResult,
    packagesResult,
    goalsResult,
    clientsResult,
  ] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("id,owner_id,title,status,updated_at")
      .order("updated_at", { ascending: false })
      .limit(250)
      .returns<RequestRow[]>(),
    supabase
      .from("quote_comparisons")
      .select("id,request_id,status,client_quote_status,updated_at")
      .order("updated_at", { ascending: false })
      .limit(500)
      .returns<ComparisonRow[]>(),
    supabase
      .from("supplier_packages")
      .select("request_id,status")
      .order("updated_at", { ascending: false })
      .limit(500)
      .returns<SupplierPackageRow[]>(),
    goalsQuery.returns<DashboardGoalRecord[]>(),
    supabase
      .from("profiles")
      .select("id,full_name,email")
      .eq("role", "client")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<ClientRow[]>(),
  ]);

  const requests = (requestsResult.data ?? []).filter(
    (request) =>
      request.status !== "draft" && !closedRequestStatuses.has(request.status),
  );
  const comparisons = comparisonsResult.data ?? [];
  const packages = packagesResult.data ?? [];
  const clients = clientsResult.data ?? [];
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const stagedRequests = requests.map((request) => ({
    request,
    stage: managerPipelineStage(request, comparisons, packages),
  }));
  const stageCounts = new Map<ManagerPipelineStage, number>(
    pipelineStages.map((item) => [
      item.id,
      stagedRequests.filter((entry) => entry.stage === item.id).length,
    ]),
  );
  const visibleRequests = (
    selectedStage
      ? stagedRequests.filter((entry) => entry.stage === selectedStage)
      : stagedRequests
  ).slice(0, 10);
  const pipelineAvailable =
    !requestsResult.error && !comparisonsResult.error && !packagesResult.error;

  const goals = goalsResult.data ?? [];
  const dashboardHistory = parseDashboardAiHistory(
    goals.find(
      (goal) =>
        goal.title === "Dashboard AI search" &&
        goal.details?.startsWith(DASHBOARD_AI_HISTORY_PREFIX),
    )?.details,
  );
  const newYorkDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayKey = newYorkDate.format(new Date());
  const todaySummaryRow = goals.find(
    (goal) =>
      goal.title === `Daily summary - ${todayKey}` &&
      goal.details?.startsWith(DAILY_WORK_SUMMARY_PREFIX),
  );
  const todaySummary = todaySummaryRow
    ? parseDailyWorkSummary(todaySummaryRow)
    : null;
  const todayTasks: ManagerTodayTask[] = goals
    .filter((goal) => goal.details?.startsWith(TODAY_TASK_PREFIX))
    .filter((goal) => goal.status !== "archived")
    .filter(
      (goal) =>
        goal.status === "open" ||
        newYorkDate.format(new Date(goal.created_at)) === todayKey,
    )
    .sort(
      (a, b) =>
        Number(a.status === "completed") - Number(b.status === "completed") ||
        b.created_at.localeCompare(a.created_at),
    )
    .map(({ id, title, status, created_at }) => ({
      id,
      title,
      status:
        status === "completed" ? ("completed" as const) : ("open" as const),
      created_at,
    }));
  const regularGoals = goals.filter(
    (goal) =>
      ![
        WEBSITE_FIX_NOTE_PREFIX,
        DAILY_WORK_SUMMARY_PREFIX,
        DASHBOARD_AI_HISTORY_PREFIX,
        EMPLOYEE_ACTIVITY_PREFIX,
        COMMUNICATION_LOG_PREFIX,
        TODAY_TASK_PREFIX,
        SYSTEM_GOAL_STATUS_PREFIX,
      ].some((prefix) => goal.details?.startsWith(prefix)),
  );
  const managerSections = [
    {
      title: "Customers",
      icon: Users,
      links: access.customers
        ? [
            { href: "/admin/users", label: "Customer Directory" },
            { href: "/owner/materials/requests", label: "Client Requests" },
          ]
        : [],
    },
    {
      title: "Messages & Calls",
      icon: PhoneCall,
      links: [
        ...(access.communications
          ? [{ href: "/admin/communications", label: "Messages" }]
          : []),
        { href: QUO_INBOX_URL, label: "Calls & Messages" },
        { href: WHATSAPP_URL, label: "WhatsApp" },
        { href: "/admin/daily-summary", label: "Daily Work Summary" },
      ],
    },
    {
      title: "Suppliers",
      icon: Store,
      links: [
        ...(access.suppliers
          ? [
              { href: "/admin/vendors", label: "Supplier Directory" },
              {
                href: "/admin/supplier-quotes",
                label: "Supplier Quote Storage",
              },
              { href: "/admin/catalog", label: "Material Catalog" },
              { href: "/admin/quote-comparison", label: "Quote Comparison" },
            ]
          : []),
      ],
    },
    ...(access.aiTools
      ? [
          {
            title: "Manager Tools",
            icon: Sparkles,
            links: [
              { href: "/admin/ai-tools", label: "All Manager Tools" },
              ...(access.suppliers
                ? [{ href: "/admin/documents", label: "Documents" }]
                : []),
              {
                href: "/admin/ai-tools/jobsite-delivery",
                label: "Jobsite Delivery",
              },
              ...(access.owner
                ? [{ href: "/admin/abc", label: "ABC Private Pricing" }]
                : []),
            ],
          },
        ]
      : []),
    ...(access.traffic
      ? [
          {
            title: "Website Traffic",
            icon: BarChart3,
            links: [{ href: "/admin/traffic", label: "Open Website Traffic" }],
          },
        ]
      : []),
    ...(access.owner
      ? [
          {
            title: "Payments",
            icon: CreditCard,
            links: [{ href: "/admin/payments", label: "Payment Center" }],
          },
        ]
      : []),
  ].filter((section) => section.links.length > 0);

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">Dashboard</h1>
        </header>

        <section
          aria-label="Today workspace"
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          <ManagerDashboardAiSearch initialHistory={dashboardHistory} enabled />
          <ManagerTodayTasks tasks={todayTasks} />
          <Link
            href="/admin/daily-summary"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm"
          >
            <CalendarDays className="h-4 w-4 text-[#0071e3]" />
            Daily summary
          </Link>
          <EmployeeClockStatus
            compact
            checkInAt={todaySummary?.checkInAt ?? null}
            checkOutAt={todaySummary?.checkOutAt ?? null}
          />
        </section>

        {!pipelineAvailable ? (
          <p
            role="alert"
            className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
          >
            Some request counts could not load. Refresh before using the
            pipeline totals.
          </p>
        ) : null}

        <section aria-labelledby="pipeline-heading" className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="pipeline-heading" className="text-xl font-semibold">
                Orders &amp; Requests
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Open work only. Completed and cancelled requests are excluded.
              </p>
            </div>
            {selectedStage ? (
              <Link
                href="/admin/build-map#open-requests"
                className="text-xs font-semibold text-[#0066cc]"
              >
                Show all
              </Link>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {pipelineStages.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={`/admin/build-map?stage=${item.id}#open-requests`}
                  className="flex min-h-24 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${pipelineTone[item.id]}`}
                    title={item.symbolLabel}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-2xl font-semibold tabular-nums text-slate-950">
                      {stageCounts.get(item.id) ?? 0}
                    </span>
                    <h3 className="mt-0.5 text-xs font-semibold leading-4">
                      {item.label}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section
          id="open-requests"
          className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="font-semibold">
                {selectedStage
                  ? pipelineStages.find((item) => item.id === selectedStage)
                      ?.label
                  : "Requests needing work"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Most recently updated first
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-slate-500">
              {selectedStage ? stageCounts.get(selectedStage) : requests.length}
            </span>
          </header>
          {visibleRequests.length ? (
            <div>
              {visibleRequests.map(({ request, stage: requestStage }) => {
                const client = clientMap.get(request.owner_id);
                const stageInfo = pipelineStages.find(
                  (item) => item.id === requestStage,
                )!;
                const StatusIcon = stageInfo.icon;
                return (
                  <Link
                    key={request.id}
                    href={`/owner/materials/requests/${request.id}`}
                    className="group flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${pipelineTone[requestStage]}`}
                      title={stageInfo.symbolLabel}
                    >
                      <StatusIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {request.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {client?.full_name || client?.email || "Client"} ·{" "}
                        {stageInfo.label}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
                      {formatUpdated(request.updated_at)}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No open requests in this stage.
            </p>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 id="targets-heading" className="font-semibold">
              Task To Do
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Phone instructions, tasks, and Carlos&apos;s work areas
            </p>
          </header>
          <GoalDisclosure
            assignee="carlos"
            priorityCount={access.owner ? 5 : 4}
            goals={regularGoals.filter((goal) => goal.assignee === "carlos")}
          >
            <CarlosGoalsWorkspace embedded />
          </GoalDisclosure>
        </section>

        <details className="group mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4">
            <Store className="h-4 w-4 text-[#0066cc]" />
            <span className="min-w-0 flex-1">
              <strong id="manager-tools-heading" className="block text-sm">
                Manager tools
              </strong>
              <span className="block truncate text-xs text-slate-500">
                Directories, suppliers, AI tools, payments, and notifications
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-slate-200">
            <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {managerSections.map((section) => {
                const Icon = section.icon;
                return (
                  <section
                    key={section.title}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                  >
                    <header className="flex items-center gap-3 border-b border-slate-100 px-3 py-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-[#0066cc]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <h3 className="text-sm font-semibold">{section.title}</h3>
                    </header>
                    <div>
                      {section.links.map((item) => {
                        const external = item.href.startsWith("https://");
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            target={external ? "_blank" : undefined}
                            rel={external ? "noopener noreferrer" : undefined}
                            className="group flex min-h-11 items-center justify-between gap-3 border-b border-slate-100 px-3 text-sm font-semibold text-slate-700 last:border-b-0 hover:bg-slate-50 hover:text-[#0066cc]"
                          >
                            <span>{item.label}</span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" />
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
            <section
              id="phone-notifications"
              aria-labelledby="phone-notifications-heading"
              className="border-t border-slate-200 bg-slate-50/60"
            >
              <header className="px-4 pt-4">
                <h2
                  id="phone-notifications-heading"
                  className="text-sm font-semibold"
                >
                  Phone notifications
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage alerts for new requests, messages, supplier quotes, and
                  payments.
                </p>
              </header>
              <ManagerNotificationControl settings />
            </section>
          </div>
        </details>
      </div>
    </main>
  );
}
