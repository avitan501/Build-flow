import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Columns3,
  MessageCircle,
  PackageCheck,
  PackageOpen,
  PhoneCall,
  Send,
  ShoppingCart,
  Store,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AddManagerGoal, CustomManagerGoals, type ManagerGoalRecord } from "@/components/buildflow/manager-goals";
import { DAILY_WORK_SUMMARY_PREFIX } from "@/lib/daily-work-summary";
import { requireManagerPortalProfile } from "@/lib/auth";
import { managerPipelineStage, type ManagerPipelineStage } from "@/lib/manager-dashboard";

const QUO_INBOX_URL = "https://my.quo.com/inbox/PN7lAbkMJw/c/CN30389c1bd6c542e78fbcec10a4e91602";
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

type LeadRow = { id: string; status: string };

const pipelineStages: Array<{
  id: ManagerPipelineStage;
  label: string;
  description: string;
  icon: typeof ClipboardList;
  tone: string;
  numberTone: string;
}> = [
  {
    id: "received",
    label: "Received / needs shopping",
    description: "New client requests that still need supplier pricing.",
    icon: ClipboardList,
    tone: "border-amber-200 bg-amber-50",
    numberTone: "text-amber-900",
  },
  {
    id: "pricing",
    label: "Priced / not sent",
    description: "Supplier pricing received, but no client quote was sent.",
    icon: ShoppingCart,
    tone: "border-sky-200 bg-sky-50",
    numberTone: "text-sky-900",
  },
  {
    id: "approval",
    label: "Waiting for client",
    description: "Client quote sent and waiting for approval.",
    icon: Clock3,
    tone: "border-violet-200 bg-violet-50",
    numberTone: "text-violet-900",
  },
  {
    id: "delivery",
    label: "Approved / delivery",
    description: "Client approved; order or delivery still needs completion.",
    icon: PackageCheck,
    tone: "border-emerald-200 bg-emerald-50",
    numberTone: "text-emerald-900",
  },
];

const closedRequestStatuses = new Set(["completed", "closed", "cancelled"]);

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function FixedTarget({ title, detail, href, icon: Icon }: { title: string; detail: string; href: string; icon: typeof Target }) {
  return <Link href={href} className="group flex min-h-16 items-center gap-3 border-b border-slate-100 px-1 py-3 last:border-b-0">
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-950">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span></span>
    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
  </Link>;
}

