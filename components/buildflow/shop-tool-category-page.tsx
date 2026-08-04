import Image from "next/image"
import Link from "next/link"

import { uploadWindowScheduleAction } from "@/app/shop/window/actions"
import { EitanWhatsAppUploadForm } from "@/components/buildflow/eitan-whatsapp-upload-form"
import { PlanRequestUploadCard } from "@/components/buildflow/plan-request-upload-card"
import { ShopToolCategoryProducts } from "@/components/buildflow/shop-tool-category-products"
import type { ProjectRecord } from "@/lib/projects"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import type { ShopToolCategory } from "@/lib/shop-tools"

type ShopToolCategoryPageProps = {
  category: ShopToolCategory
  products: ShopCatalogProduct[]
  projects: ProjectRecord[]
  selectedProjectId?: string
  selectedAddress?: string
  isSignedIn: boolean
  errorCode?: string | null
  successCode?: string | null
}

function FramingUploadActions() {
  const actions = [
    {
      label: "Upload framer list",
      description: "List, photo, PDF, or spreadsheet",
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
    {
      label: "Upload blue print",
      description: "Plan file, PDF, or image",
      accept: ".pdf,image/*",
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 3h12l4 4v14H4z" />
          <path d="M16 3v5h5" />
          <path d="M8 14h8" />
          <path d="M8 18h5" />
        </svg>
      ),
    },
  ]

  return (
    <section className="grid grid-cols-2 gap-3 sm:max-w-2xl sm:gap-4">
      {actions.map((action) => (
        <PlanRequestUploadCard key={action.label} requestId={`framing-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} category="Framing" label={action.label} description={action.description} accept={action.accept} icon={action.icon} />
      ))}
    </section>
  )
}

function TileWorkActions() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:max-w-2xl sm:gap-4">
      <Link
        href="/shop/tile-work/thinset-calculator"
        className="flex min-h-[148px] touch-manipulation flex-col justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition active:scale-[0.99] active:border-sky-300"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 7h8" />
            <path d="M8 11h2" />
            <path d="M12 11h2" />
            <path d="M16 11h.01" />
            <path d="M8 15h2" />
            <path d="M12 15h2" />
            <path d="M16 15h.01" />
          </svg>
        </span>
        <span>
          <span className="block text-base font-bold leading-5 text-slate-950">Thinset calculator</span>
          <span className="mt-1 block text-xs font-medium leading-4 text-slate-500">Estimate thinset for tile work</span>
        </span>
      </Link>
    </section>
  )
}

function SheetRockActions() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:max-w-2xl sm:gap-4">
      <Link
        href="/shop/sheet-rock/drywall-calculator"
        className="flex min-h-[148px] touch-manipulation flex-col justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition active:scale-[0.99] active:border-sky-300"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <path d="M9 7h6" />
            <path d="M9 11h2" />
            <path d="M13 11h2" />
            <path d="M9 15h2" />
            <path d="M13 15h2" />
          </svg>
        </span>
        <span>
          <span className="block text-base font-bold leading-5 text-slate-950">Drywall calculator</span>
          <span className="mt-1 block text-xs font-medium leading-4 text-slate-500">Plan ruler takeoff, openings, boards, screws, tape, and mud</span>
        </span>
      </Link>
    </section>
  )
}

function WoodFloorActions() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:max-w-2xl sm:gap-4">
      <Link
        href="/shop/wood-floor/flooring-calculator"
        className="flex min-h-[148px] touch-manipulation flex-col justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition active:scale-[0.99] active:border-sky-300"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16v16H4z" />
            <path d="M4 9h16" />
            <path d="M9 4v16" />
            <path d="M14 4v16" />
          </svg>
        </span>
        <span>
          <span className="block text-base font-bold leading-5 text-slate-950">Wood floor calculator</span>
          <span className="mt-1 block text-xs font-medium leading-4 text-slate-500">Plan room takeoff, room selection, 10% waste, and marked plan</span>
        </span>
      </Link>
    </section>
  )
}

function KitchenActions() {
  const actions = [
    {
      label: "Upload kitchen plan",
      description: "Cabinet layout, floor plan, PDF, or image",
      accept: ".pdf,image/*",
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 3h12l4 4v14H4z" />
          <path d="M16 3v5h5" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      ),
    },
    {
      label: "Upload design spec",
      description: "Door style, finish, hardware, appliance notes",
      accept: ".csv,.xls,.xlsx,.pdf,image/*",
      icon: (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h4" />
          <path d="M15 15h1" />
        </svg>
      ),
    },
  ]

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
        <div className="relative min-h-[260px] bg-slate-900 sm:min-h-[340px]">
          <Image
            src="/images/buildflow-retail/kitchen.jpg"
            alt="Premium kitchen cabinetry showroom with cabinet samples"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.72),rgba(15,23,42,0.28)_48%,rgba(15,23,42,0.02))]" />
          <div className="relative flex min-h-[260px] max-w-xl flex-col justify-between p-5 text-white sm:min-h-[340px] sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">Avantia Build Kitchen</p>
              <h2 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-normal sm:text-4xl">Premium cabinetry for builder-ready kitchens</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/82">
                Upload the plan or design spec and keep cabinet style, finish, hardware, and ordering notes connected to the project.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-950 sm:max-w-md">
              <span className="rounded-2xl bg-white/90 px-3 py-3">Shaker</span>
              <span className="rounded-2xl bg-white/90 px-3 py-3">Slab</span>
              <span className="rounded-2xl bg-white/90 px-3 py-3">Custom finish</span>
              <span className="rounded-2xl bg-white/90 px-3 py-3">Hardware notes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 self-start sm:gap-4 lg:grid-cols-1">
        {actions.map((action) => (
          <PlanRequestUploadCard key={action.label} requestId={`kitchen-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} category="Kitchen" label={action.label} description={action.description} accept={action.accept} icon={action.icon} />
        ))}
      </div>
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
            <Link href="/projects/new" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700">
              Create project first
            </Link>
          )
        ) : (
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700">
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

export function ShopToolCategoryPage({ category, products, projects, selectedProjectId, isSignedIn, errorCode, successCode }: ShopToolCategoryPageProps) {
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <h1 className="text-[2rem] font-bold tracking-normal text-slate-950 sm:text-[2.4rem]">{category.label}</h1>

        {category.slug === "framing" ? <FramingUploadActions /> : null}
        {category.slug === "tile-work" ? <TileWorkActions /> : null}
        {category.slug === "sheet-rock" ? <SheetRockActions /> : null}
        {category.slug === "wood-floor" ? <WoodFloorActions /> : null}
        {category.slug === "kitchen" ? <KitchenActions /> : null}
        {category.slug === "eitan" ? <EitanActions projects={projects} selectedProjectId={selectedProjectId} isSignedIn={isSignedIn} errorCode={errorCode} /> : null}
        {category.slug === "window" ? <WindowUploadActions projects={projects} selectedProjectId={selectedProjectId} isSignedIn={isSignedIn} errorCode={errorCode} successCode={successCode} /> : null}

        <ShopToolCategoryProducts categoryLabel={category.label} products={products} />
      </section>
    </main>
  )
}
