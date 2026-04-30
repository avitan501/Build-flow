import Link from "next/link";
import { notFound } from "next/navigation";

import { uploadProjectFileAction } from "@/app/upload/actions";
import { ClientWireframePage } from "@/components/buildflow/client-wireframe-page";
import { statusButtonClass } from "@/components/buildflow/wireframe";
import { requireSignedInProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
import { PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES, type ProjectRecord } from "@/lib/projects";

function formatProjectStatus(status: ProjectRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

type UploadPageProps = {
  searchParams?: Promise<{
    projectId?: string;
    error?: string;
    success?: string;
  }>;
};

const uploadStatusMessages = {
  "file-required": { tone: "error", text: "Choose one file before uploading." },
  "file-too-large": { tone: "error", text: "File is too large. Keep it at 25 MB or below." },
  "file-type-not-allowed": { tone: "error", text: "Only PDF, PNG, JPG, JPEG, and WEBP files are allowed right now." },
  "project-not-found": { tone: "error", text: "We could not confirm that project for your account." },
  "storage-upload-failed": { tone: "error", text: "Upload failed before the file could be saved. Please try again." },
  "metadata-insert-failed": { tone: "error", text: "Upload reached storage, but metadata could not be saved. Please try again." },
  "upload-complete": { tone: "success", text: "Project file uploaded successfully." },
} as const;

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const projectId = resolvedSearchParams?.projectId?.trim();
  const errorCode = resolvedSearchParams?.error?.trim();
  const successCode = resolvedSearchParams?.success?.trim();

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

  const feedback = (successCode && uploadStatusMessages[successCode as keyof typeof uploadStatusMessages]) || (errorCode && uploadStatusMessages[errorCode as keyof typeof uploadStatusMessages]);
  const maxFileSizeMb = Math.floor(PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024));

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
            <h2 className="text-lg font-semibold">Upload plans</h2>
            <p className="mt-1 text-sm text-slate-500">Upload one project file at a time for this selected project.</p>
            <div className="mt-4 grid gap-3">
              {feedback ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    feedback.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em]">
                    {feedback.tone === "success" ? "Upload complete" : "Upload issue"}
                  </div>
                  <p className="mt-2 leading-6">{feedback.text}</p>
                </div>
              ) : null}

              <form action={uploadProjectFileAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <label htmlFor="project-file" className="text-sm font-semibold text-slate-900">
                    Choose file
                  </label>
                  <input
                    id="project-file"
                    name="file"
                    type="file"
                    required
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upload rules</div>
                  <ul className="mt-2 grid gap-1 leading-6">
                    <li>Allowed: PDF, PNG, JPG, JPEG, WEBP</li>
                    <li>Max size: {maxFileSizeMb} MB</li>
                    <li>Stored under this selected project only</li>
                  </ul>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Upload file
                </button>
              </form>

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