function PersonGoals({ assignee, goals, children }: { assignee: "carlos" | "david"; goals: ManagerGoalRecord[]; children: React.ReactNode }) {
  const name = assignee === "carlos" ? "Carlos" : "David";
  return <section className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white"><UserRound className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">{name}</h2><p className="text-xs text-slate-500">{goals.filter((goal) => goal.status === "open").length} custom goals open</p></div></div>
      <AddManagerGoal assignee={assignee} />
    </header>
    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 shadow-sm">{children}</div>
    <CustomManagerGoals goals={goals} />
  </section>;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage = "" } = await searchParams;
  const selectedStage = pipelineStages.some((item) => item.id === stage) ? stage as ManagerPipelineStage : null;
  const { supabase, access } = await requireManagerPortalProfile();

  const [requestsResult, comparisonsResult, packagesResult, goalsResult, leadsResult, clientsResult] = await Promise.all([
    supabase.from("quote_requests").select("id,owner_id,title,status,updated_at").order("updated_at", { ascending: false }).limit(250).returns<RequestRow[]>(),
    supabase.from("quote_comparisons").select("id,request_id,status,client_quote_status,updated_at").order("updated_at", { ascending: false }).limit(500).returns<ComparisonRow[]>(),
    supabase.from("supplier_packages").select("request_id,status").order("updated_at", { ascending: false }).limit(500).returns<SupplierPackageRow[]>(),
    supabase.from("manager_goals").select("id,assignee,title,details,status").order("status").order("created_at", { ascending: false }).returns<ManagerGoalRecord[]>(),
    supabase.from("manager_outreach_leads").select("id,status").returns<LeadRow[]>(),
    supabase.from("profiles").select("id,full_name,email").eq("role", "client").eq("is_active", true).order("created_at", { ascending: false }).limit(500).returns<ClientRow[]>(),
  ]);

  const requests = (requestsResult.data ?? []).filter((request) => request.status !== "draft" && !closedRequestStatuses.has(request.status));
  const comparisons = comparisonsResult.data ?? [];
  const packages = packagesResult.data ?? [];
  const clients = clientsResult.data ?? [];
  const clientMap = new Map(clients.map((client) => [client.id, client]));
  const stagedRequests = requests.map((request) => ({ request, stage: managerPipelineStage(request, comparisons, packages) }));
  const stageCounts = new Map<ManagerPipelineStage, number>(pipelineStages.map((item) => [item.id, stagedRequests.filter((entry) => entry.stage === item.id).length]));
  const visibleRequests = (selectedStage ? stagedRequests.filter((entry) => entry.stage === selectedStage) : stagedRequests).slice(0, 10);
  const pipelineAvailable = !requestsResult.error && !comparisonsResult.error && !packagesResult.error;

  const goals = goalsResult.data ?? [];
  const websiteNotes = goals.filter((goal) => goal.details?.startsWith(WEBSITE_FIX_NOTE_PREFIX));
  const regularGoals = goals.filter((goal) => !goal.details?.startsWith(WEBSITE_FIX_NOTE_PREFIX) && !goal.details?.startsWith(DAILY_WORK_SUMMARY_PREFIX));
  const openLeads = (leadsResult.data ?? []).filter((lead) => !["converted", "not_interested"].includes(lead.status)).length;

  const dailyLinks = [
    ...(access.customers ? [{ href: "/owner/materials/requests", label: "Client requests", detail: "Review and create requests", icon: ClipboardList }] : []),
    ...(access.customers ? [{ href: "/admin/users", label: "Customers", detail: "Clients and contact details", icon: Users }] : []),
    ...(access.suppliers ? [{ href: "/admin/vendors", label: "Suppliers", detail: "Directory and routing", icon: Store }] : []),
    ...(access.suppliers ? [{ href: "/admin/supplier-quotes", label: "Supplier quotes", detail: "Upload and extract pricing", icon: Archive }] : []),
    ...(access.suppliers ? [{ href: "/admin/quote-comparison", label: "Compare prices", detail: "Client list versus suppliers", icon: Columns3 }] : []),
    { href: "/admin/catalog", label: "Material catalog", detail: "Items and supplier prices", icon: PackageOpen },
    { href: "/admin/daily-summary", label: "Daily summary", detail: "Check in, check out, and report", icon: CalendarDays },
    { href: QUO_INBOX_URL, label: "Calls & messages", detail: "Open the company inbox", icon: PhoneCall },
    { href: WHATSAPP_URL, label: "WhatsApp", detail: "Open supplier and client chats", icon: MessageCircle },
  ];

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-9"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Manager Portal</p><h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Dashboard</h1><p className="mt-2 text-sm text-slate-600">Today&apos;s requests, targets, and tools in one place.</p></div><Link href="/admin/daily-summary" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"><CalendarDays className="h-4 w-4" />Daily summary</Link></header>

    {!pipelineAvailable ? <p role="alert" className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Some request counts could not load. Refresh before using the pipeline totals.</p> : null}

    <section aria-labelledby="pipeline-heading" className="mt-6"><div className="flex items-center justify-between gap-3"><div><h2 id="pipeline-heading" className="text-xl font-semibold">Request pipeline</h2><p className="mt-1 text-xs text-slate-500">Open work only. Completed and cancelled requests are excluded.</p></div>{selectedStage ? <Link href="/admin/build-map#open-requests" className="text-xs font-semibold text-[#0066cc]">Show all</Link> : null}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{pipelineStages.map((item) => { const Icon = item.icon; return <Link key={item.id} href={`/admin/build-map?stage=${item.id}#open-requests`} className={`flex min-h-36 flex-col justify-between rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}><div className="flex items-start justify-between gap-3"><Icon className="h-5 w-5 text-slate-700" /><span className={`text-4xl font-semibold tabular-nums sm:text-5xl ${item.numberTone}`}>{stageCounts.get(item.id) ?? 0}</span></div><div><h3 className="text-sm font-semibold leading-5">{item.label}</h3><p className="mt-1 hidden text-xs leading-5 text-slate-600 sm:block">{item.description}</p></div></Link>; })}</div>
    </section>

    <section id="open-requests" className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h2 className="font-semibold">{selectedStage ? pipelineStages.find((item) => item.id === selectedStage)?.label : "Requests needing work"}</h2><p className="mt-0.5 text-xs text-slate-500">Most recently updated first</p></div><span className="text-sm font-semibold tabular-nums text-slate-500">{selectedStage ? stageCounts.get(selectedStage) : requests.length}</span></header>
      {visibleRequests.length ? <div>{visibleRequests.map(({ request, stage: requestStage }) => { const client = clientMap.get(request.owner_id); const stageInfo = pipelineStages.find((item) => item.id === requestStage)!; return <Link key={request.id} href={`/owner/materials/requests/${request.id}`} className="group flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${requestStage === "received" ? "bg-amber-500" : requestStage === "pricing" ? "bg-sky-500" : requestStage === "approval" ? "bg-violet-500" : "bg-emerald-500"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{request.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{client?.full_name || client?.email || "Client"} · {stageInfo.label}</span></span><span className="hidden shrink-0 text-xs text-slate-400 sm:block">{formatUpdated(request.updated_at)}</span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" /></Link>; })}</div> : <p className="px-4 py-8 text-center text-sm text-slate-500">No open requests in this stage.</p>}
    </section>

    <section aria-labelledby="targets-heading" className="mt-8"><div className="border-b border-slate-200 pb-3"><h2 id="targets-heading" className="text-xl font-semibold">Goals &amp; targets</h2><p className="mt-1 text-xs text-slate-500">Carlos first, then David. Open each custom goal to complete or remove it.</p></div><div className="mt-5 grid gap-7">
      <PersonGoals assignee="carlos" goals={regularGoals.filter((goal) => goal.assignee === "carlos")}>
        <FixedTarget title="Client Target" detail={`${openLeads} open leads · ${clients.length} active clients`} href="/admin/goals-progress" icon={Users} />
        <FixedTarget title="Find suppliers' best-priced items" detail="Collect pricing and update the material catalog" href="/admin/catalog" icon={ShoppingCart} />
        <FixedTarget title="Supplier Affiliate Program" detail="Track applications and supplier opportunities" href="/admin/goals-progress" icon={Store} />
      </PersonGoals>
      <PersonGoals assignee="david" goals={regularGoals.filter((goal) => goal.assignee === "david")}>
        <FixedTarget title="Fix Website" detail={`${websiteNotes.filter((goal) => goal.status === "open").length} open website notes`} href="/admin/goals-progress" icon={CheckCircle2} />
        <FixedTarget title="Launch Beat Your Quote" detail="Campaign, flyer, and customer upload flow" href="/admin/goals-progress" icon={Send} />
      </PersonGoals>
    </div></section>

    <section aria-labelledby="daily-tools-heading" className="mt-8 border-t border-slate-200 pt-6"><div><h2 id="daily-tools-heading" className="text-xl font-semibold">Daily tools</h2><p className="mt-1 text-xs text-slate-500">The pages used to move requests, pricing, clients, and supplier work forward.</p></div><div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5">{dailyLinks.map((item) => { const Icon = item.icon; const external = item.href.startsWith("https://"); return <Link key={item.href} href={item.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="group flex min-h-24 flex-col justify-between bg-white p-4 hover:bg-slate-50"><Icon className="h-5 w-5 text-[#0066cc]" /><span className="mt-3"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 hidden text-xs leading-5 text-slate-500 sm:block">{item.detail}</span></span></Link>; })}</div></section>
  </div></main>;
}
