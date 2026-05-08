import Link from "next/link";
import { notFound } from "next/navigation";

import { uploadProjectFileAction } from "@/app/upload/actions";
import { PremiumBackLink, PremiumBadge, PremiumHero, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumSection } from "@/components/buildflow/premium-page";
import { requireSignedInProfile } from "@/lib/auth";
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
    return (
      <PremiumPageShell maxWidth="max-w-3xl">
        <PremiumHero
          eyebrow="Upload Plans"
          title="Upload"
          description="Open this page from a project workspace so the file stays tied to the correct job."
          aside={<PremiumBackLink href="/projects">Back to Projects</PremiumBackLink>}
        />
      </PremiumPageShell>
    );
  }

  const { supabase, user } = await requireSignedInProfile();

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
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Upload Plans"
        title={project.name}
        description="A clean upload step tied to the selected project so clients always know where files belong."
        badges={
          <>
            <PremiumBadge>Signed-in client</PremiumBadge>
            <PremiumBadge tone="amber">Live</PremiumBadge>
            <PremiumBadge tone="sky">Project-aware upload</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href={`/projects/${project.id}`}>Back to Project Workspace</PremiumBackLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumSection title="Selected project" description="Quick project context stays visible while uploading.">
          <div className="grid gap-4 sm:grid-cols-2">
            <PremiumInfoCard label="Project name" value={project.name} />
            <PremiumInfoCard label="Status" value={formatProjectStatus(project.status)} />
            <PremiumInfoCard label="Address" value={project.address || "No address added yet."} spanTwo />
          </div>
        </PremiumSection>

        <PremiumSection title="Upload plans" description="Upload one project file at a time for this selected project.">
          <div className="grid gap-3">
            {feedback ? (
              <PremiumMutedPanel tone={feedback.tone === "success" ? "emerald" : "rose"}>
                <div className="text-xs font-semibold uppercase tracking-[0.16em]">{feedback.tone === "success" ? "Upload complete" : "Upload issue"}</div>
                <p className="mt-2 leading-6">{feedback.text}</p>
              </PremiumMutedPanel>
            ) : null}

            <form action={uploadProjectFileAction} encType="multipart/form-data" className="grid gap-4 rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.86))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
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
                  className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-[#0e2341] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </div>
              <div className="rounded-2xl border border-sky-100 bg-white p-4 text-sm text-slate-600 shadow-[0_8px_20px_rgba(148,163,184,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upload rules</div>
                <ul className="mt-2 grid gap-1 leading-6">
                  <li>Allowed: PDF, PNG, JPG, JPEG, WEBP</li>
                  <li>Max size: {maxFileSizeMb} MB</li>
                  <li>Stored under this selected project only</li>
                </ul>
              </div>
              <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]">
                Upload file
              </button>
            </form>

            <Link href={`/materials?projectId=${project.id}`} className="inline-flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
              <span>Review Materials</span>
              <PremiumBadge tone="sky">Live</PremiumBadge>
            </Link>
          </div>
        </PremiumSection>
      </div>
    </PremiumPageShell>
  );
}
