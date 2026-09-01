import {
  ArrowRight,
  BadgeDollarSign,
  ChevronDown,
  ClipboardList,
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
  DAILY_WORK_SUMMARY_PREFIX,
  parseDailyWorkSummary,
} from "@/lib/daily-work-summary";
import { requireManagerPortalProfile } from "@/lib/auth";
import {
  DASHBOARD_AI_HISTORY_PREFIX,
  parseDashboardAiHistory,
} from "@/lib/manager-command-center";
import {
  managerPipelineStage,
  type ManagerPipelineStage,
} from "@/lib/manager-dashboard";

const QUO_INBOX_URL =
  "https://my.quo.com/inbox/PN7lAbkMJw/c/CN30389c1bd6c542e78fbcec10a4e91602";
const WHATSAPP_URL = "https://web.whatsapp.com/";
const CARLOS_MEETING_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Avantia%20Build%20meeting%20with%20Carlos&details=Avantia%20Build%20manager%20meeting&add=buildavantiap%40gmail.com";

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

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; section?: string }>;
}) {
  const { stage = "", section = "" } = await searchParams;
  const selectedStage = pipelineStages.some((item) => item.id === stage)
    ? (stage as ManagerPipelineStage)
    : null;
  const { supabase, access } = await requireManagerPortalProfile();
  let goalsQuery = supabase
    .from("manager_goals")
    .select("id,assignee,title,details,status,is_focus,created_at,updated_at")
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
              ...(access.owner
                ? [
                    {
                      href: "/admin/goals-progress/website-work",
                      label: "David Dashboard",
                    },
                    { href: "/admin/payments", label: "Payment Center" },
                  ]
                : []),
              { href: CARLOS_MEETING_URL, label: "Google Meet" },
              {
                href: "/admin/ai-tools/media-messages",
                label: "Media & Messages",
              },
              ...(access.traffic
                ? [{ href: "/admin/traffic", label: "Website Traffic" }]
                : []),
              ...(access.suppliers
                ? [{ href: "/admin/documents", label: "Documents" }]
                : []),
              ...(access.owner
                ? [{ href: "/admin/abc", label: "ABC Private Pricing" }]
                : []),
            ],
          },
        ]
      : []),
  ].filter((section) => section.links.length > 0);

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-slate-200 pb-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">Dashboard</h1>
          <EmployeeClockStatus
            compact
            checkInAt={todaySummary?.checkInAt ?? null}
            checkOutAt={todaySummary?.checkOutAt ?? null}
          />
          <ManagerDashboardAiSearch initialHistory={dashboardHistory} enabled compact />
        </header>

        {!pipelineAvailable ? (
          <p
            role="alert"
            className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
          >
            Some request counts could not load. Refresh before using the
            pipeline totals.
          </p>
        ) : null}

        <section aria-labelledby="pipeline-heading" className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id="pipeline-heading" className="text-xl font-semibold">
                  Orders &amp; Requests
                </h2>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <strong className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-900 tabular-nums">
                    {selectedStage
                      ? stageCounts.get(selectedStage)
                      : requests.length}
                  </strong>
                  {selectedStage
                    ? pipelineStages.find((item) => item.id === selectedStage)
                        ?.label
                    : "Requests needing work"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Most recently updated first
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
          <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 lg:grid-cols-4">
            {pipelineStages.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={`/admin/build-map?stage=${item.id}#open-requests`}
                  className="flex min-h-20 items-center gap-3 bg-white p-3 transition hover:bg-slate-50"
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
          <div id="open-requests" className="border-t border-slate-200">
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
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <h2 id="targets-heading" className="font-semibold">Carlos Dashboard</h2>
          </header>
          <CarlosGoalsWorkspace embedded />
        </section>

        <details
          id="manager-tools"
          open={section === "manager-tools"}
          className="group mt-4 scroll-mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
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
            <div className="grid items-start gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
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
                      {section.title === "Manager Tools" ? (
                        <ManagerNotificationControl settings />
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
