import Image from "next/image"
import Link from "next/link"

import { uploadWindowScheduleAction } from "@/app/shop/window/actions"
import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { DepartmentEssentials } from "@/components/buildflow/department-essentials"
import { DepartmentRequestComposer } from "@/components/buildflow/department-request-composer"
import { EitanWhatsAppUploadForm } from "@/components/buildflow/eitan-whatsapp-upload-form"
import { ManagerItemVisibility } from "@/components/buildflow/manager-item-visibility"
import { PlanRequestUploadCard } from "@/components/buildflow/plan-request-upload-card"
import type { ProjectRecord } from "@/lib/projects"
import { getDepartmentEssentials } from "@/lib/department-essentials"
import type { ManagerDepartmentExperience } from "@/lib/manager-add-ons"
import type { ShopToolCategory } from "@/lib/shop-tools"

type ShopToolCategoryPageProps = {
  category: ShopToolCategory
  questionnaireDepartment: string
  experience: ManagerDepartmentExperience
  projects: ProjectRecord[]
  selectedProjectId?: string
  selectedAddress?: string
  isSignedIn: boolean
  errorCode?: string | null
  successCode?: string | null
}

function QuickOrderAction({ category, questionnaireDepartment }: { category: ShopToolCategory; questionnaireDepartment: string }) {
  return <section className="flex max-w-2xl flex-col items-start justify-between gap-4 rounded-[20px] border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Choose materials</p><h2 className="mt-1 text-lg font-bold text-slate-950">Answer a few quick questions</h2><p className="mt-1 text-sm leading-6 text-slate-600">Select sizes, quantities, and accessories for this department.</p></div><AddToProjectButton product={{ id: `${category.slug}-quick-order`, name: `${category.label} Quick Order`, category: questionnaireDepartment, productType: "service", price: 0, unit: "Request" }} questionnaireDepartment={questionnaireDepartment} label="Start quick order" /></section>
}

function FramingUploadActions() {
  const actions = [
    {
      label: "Upload blueprint or shopping list",
      description: "Plan, list, photo, PDF, CSV, or spreadsheet",
      accept: ".csv,.xls,.xlsx,.pdf,image/*",
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      ),
    },
  ]

  return (
    <section className="grid max-w-xl gap-3 sm:gap-4">
      {actions.map((action) => (
        <ManagerItemVisibility key={action.label} itemId={`framing-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
          <PlanRequestUploadCard requestId={`framing-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} category="Framing" label={action.label} description={action.description} accept={action.accept} icon={action.icon} />
        </ManagerItemVisibility>
      ))}
    </section>
  )
}

function KitchenActions() {
  const actions = [
    {
      label: "Upload blueprint or shopping list",
      description: "Kitchen plan, design spec, list, PDF, image, CSV, or spreadsheet",
      accept: ".csv,.xls,.xlsx,.pdf,image/*",
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 3h12l4 4v14H4z" />
          <path d="M16 3v5h5" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      ),
    },
  ]

  return (
    <section className="grid max-w-xl gap-3 sm:gap-4">
        {actions.map((action) => (
          <ManagerItemVisibility key={action.label} itemId={`kitchen-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            <PlanRequestUploadCard requestId={`kitchen-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} category="Kitchen" label={action.label} description={action.description} accept={action.accept} icon={action.icon} />
          </ManagerItemVisibility>
        ))}
    </section>
  )
}

function BlueprintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3h12l4 4v14H4z" />
      <path d="M16 3v5h5" />
      <path d="M8 12h8" />
      <path d="M8 16h3" />
      <path d="M13 16h3" />
      <path d="M8 19h8" />
    </svg>
  )
}

function CombinedUploadAction({ category, requestId, questionnaireDepartment }: { category: string; requestId: string; questionnaireDepartment: string }) {
  return (
    <section className="max-w-xl">
      <ManagerItemVisibility itemId={`${requestId}-upload`}>
        <PlanRequestUploadCard
          requestId={`${requestId}-blueprint-shopping-list`}
          category={category}
          questionnaireDepartment={questionnaireDepartment}
          label="Upload blueprint or shopping list"
          description="Plan, material list, photo, PDF, CSV, or spreadsheet"
          accept=".csv,.xls,.xlsx,.pdf,image/*"
          icon={<BlueprintIcon />}
        />
      </ManagerItemVisibility>
    </section>
  )
}

const windowUploadStatusMessages = {
  "file-required": { tone: "error", text: "Choose a window schedule, blueprint, PDF, image, CSV, or Excel file." },
  "file-too-large": { tone: "error", text: "File is too large. Keep it at 25 MB or below." },
  "file-type-not-allowed": { tone: "error", text: "Allowed files: PDF, PNG, JPG, WEBP, CSV, XLS, or XLSX." },
  "project-not-found": { tone: "error", text: "We could not confirm that project for your account." },
  "storage-upload-failed": { tone: "error", text: "Upload failed before the file could be saved. Please try again." },
  "metadata-insert-failed": { tone: "error", text: "Upload reached storage, but metadata could not be saved." },
  "schedule-create-failed": { tone: "error", text: "The window schedule review could not be created." },
} as const

