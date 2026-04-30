import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientWireframePage } from "@/components/buildflow/client-wireframe-page";
import { statusButtonClass } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
import type { ProjectRecord } from "@/lib/projects";

function formatProjectStatus(status: ProjectRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

type UploadPageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const projectId = resolvedSearchParams?.projectId?.trim();

  if (!projectId) {
    await requireSignedInProfile();
    return <ClientWireframePage pageKey="upload" audienceLabel="Signed-in client" modeLabel="Protected client preview" />;
  }

  const { supabase, user } = await requireSignedInProfile();
  const { specMap } = getBuildflowWireframeData();
  const upload = specMap.get("upload");
  const materials = specMap.get("materials");

  if (!upload || !materials) {
    throw new Error("Missing BuildFlow upload route data.");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>();

  if (error || !project) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Upload Plans</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{project.name}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                This upload step is now tied to the selected project so the client always knows which job the plans belong to.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Signed-in client</span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">{upload.status}</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">Project-aware upload preview</span>
              </div>
            </div>
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Back to Project Workspace
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Selected project</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Project name</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.name}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{formatProjectStatus(project.status)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Address</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{project.address || "No address added yet."}</div>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Upload status</h2>
            <p className="mt-1 text-sm text-slate-500">Real file upload is not live yet. Keep this step honest while the project context is now connected.</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Current mode</div>
                <p className="mt-2 leading-6">Upload Plans is project-aware now, but file handling stays in preview until the real upload slice is approved.</p>
              </div>
              <Link href="/materials" className={statusButtonClass(materials.status, materials.status === "Coming Soon")}>
                <span>Review Materials</span>
                <span className="ml-2 text-[11px] uppercase tracking-[0.16em] opacity-85">{materials.status}</span>
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
