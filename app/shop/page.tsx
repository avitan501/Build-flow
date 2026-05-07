import Link from "next/link";

import { ShopSearchPanel } from "@/components/buildflow/shop-search-panel";
import { getSessionWithProfile } from "@/lib/auth";
import type { ProjectMaterialRecord, ProjectRecord } from "@/lib/projects";

export default async function ShopPage() {
  const { supabase, user } = await getSessionWithProfile();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#eef3f9] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
        <section className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BuildFlow Shop</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Materials Shop</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">Log in to search the materials BuildFlow currently has in your workflow.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0e2341] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#13315a]">Log in</Link>
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white">Create Account</Link>
          </div>
        </section>
      </main>
    );
  }

  const [{ data: materialsData, error: materialsError }, { data: projectsData, error: projectsError }] = await Promise.all([
    supabase
      .from("project_materials")
      .select("id, project_id, owner_id, upload_id, name, category, quantity, unit, status, notes, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<ProjectMaterialRecord[]>(),
    supabase
      .from("projects")
      .select("id, owner_id, name, address, status, created_at, updated_at")
      .eq("owner_id", user.id)
      .returns<ProjectRecord[]>(),
  ]);

  if (materialsError) {
    throw new Error("Failed to load shop materials.");
  }

  if (projectsError) {
    throw new Error("Failed to load shop projects.");
  }

  const projectMap = new Map((projectsData ?? []).map((project) => [project.id, project]));
  const items = (materialsData ?? []).map((material) => {
    const project = projectMap.get(material.project_id);
    return {
      id: material.id,
      name: material.name,
      category: material.category,
      status: material.status,
      projectId: material.project_id,
      projectName: project?.name || "Project",
      projectAddress: project?.address || null,
    };
  });

  return (
    <main className="min-h-screen bg-[#eef3f9] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <section className="mx-auto max-w-4xl">
        <ShopSearchPanel items={items} />
      </section>
    </main>
  );
}
