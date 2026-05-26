import Image from "next/image"
import Link from "next/link"

import { uploadWindowScheduleAction } from "@/app/shop/window/actions"
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

function formatCurrency(value: number) {
  const [dollars, cents] = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).split(".")

  return { dollars, cents: cents ?? "00" }
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
        <label
          key={action.label}
          className="flex min-h-[148px] cursor-pointer touch-manipulation flex-col justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition active:scale-[0.99] active:border-sky-300"
        >
          <input type="file" accept={action.accept} className="sr-only" aria-label={action.label} />
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            {action.icon}
          </span>
          <span>
            <span className="block text-base font-bold leading-5 text-slate-950">{action.label}</span>
            <span className="mt-1 block text-xs font-medium leading-4 text-slate-500">{action.description}</span>
          </span>
        </label>
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
        {category.slug === "window" ? <WindowUploadActions projects={projects} selectedProjectId={selectedProjectId} isSignedIn={isSignedIn} errorCode={errorCode} successCode={successCode} /> : null}

        {products.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-[0_14px_34px_rgba(148,163,184,0.08)]">
            No items are assigned to this tool page yet.
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {products.map((product) => {
              const price = formatCurrency(product.price)

              return (
                <Link
                  href={`/shop/${product.slug}`}
                  key={product.id}
                  className="flex h-full min-h-[228px] touch-manipulation flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 active:scale-[0.99] active:border-sky-300"
                >
                  <span className="block border-b border-slate-100 bg-slate-50/70 p-2.5 sm:p-3">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-white">
                      <Image
                        src={product.imageUrl}
                        alt={product.imageAlt}
                        fill
                        sizes="(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 42vw"
                        className="object-contain p-2"
                      />
                    </div>
                  </span>

                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {product.price > 0 ? (
                          <div className="flex items-start gap-0.5 text-slate-950">
                            <span className="text-[1.15rem] font-bold leading-none">{price.dollars}</span>
                            <span className="pt-0.5 text-[11px] font-bold leading-none">.{price.cents}</span>
                          </div>
                        ) : (
                          <div className="text-[1.05rem] font-bold leading-none text-slate-950">Get pricing</div>
                        )}
                        <div className="mt-0.5 text-[11px] font-medium text-slate-500">{product.unit}</div>
                      </div>
                    </div>

                    <span className="mt-2.5 block text-[0.92rem] font-semibold leading-5 text-slate-900">
                      <span className="line-clamp-2">{product.name}</span>
                    </span>

                    <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-600">{product.shortDescription || product.description}</p>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <div className="min-w-0 truncate text-[11px] font-medium text-slate-500">{product.supplierName || product.availability || "Available"}</div>
                      <span className="shrink-0 text-[11px] font-semibold text-sky-700">
                        Details
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </section>
        )}
      </section>
    </main>
  )
}
