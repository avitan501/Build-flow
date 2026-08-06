import { ProjectWorkflowManager } from "@/components/buildflow/project-workflow-manager";
import { SupplierRoutingManager } from "@/components/buildflow/supplier-routing-manager";
import { requireAdminProfile } from "@/lib/auth";
import { buildShopProducts } from "@/lib/shop-catalog";
import { loadShopItems } from "@/lib/shop-loader";
import type { ManagerCatalogAddOns } from "@/lib/manager-add-ons";
import type { ProjectQuestionRecord } from "@/lib/quote-requests";
import type { ShopQualificationSettings } from "@/lib/shop-qualification";

export default async function AdminVendorsPage() {
  const { supabase } = await requireAdminProfile();
  const { data, error } = await loadShopItems({ limit: 240 });
  const products = buildShopProducts(data, error);

  const [
    { data: questions },
    { data: packageRows },
    { data: managerStateRow },
    { data: projects },
    { data: requestRows },
  ] = await Promise.all([
    supabase
      .from("project_questions")
      .select("id, label, question_type, required, options, active, sort_order")
      .order("sort_order")
      .returns<ProjectQuestionRecord[]>(),
    supabase
      .from("supplier_packages")
      .select("id, request_id, department, supplier_id, status, created_at, quote_requests(title, project_id, projects(name))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("workflow_manager_settings")
      .select("state")
      .eq("id", "singleton")
      .maybeSingle<{ state: { qualificationSettings?: ShopQualificationSettings; addOns?: ManagerCatalogAddOns } }>(),
    supabase.from("projects").select("id, name, address, status, updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase
      .from("quote_requests")
      .select("id, project_id, title, status, updated_at, projects(name)")
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

  const packages = (packageRows ?? []).map((row) => {
    const request = Array.isArray(row.quote_requests) ? row.quote_requests[0] : row.quote_requests;
    const projectValue = request && "projects" in request ? request.projects : null;
    const project = Array.isArray(projectValue) ? projectValue[0] : projectValue;

    return {
      id: row.id,
      request_id: row.request_id,
      department: row.department,
      supplier_id: row.supplier_id,
      status: row.status,
      created_at: row.created_at,
      requestTitle: request?.title ?? "Quote Request",
      projectName: project?.name ?? "Project",
    };
  });

  const requests = (requestRows ?? []).map((row) => {
    const projectValue = Array.isArray(row.projects) ? row.projects[0] : row.projects;

    return {
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      status: row.status,
      updated_at: row.updated_at,
      projectName: projectValue?.name ?? "Project",
    };
  });

  return (
    <main className="min-h-screen bg-[#f5f5f7] pb-28 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Avantia Build</p>
          <h1 className="mt-1 text-3xl font-semibold">Manager</h1>
          <nav className="mt-4 flex flex-wrap gap-2">
            <a href="#project-workflow" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Projects & Approvals
            </a>
            <a href="#catalog-routing" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Departments & Suppliers
            </a>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-8">
        <ProjectWorkflowManager
          questions={questions ?? []}
          packages={packages}
          projects={(projects ?? []) as Array<{
            id: string;
            name: string;
            address: string | null;
            status: "draft" | "active" | "archived";
            updated_at: string;
          }>}
          requests={requests}
        />
        <section id="catalog-routing">
          <SupplierRoutingManager
            catalogProducts={products}
            initialSettings={managerStateRow?.state?.qualificationSettings ?? null}
            initialAddOns={managerStateRow?.state?.addOns ?? null}
          />
        </section>
      </div>
    </main>
  );
}
