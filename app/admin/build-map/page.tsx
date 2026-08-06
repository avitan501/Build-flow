import Link from "next/link";
import { Building2, ClipboardList, FolderKanban, Store, Users } from "lucide-react";

import { requireAdminProfile } from "@/lib/auth";

type RecentRequest = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
};

type ManagerState = {
  qualificationSettings?: {
    suppliers?: Array<{ id: string; name: string }>;
  };
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  waiting_for_client: "Waiting for client",
  approved: "Approved",
  completed: "Completed",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminBuildMapPage() {
  const { supabase } = await requireAdminProfile();

  const [requestsResult, projectsResult, customersResult, managerStateResult] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("id, title, status, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(6)
      .returns<RecentRequest[]>(),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{ state: ManagerState }>(),
  ]);

  const recentRequests = requestsResult.data ?? [];
  const supplierCount = managerStateResult.data?.state?.qualificationSettings?.suppliers?.length ?? 0;
  const submittedCount = recentRequests.filter((request) => request.status !== "draft" && request.status !== "completed").length;

  const metrics = [
    { label: "Requests", value: requestsResult.count ?? 0, detail: `${submittedCount} recent requests need attention`, icon: ClipboardList, href: "/owner/materials/requests" },
    { label: "Projects", value: projectsResult.count ?? 0, detail: "Customer projects and request activity", icon: FolderKanban, href: "/admin/projects" },
    { label: "Customers", value: customersResult.count ?? 0, detail: "Registered customer accounts", icon: Users, href: "/admin/users" },
    { label: "Suppliers", value: supplierCount, detail: "Supplier contacts and department routing", icon: Store, href: "/admin/vendors" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A live overview of customer requests, projects, accounts, and supplier routing.</p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Manager overview">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link key={metric.label} href={metric.href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">{metric.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{metric.value}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white"><Icon className="h-5 w-5" /></span>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">{metric.detail}</p>
              </Link>
            );
          })}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">Recent requests</h2>
                <p className="mt-1 text-xs text-slate-500">Latest customer material and service requests.</p>
              </div>
              <Link href="/owner/materials/requests" className="text-sm font-semibold text-[#0066cc]">View all</Link>
            </div>
            {recentRequests.length ? (
              <div className="divide-y divide-slate-100">
                {recentRequests.map((request) => (
                  <Link key={request.id} href={`/owner/materials/requests/${request.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{request.title}</p>
                      <p className="mt-1 text-xs text-slate-500">Updated {formatDate(request.updated_at)}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {statusLabels[request.status] ?? request.status.replaceAll("_", " ")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">No customer requests yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaf3ff] text-[#0066cc]"><Building2 className="h-5 w-5" /></span>
              <div>
                <h2 className="text-lg font-bold">Manager tools</h2>
                <p className="text-xs text-slate-500">Open the area you want to manage.</p>
              </div>
            </div>
            <nav className="mt-5 grid gap-2" aria-label="Manager tools">
              <Link href="/admin/settings/material-order-questions" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-sky-300 hover:bg-sky-50">Departments & questions</Link>
              <Link href="/admin/users" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-sky-300 hover:bg-sky-50">Customers & requests</Link>
              <Link href="/admin/vendors" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-sky-300 hover:bg-sky-50">Suppliers</Link>
              <Link href="/owner/materials" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold hover:border-sky-300 hover:bg-sky-50">Catalog & subcategories</Link>
            </nav>
          </section>
        </div>
      </div>
    </main>
  );
}