function EitanActions({
  projects,
  selectedProjectId,
  isSignedIn,
  errorCode,
}: {
  projects: ProjectRecord[]
  selectedProjectId?: string
  isSignedIn: boolean
  errorCode?: string | null
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
        <div className="relative min-h-[250px] bg-slate-900 sm:min-h-[330px]">
          <Image
            src="/images/buildflow-retail/eitan-renovation.png"
            alt="Residential renovation jobsite with window plans and materials"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.72),rgba(15,23,42,0.22)_55%,rgba(15,23,42,0.04))]" />
          <div className="relative flex min-h-[250px] max-w-xl flex-col justify-between p-5 text-white sm:min-h-[330px] sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">Eitan window quote</p>
              <h2 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-normal sm:text-4xl">Upload a plan and prepare the window schedule quote</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/82">
                The app reads the schedule from your plan and sends the WhatsApp quote request in the background.
              </p>
            </div>
          </div>
        </div>
      </div>

      <EitanWhatsAppUploadForm projects={projects} selectedProjectId={selectedProjectId} isSignedIn={isSignedIn} errorCode={errorCode} />
    </section>
  )
}

function WindowUploadActions({
  projects,
  selectedProjectId,
  isSignedIn,
  errorCode,
  successCode,
}: {
  projects: ProjectRecord[]
  selectedProjectId?: string
  isSignedIn: boolean
  errorCode?: string | null
  successCode?: string | null
}) {
  const feedback =
    (errorCode && windowUploadStatusMessages[errorCode as keyof typeof windowUploadStatusMessages]) ||
    (successCode ? { tone: "success", text: "Window schedule uploaded." } : null)

  return (
    <section className="grid gap-3 sm:max-w-2xl sm:gap-4">
      {feedback ? (
        <div className={`rounded-[18px] border px-4 py-3 text-sm ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
          {feedback.text}
        </div>
      ) : null}

      <form action={uploadWindowScheduleAction} encType="multipart/form-data" className="grid gap-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <BlueprintIcon />
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Sierra Pacific
          </span>
        </div>

        <div>
          <h2 className="text-base font-bold leading-5 text-slate-950">Upload your window schedule</h2>
          <p className="mt-1 text-xs font-medium leading-4 text-slate-500">Blueprint, window schedule, takeoff, quote, PDF, photo, CSV, or Excel</p>
        </div>

        {isSignedIn ? (
          projects.length > 0 ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-900">
              <span>Project</span>
              <select name="projectId" defaultValue={selectedProjectId || projects[0]?.id || ""} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <Link href="/projects/new" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700">
              Create project first
            </Link>
          )
        ) : (
          <Link href="/login" prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700">
            Sign in to upload
          </Link>
        )}

        <input name="file" type="file" accept=".csv,.xls,.xlsx,.pdf,image/png,image/jpeg,image/webp" required disabled={!isSignedIn || projects.length === 0} className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60" />

        <button type="submit" disabled={!isSignedIn || projects.length === 0} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55">
          Extract window schedule
        </button>
      </form>
    </section>
  )
}

export function ShopToolCategoryPage({ category, questionnaireDepartment, experience, projects, selectedProjectId, isSignedIn, errorCode, successCode }: ShopToolCategoryPageProps) {
  const essentials = getDepartmentEssentials(category.slug)
  const usesStandardUpload = !["framing", "kitchen", "eitan", "window"].includes(category.slug)
  const composerHandlesUpload = category.slug === "wood-floor"

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <h1 className="text-[2rem] font-bold tracking-normal text-slate-950 sm:text-[2.4rem]">{category.label}</h1>

        {experience.showQuickOrder ? <QuickOrderAction category={category} questionnaireDepartment={questionnaireDepartment} /> : null}
        {experience.showPlanUpload && usesStandardUpload && !composerHandlesUpload ? <CombinedUploadAction category={questionnaireDepartment} requestId={category.slug} questionnaireDepartment={questionnaireDepartment} /> : null}
        {experience.showPlanUpload && category.slug === "framing" ? <FramingUploadActions /> : null}
        {experience.showPlanUpload && category.slug === "kitchen" ? <KitchenActions /> : null}
        {experience.showPlanUpload && category.slug === "eitan" ? <ManagerItemVisibility itemId="eitan-window-schedule"><EitanActions projects={projects} selectedProjectId={selectedProjectId} isSignedIn={isSignedIn} errorCode={errorCode} /></ManagerItemVisibility> : null}
        {experience.showPlanUpload && category.slug === "window" ? <ManagerItemVisibility itemId="window-package"><WindowUploadActions projects={projects} selectedProjectId={selectedProjectId} isSignedIn={isSignedIn} errorCode={errorCode} successCode={successCode} /></ManagerItemVisibility> : null}

        <DepartmentEssentials data={essentials} />

        {experience.showChatToOrder ? <DepartmentRequestComposer category={questionnaireDepartment} displayCategory={category.label} requestId={category.slug} questionnaireDepartment={questionnaireDepartment} allowUpload={composerHandlesUpload && experience.showPlanUpload} /> : null}
      </section>
    </main>
  )
}
