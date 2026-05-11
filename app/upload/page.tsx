import { notFound } from "next/navigation"

import { uploadProjectFileAction } from "@/app/upload/actions"
import { PremiumActionTile, PremiumBackLink, PremiumBadge, PremiumEmptyState, PremiumHero, PremiumIconBadge, PremiumInfoCard, PremiumMutedPanel, PremiumPageShell, PremiumPhotoPanel, PremiumSection } from "@/components/buildflow/premium-page"
import { requireSignedInProfile } from "@/lib/auth"
import { PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES, type ProjectRecord } from "@/lib/projects"

const uploadImage =
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80"
const emptyUploadImage =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80"

type UploadPageProps = {
  searchParams?: Promise<{
    projectId?: string
    error?: string
    success?: string
  }>
}

const uploadStatusMessages = {
  "file-required": { tone: "error", text: "Choose one file before uploading." },
  "file-too-large": { tone: "error", text: "File is too large. Keep it at 25 MB or below." },
  "file-type-not-allowed": { tone: "error", text: "Only PDF, PNG, JPG, JPEG, and WEBP files are allowed right now." },
  "project-not-found": { tone: "error", text: "We could not confirm that project for your account." },
  "storage-upload-failed": { tone: "error", text: "Upload failed before the file could be saved. Please try again." },
  "metadata-insert-failed": { tone: "error", text: "Upload reached storage, but metadata could not be saved. Please try again." },
  "upload-complete": { tone: "success", text: "Project file uploaded successfully." },
} as const

function UploadIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V5" /><path d="m7 10 5-5 5 5" /><path d="M5 19h14" /></svg>
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const projectId = resolvedSearchParams?.projectId?.trim()
  const errorCode = resolvedSearchParams?.error?.trim()
  const successCode = resolvedSearchParams?.success?.trim()

  if (!projectId) {
    await requireSignedInProfile()
    return (
      <PremiumPageShell maxWidth="max-w-3xl">
        <PremiumHero eyebrow="Upload plans" title="Upload plans" description="Choose a project first to upload plans." aside={<PremiumBackLink href="/projects">Back to Projects</PremiumBackLink>} />
        <PremiumEmptyState
          image={emptyUploadImage}
          eyebrow="Choose a project first"
          title="Uploads work best when they stay tied to the right job"
          description="Open a project workspace first, then upload plans, photos, or documents with the correct client context already attached."
          action={<PremiumBackLink href="/projects">Open Projects</PremiumBackLink>}
        />
      </PremiumPageShell>
    )
  }

  const { supabase, user } = await requireSignedInProfile()

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectRecord>()

  if (error || !project) {
    notFound()
  }

  const feedback = (successCode && uploadStatusMessages[successCode as keyof typeof uploadStatusMessages]) || (errorCode && uploadStatusMessages[errorCode as keyof typeof uploadStatusMessages])
  const maxFileSizeMb = Math.floor(PROJECT_UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024))

  return (
    <PremiumPageShell>
      <PremiumHero
        eyebrow="Upload plans"
        title={project.name}
        description="Keep plan uploads simple and attached to the correct workspace."
        badges={
          <>
            <PremiumBadge tone="emerald">Live</PremiumBadge>
            <PremiumBadge>Project linked</PremiumBadge>
          </>
        }
        aside={<PremiumBackLink href={`/projects/${project.id}`}>Back to Project Workspace</PremiumBackLink>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <PremiumPhotoPanel
            image={uploadImage}
            eyebrow="Plan intake"
            title="A clearer, more premium place to send drawings and field files"
            description="The upload step now feels like part of a guided residential workflow instead of a plain form."
            badge={<PremiumBadge tone="amber">Readable overlays</PremiumBadge>}
            height="min-h-[240px]"
          />

          <PremiumSection title="Upload file" description="Choose one file and send it into this project.">
            <div className="grid gap-3">
              {feedback ? (
                <PremiumMutedPanel tone={feedback.tone === "success" ? "emerald" : "rose"}>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em]">{feedback.tone === "success" ? "Upload complete" : "Upload issue"}</div>
                  <p className="mt-2 leading-6">{feedback.text}</p>
                </PremiumMutedPanel>
              ) : null}

              <form action={uploadProjectFileAction} encType="multipart/form-data" className="grid gap-4 rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.86))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <label htmlFor="project-file" className="text-sm font-semibold text-slate-900">Choose file</label>
                  <input id="project-file" name="file" type="file" required accept=".pdf,image/png,image/jpeg,image/webp" className="mt-2 block w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-[#0e2341] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
                </div>
                <div className="rounded-2xl border border-sky-100 bg-white p-4 text-sm text-slate-600 shadow-[0_8px_20px_rgba(148,163,184,0.06)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Upload rules</div>
                  <ul className="mt-2 grid gap-1 leading-6">
                    <li>Allowed: PDF, PNG, JPG, JPEG, WEBP</li>
                    <li>Max size: {maxFileSizeMb} MB</li>
                    <li>Saved only to this project</li>
                  </ul>
                </div>
                <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]">Upload file</button>
              </form>
            </div>
          </PremiumSection>
        </div>

        <div className="grid gap-4">
          <PremiumSection title="Selected project" description="Project context stays visible while you upload.">
            <div className="grid gap-4 sm:grid-cols-2">
              <PremiumInfoCard label="Project name" value={project.name} />
              <PremiumInfoCard label="Status" value={project.status === "active" ? "Active" : project.status === "archived" ? "Archived" : "Draft"} />
              <PremiumInfoCard label="Address" value={project.address || "No address added yet."} spanTwo />
            </div>
          </PremiumSection>

          <PremiumSection title="Next step" description="Move straight into material review after upload.">
            <PremiumActionTile href={`/materials?projectId=${project.id}`} title="Review Materials" detail="Continue with the materials list for this same project." badge={<PremiumBadge tone="sky">Live</PremiumBadge>} icon={<PremiumIconBadge tone="sky"><UploadIcon /></PremiumIconBadge>} />
          </PremiumSection>
        </div>
      </div>
    </PremiumPageShell>
  )
}
