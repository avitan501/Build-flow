import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  FileQuestion,
  FolderKanban,
  ListChecks,
  MailCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";

import { requireAdminProfile } from "@/lib/auth";
import {
  applyDepartmentAddOns,
  createEmptyManagerAddOns,
  type ManagerCatalogAddOns,
} from "@/lib/manager-add-ons";
import {
  createEmptyQualificationSettings,
  defaultQualificationSettingForServiceTarget,
  SERVICE_ASSIGNMENT_TARGETS,
  type ShopQualificationSettings,
  type SupplierRoutingOption,
} from "@/lib/shop-qualification";
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools";

type RequestRow = {
  id: string;
  owner_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  projects: { name: string; address: string | null } | null;
  material_questionnaire_responses: Array<{
    id: string;
    category_name_snapshot: string;
    status: string;
  }> | null;
};

type ProfileRow = { id: string; full_name: string | null; email: string | null };
type RequestItemRow = { request_id: string; department: string };
type AttachmentRow = { request_id: string };
type SupplierPackageRow = {
  id: string;
  request_id: string;
  department: string;
  supplier_id: string | null;
  status: string;
  updated_at: string;
};
type QuestionnaireCategoryRow = {
  id: string;
  name: string;
  department_key: string;
  is_active: boolean;
  material_questions: Array<{ id: string; is_active: boolean }>;
};
type ManagerState = {
  qualificationSettings?: ShopQualificationSettings;
  addOns?: ManagerCatalogAddOns;
};

const closedStatuses = new Set(["completed", "closed", "cancelled"]);

const requestStatusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Under review",
  in_review: "Waiting for client",
  under_review: "Under review",
  waiting_for_client: "Waiting for client",
  quoted: "Client approval",
  approved: "Approved",
  completed: "Completed",
  closed: "Closed",
  cancelled: "Cancelled",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function requestStatusClass(status: string) {
  if (["completed", "closed", "approved"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["waiting_for_client", "in_review", "quoted"].includes(status)) return "border-sky-200 bg-sky-50 text-sky-800";
  if (["submitted", "under_review"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function supplierHasDeliveryContact(supplier: SupplierRoutingOption | undefined) {
  if (!supplier?.preferredDeliveryMethod || supplier.preferredDeliveryMethod === "manual") return false;
  if (supplier.preferredDeliveryMethod === "email") return Boolean(supplier.email?.trim());
  if (supplier.preferredDeliveryMethod === "whatsapp") return Boolean(supplier.whatsapp?.trim());
  if (["phone", "sms"].includes(supplier.preferredDeliveryMethod)) return Boolean(supplier.phone?.trim());
  if (supplier.preferredDeliveryMethod === "portal") return Boolean(supplier.portalUrl?.trim());
  return false;
}

function nextAction(request: RequestRow, packages: SupplierPackageRow[]) {
  const failed = packages.find((pkg) => pkg.status === "failed");
  if (failed) return { label: "Fix supplier delivery", href: `/admin/supplier-approvals/${failed.id}`, tone: "rose" };

  const pending = packages.find((pkg) => pkg.status === "pending_approval");
  if (pending) return { label: "Review supplier request", href: `/admin/supplier-approvals/${pending.id}`, tone: "amber" };

  const approved = packages.find((pkg) => pkg.status === "approved");
  if (approved) return { label: "Send to supplier", href: `/admin/supplier-approvals/${approved.id}`, tone: "emerald" };

  if (["waiting_for_client", "in_review", "quoted"].includes(request.status)) {
    return { label: "Follow up with client", href: `/owner/materials/requests/${request.id}`, tone: "sky" };
  }

  if (closedStatuses.has(request.status)) {
    return { label: "View completed request", href: `/owner/materials/requests/${request.id}`, tone: "slate" };
  }

  const incompleteQuestionnaire = (request.material_questionnaire_responses ?? []).some((response) => response.status !== "complete");
  return {
    label: incompleteQuestionnaire ? "Review missing answers" : "Prepare supplier request",
    href: `/owner/materials/requests/${request.id}`,
    tone: incompleteQuestionnaire ? "amber" : "sky",
  };
}

function actionClass(tone: string) {
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "sky") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default async function AdminBuildMapPage() {
  const { supabase } = await requireAdminProfile();

  const [requestsResult, projectsResult, customersResult, managerStateResult, packagesResult, questionnaireResult] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("id,owner_id,title,status,created_at,updated_at,projects(name,address),material_questionnaire_responses(id,category_name_snapshot,status)", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(100)
      .returns<RequestRow[]>(),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("workflow_manager_settings").select("state").eq("id", "singleton").maybeSingle<{ state: ManagerState }>(),
    supabase
      .from("supplier_packages")
      .select("id,request_id,department,supplier_id,status,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200)
      .returns<SupplierPackageRow[]>(),
    supabase
      .from("material_questionnaire_categories")
      .select("id,name,department_key,is_active,material_questions(id,is_active)")
      .order("sort_order")
      .returns<QuestionnaireCategoryRow[]>(),
  ]);

  const requests = requestsResult.data ?? [];
  const requestIds = requests.map((request) => request.id);
  const ownerIds = [...new Set(requests.map((request) => request.owner_id))];

  const [profilesResult, itemsResult, attachmentsResult] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id,full_name,email").in("id", ownerIds).returns<ProfileRow[]>()
      : Promise.resolve({ data: [] as ProfileRow[] }),
    requestIds.length
      ? supabase.from("quote_request_items").select("request_id,department").in("request_id", requestIds).returns<RequestItemRow[]>()
      : Promise.resolve({ data: [] as RequestItemRow[] }),
    requestIds.length
      ? supabase.from("quote_request_attachments").select("request_id").in("request_id", requestIds).returns<AttachmentRow[]>()
      : Promise.resolve({ data: [] as AttachmentRow[] }),
  ]);

  const managerState = managerStateResult.data?.state;
  const qualificationSettings = managerState?.qualificationSettings ?? createEmptyQualificationSettings();
  const addOns = managerState?.addOns ?? createEmptyManagerAddOns();
  const suppliers = qualificationSettings.suppliers;
  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const packages = packagesResult.data ?? [];
  const questionnaires = questionnaireResult.data ?? [];

  const packagesByRequest = new Map<string, SupplierPackageRow[]>();
  const departmentsByRequest = new Map<string, Set<string>>();
  const itemCountByRequest = new Map<string, number>();
  const fileCountByRequest = new Map<string, number>();
  for (const pkg of packages) {
    packagesByRequest.set(pkg.request_id, [...(packagesByRequest.get(pkg.request_id) ?? []), pkg]);
    if (pkg.department) {
      const departments = departmentsByRequest.get(pkg.request_id) ?? new Set<string>();
      departments.add(pkg.department);
      departmentsByRequest.set(pkg.request_id, departments);
    }
  }
  for (const item of itemsResult.data ?? []) {
    itemCountByRequest.set(item.request_id, (itemCountByRequest.get(item.request_id) ?? 0) + 1);
    const departments = departmentsByRequest.get(item.request_id) ?? new Set<string>();
    if (item.department) departments.add(item.department);
    departmentsByRequest.set(item.request_id, departments);
  }
  for (const attachment of attachmentsResult.data ?? []) {
    fileCountByRequest.set(attachment.request_id, (fileCountByRequest.get(attachment.request_id) ?? 0) + 1);
  }
  for (const request of requests) {
    const departments = departmentsByRequest.get(request.id) ?? new Set<string>();
    for (const response of request.material_questionnaire_responses ?? []) departments.add(response.category_name_snapshot);
    departmentsByRequest.set(request.id, departments);
  }

  const visibleDepartments = applyDepartmentAddOns(SHOP_TOOL_CATEGORIES, addOns);
  const readinessRows = visibleDepartments.map((department) => {
    const sourceDepartment = SHOP_TOOL_CATEGORIES.find((category) => category.slug === department.slug)?.label ?? department.label;
    const questionnaire = questionnaires.find((category) => category.department_key === sourceDepartment || category.department_key === department.label);
    const activeQuestions = (questionnaire?.material_questions ?? []).filter((question) => question.is_active).length;
    const builtInTargets = SERVICE_ASSIGNMENT_TARGETS.filter((target) => target.departmentLabel === sourceDepartment);
    const managerTargets = addOns.services.filter((service) => service.category === sourceDepartment || service.category === department.label);
    const supplierIds = [
      ...builtInTargets.map((target) => qualificationSettings.products[target.id]?.supplierId || defaultQualificationSettingForServiceTarget(target).supplierId),
      ...managerTargets.map((target) => qualificationSettings.products[target.id]?.supplierId || target.supplierId),
    ].filter(Boolean);
    const assignedSuppliers = supplierIds.map((id) => supplierMap.get(id)).filter((supplier): supplier is SupplierRoutingOption => Boolean(supplier));
    const checks = {
      photo: Boolean(department.imageUrl && !department.imageUrl.endsWith(".svg")),
      quickOrder: Boolean(questionnaire?.is_active),
      questions: activeQuestions > 0,
      supplier: assignedSuppliers.length > 0,
      delivery: assignedSuppliers.some(supplierHasDeliveryContact),
    };
    const ready = Object.values(checks).every(Boolean);
    const missing = [
      !checks.photo ? "photo" : null,
      !checks.quickOrder ? "Quick Order" : null,
      !checks.questions ? "questions" : null,
      !checks.supplier ? "supplier" : null,
      !checks.delivery ? "delivery method" : null,
    ].filter(Boolean);
    return { department, checks, ready, missing, activeQuestions, assignedSuppliers };
  });

  const openRequests = requests.filter((request) => !closedStatuses.has(request.status));
  const pendingPackages = packages.filter((pkg) => pkg.status === "pending_approval").length;
  const failedPackages = packages.filter((pkg) => pkg.status === "failed").length;
  const readyDepartments = readinessRows.filter((row) => row.ready).length;

  const metrics = [
    { label: "Open requests", value: openRequests.length, detail: "Customer work requiring attention", icon: ClipboardList, href: "/admin/users?view=requests" },
    { label: "Supplier review", value: pendingPackages, detail: "Packages waiting for approval", icon: ClipboardCheck, href: "/admin/supplier-approvals?view=pending" },
    { label: "Delivery problems", value: failedPackages, detail: "Supplier messages that failed", icon: AlertCircle, href: "/admin/supplier-approvals?view=all" },
    { label: "Ready departments", value: `${readyDepartments}/${readinessRows.length}`, detail: "Customer-ready department workflows", icon: CheckCircle2, href: "/admin/settings/material-order-questions" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-16 pt-6 text-slate-950 sm:px-8 sm:pb-12">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Request Center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">See what needs attention, move each request forward, and keep every department ready for customers.</p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Manager overview">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link key={metric.label} href={metric.href} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs font-semibold text-slate-600 sm:text-sm">{metric.label}</p><p className="mt-2 text-2xl font-bold sm:text-3xl">{metric.value}</p></div>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white"><Icon className="h-4 w-4" /></span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{metric.detail}</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="request-center-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div><h2 id="request-center-heading" className="text-lg font-bold">Requests needing attention</h2><p className="mt-1 text-xs text-slate-500">Customer, project, department, supplier, status, and next action.</p></div>
            <Link href="/admin/users?view=requests" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#0066cc]">All requests <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {openRequests.length ? (
            <div className="divide-y divide-slate-100">
              {openRequests.slice(0, 12).map((request) => {
                const profile = profiles.get(request.owner_id);
                const requestPackages = packagesByRequest.get(request.id) ?? [];
                const action = nextAction(request, requestPackages);
                const departments = [...(departmentsByRequest.get(request.id) ?? [])];
                const assignedSupplierNames = [...new Set(requestPackages.map((pkg) => pkg.supplier_id ? supplierMap.get(pkg.supplier_id)?.name : null).filter(Boolean))];
                return (
                  <article key={request.id} className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(12rem,.7fr)_minmax(12rem,.7fr)] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{request.title}</h3><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${requestStatusClass(request.status)}`}>{requestStatusLabels[request.status] ?? request.status.replaceAll("_", " ")}</span></div>
                      <p className="mt-1 text-sm text-slate-600">{profile?.full_name?.trim() || profile?.email || "Customer"}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{request.projects?.name || "Project"}{request.projects?.address ? ` · ${request.projects.address}` : ""} · Updated {formatDate(request.updated_at)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">{departments.length ? departments.map((department) => <span key={department} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{department}</span>) : <span className="text-xs text-slate-400">Department not identified</span>}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1">
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Supplier</p><p className="mt-1 font-semibold text-slate-800">{assignedSupplierNames.join(", ") || "Not assigned"}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Contents</p><p className="mt-1 font-semibold text-slate-800">{itemCountByRequest.get(request.id) ?? 0} items · {fileCountByRequest.get(request.id) ?? 0} files</p></div>
                    </div>
                    <Link href={action.href} className={`inline-flex min-h-11 items-center justify-between gap-3 rounded-lg border px-4 text-sm font-semibold ${actionClass(action.tone)}`}>{action.label}<ArrowRight className="h-4 w-4 shrink-0" /></Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-semibold">No open customer requests.</p><p className="mt-1 text-sm text-slate-500">New submissions will appear here.</p></div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="readiness-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div><h2 id="readiness-heading" className="text-lg font-bold">Department readiness</h2><p className="mt-1 text-xs text-slate-500">Every customer-facing workflow checked in one place.</p></div>
            <Link href="/admin/settings/material-order-questions" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#0066cc]">Manage departments <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="divide-y divide-slate-100">
            {readinessRows.map((row) => (
              <article key={row.department.slug} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(12rem,.7fr)_minmax(0,1.6fr)_auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${row.ready ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"}`}>{row.ready ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}</span>
                  <div><h3 className="font-bold">{row.department.label}</h3><p className={`mt-0.5 text-xs font-semibold ${row.ready ? "text-emerald-700" : "text-amber-800"}`}>{row.ready ? "Ready for customers" : `Missing: ${row.missing.join(", ")}`}</p></div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <CheckItem ok={row.checks.photo} label="Photo" />
                  <CheckItem ok={row.checks.quickOrder} label="Quick Order" />
                  <CheckItem ok={row.checks.questions} label={`${row.activeQuestions} questions`} />
                  <CheckItem ok={row.checks.supplier} label="Supplier" />
                  <CheckItem ok={row.checks.delivery} label="Delivery" />
                </div>
                <div className="flex gap-2">
                  <Link href="/admin/settings/material-order-questions" aria-label={`Manage ${row.department.label} questions`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700" title="Questions"><FileQuestion className="h-4 w-4" /></Link>
                  <Link href="/admin/vendors" aria-label={`Manage ${row.department.label} supplier`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700" title="Supplier"><Store className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Manager directories">
          <Link href="/admin/users?view=customers" className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><Users className="h-5 w-5 text-[#0066cc]" /><div><p className="font-bold">{customersResult.count ?? 0} customers</p><p className="text-xs text-slate-500">Customer directory</p></div></Link>
          <Link href="/admin/projects" className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><FolderKanban className="h-5 w-5 text-[#0066cc]" /><div><p className="font-bold">{projectsResult.count ?? 0} projects</p><p className="text-xs text-slate-500">Project activity</p></div></Link>
          <Link href="/admin/vendors" className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><Building2 className="h-5 w-5 text-[#0066cc]" /><div><p className="font-bold">{suppliers.length} suppliers</p><p className="text-xs text-slate-500">Supplier directory</p></div></Link>
        </section>

        {questionnaireResult.error ? <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ListChecks className="mt-0.5 h-4 w-4 shrink-0" />Questionnaire readiness could not be loaded. Open Departments & Questions to check the database setup.</div> : null}
        {requestsResult.error || packagesResult.error ? <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800"><MailCheck className="mt-0.5 h-4 w-4 shrink-0" />Some request or supplier delivery data could not be loaded. Open the related directory for details.</div> : null}
      </div>
    </main>
  );
}
