import Image from "next/image"

import { AddToProjectButton } from "@/components/buildflow/add-to-project-button"
import { BulkBagStorefront } from "@/components/buildflow/bulk-bag-storefront"
import { DepartmentEssentials } from "@/components/buildflow/department-essentials"
import { DepartmentRequestComposer } from "@/components/buildflow/department-request-composer"
import { EmbeddedMaterialQuickOrder } from "@/components/buildflow/embedded-material-quick-order"
import { EitanWhatsAppUploadForm } from "@/components/buildflow/eitan-whatsapp-upload-form"
import { ManagerItemVisibility } from "@/components/buildflow/manager-item-visibility"
import { PlanRequestUploadCard } from "@/components/buildflow/plan-request-upload-card"
import { SheetRockProductConfigurator } from "@/components/buildflow/sheet-rock-product-configurator"
import type { ProjectRecord } from "@/lib/projects"
import { getDepartmentEssentials, type CatalogEssentialItem } from "@/lib/department-essentials"
import type { ManagerDepartmentExperience } from "@/lib/manager-add-ons"
import type { MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"
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
  questionnaireSnapshot?: MaterialQuestionnaireSnapshot | null
  catalogEssentials?: CatalogEssentialItem[]
}

function QuickOrderAction({ category, questionnaireDepartment }: { category: ShopToolCategory; questionnaireDepartment: string }) {
  return <section className="flex max-w-2xl flex-col items-start justify-between gap-4 rounded-[20px] border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Choose materials</p><h2 className="mt-1 text-lg font-bold text-slate-950">Answer a few quick questions</h2><p className="mt-1 text-sm leading-6 text-slate-600">Select sizes, quantities, and accessories for this department.</p></div><AddToProjectButton product={{ id: `${category.slug}-quick-order`, name: `${category.label} Quick Order`, category: questionnaireDepartment, productType: "service", price: 0, unit: "Request" }} questionnaireDepartment={questionnaireDepartment} label="Start quick order" /></section>
}

const SINGLE_DOOR_PRICES = [
  ["18 in.", 131, 180],
  ["20 in.", 132, 182],
  ["24 in.", 133, 184],
  ["28 in.", 134, 188],
  ["30 in.", 135, 190],
  ["32 in.", 137, 194],
  ["36 in.", 141, 196],
] as const

const DOUBLE_DOOR_PRICES = [
  ["36 in. (18 + 18)", 372],
  ["40 in. (20 + 20)", 373],
  ["48 in. (24 + 24)", 374],
  ["56 in. (28 + 28)", 395],
  ["60 in. (30 + 30)", 398],
  ["72 in. (36 + 36)", 435],
] as const

const DOOR_PRICE_FORMATTER = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

function DoorPricingGuide() {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby="door-price-guide-title">
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3 p-3 sm:grid-cols-[5.5rem_minmax(13rem,1fr)_minmax(20rem,1.2fr)] sm:gap-5 sm:p-4">
        <div className="relative h-20 overflow-hidden rounded-md bg-[#f3f4f6] sm:h-24">
          <Image src="/images/materials/catalog/one-panel-shaker-door.webp" alt="White primed 1-panel Shaker interior door" fill sizes="(min-width: 640px) 104px, 84px" className="object-contain p-1.5" priority />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700">Featured Door</p>
          <h2 id="door-price-guide-title" className="mt-0.5 text-pretty text-base font-bold leading-tight text-slate-950 sm:text-lg">1-Panel Shaker Interior Door</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Primed white · 6 ft. 8 in. · 1 3/8 in.</p>
        </div>

        <div className="col-span-2 grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 sm:col-span-1" data-testid="door-price-options">
          {[["Slab", 131], ["Prehung", 180], ["Double", 372]].map(([label, price], index) => (
            <div key={label} className={`${index ? "border-l border-slate-200" : ""} min-w-0 px-2 py-2 text-center sm:px-3`}>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-slate-950">{DOOR_PRICE_FORMATTER.format(Number(price))}</p>
            </div>
          ))}
        </div>

      </div>

      <details className="group border-t border-slate-200">
        <summary className="flex min-h-11 cursor-pointer list-none touch-manipulation items-center justify-between px-4 text-xs font-bold text-sky-700 marker:content-none hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sky-100">See All 13 Size Prices<span aria-hidden="true" className="text-lg font-light transition-transform motion-reduce:transition-none group-open:rotate-45">+</span></summary>
        <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-4 lg:grid-cols-2">
          <table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-300 text-slate-500"><th className="py-2">Width</th><th className="py-2 text-right">Slab</th><th className="py-2 text-right">Prehung</th></tr></thead><tbody>{SINGLE_DOOR_PRICES.map(([width, slab, prehung]) => <tr key={width} className="border-b border-slate-200"><td className="py-2 font-semibold">{width}</td><td className="py-2 text-right tabular-nums">{DOOR_PRICE_FORMATTER.format(slab)}</td><td className="py-2 text-right tabular-nums">{DOOR_PRICE_FORMATTER.format(prehung)}</td></tr>)}</tbody></table>
          <table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-300 text-slate-500"><th className="py-2">Double-Door Width</th><th className="py-2 text-right">Price</th></tr></thead><tbody>{DOUBLE_DOOR_PRICES.map(([width, price]) => <tr key={width} className="border-b border-slate-200"><td className="py-2 font-semibold">{width}</td><td className="py-2 text-right tabular-nums">{DOOR_PRICE_FORMATTER.format(price)}</td></tr>)}</tbody></table>
          <p className="text-[10px] leading-4 text-slate-500 lg:col-span-2">Reference pricing from the supplied price board. Final availability and pricing are confirmed with your quote.</p>
        </div>
      </details>
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
            src="/images/buildflow-retail/eitan-renovation.webp"
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

export function ShopToolCategoryPage({ category, questionnaireDepartment, experience, projects, selectedProjectId, isSignedIn, errorCode, questionnaireSnapshot, catalogEssentials = [] }: ShopToolCategoryPageProps) {
  const essentials = getDepartmentEssentials(category.slug, catalogEssentials)
  const customOrderOnly = ["siding", "roofing", "window"].includes(category.slug)
  const usesStandardUpload = !["framing", "kitchen", "eitan", "window", "siding", "roofing"].includes(category.slug)
  const usesEmbeddedQuickOrder = ["wood-floor", "sheet-rock", "tile-work", "door-and-molding", "framing", "electrical"].includes(category.slug)
  const composerHandlesUpload = usesEmbeddedQuickOrder
  const usesCompactCustomOrder = usesEmbeddedQuickOrder || customOrderOnly
  const isBulkBagDepartment = category.slug === "concrete-masonry"

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <h1 className={`${category.slug === "door-and-molding" ? "text-[1.7rem] sm:text-[2rem]" : "text-[2rem] sm:text-[2.4rem]"} font-bold tracking-normal text-slate-950`}>{category.label}</h1>

        {isBulkBagDepartment ? <BulkBagStorefront /> : null}
        {category.slug === "door-and-molding" ? <DoorPricingGuide /> : null}
        {experience.showQuickOrder && category.slug === "sheet-rock" ? <SheetRockProductConfigurator /> : null}
        {experience.showQuickOrder && usesEmbeddedQuickOrder && category.slug !== "sheet-rock" && questionnaireSnapshot ? <div id={category.slug === "door-and-molding" ? "door-order-builder" : undefined} className="scroll-mt-24"><EmbeddedMaterialQuickOrder snapshot={questionnaireSnapshot} category={questionnaireDepartment} displayCategory={category.label} requestId={category.slug} /></div> : null}
        {experience.showQuickOrder && !isBulkBagDepartment && !customOrderOnly && (!usesEmbeddedQuickOrder || !questionnaireSnapshot) ? <QuickOrderAction category={category} questionnaireDepartment={questionnaireDepartment} /> : null}
        {experience.showPlanUpload && !isBulkBagDepartment && usesStandardUpload && !composerHandlesUpload ? <CombinedUploadAction category={questionnaireDepartment} requestId={category.slug} questionnaireDepartment={questionnaireDepartment} /> : null}
        {experience.showPlanUpload && category.slug === "kitchen" ? <KitchenActions /> : null}
        {experience.showPlanUpload && category.slug === "eitan" ? <ManagerItemVisibility itemId="eitan-window-schedule"><EitanActions projects={projects} selectedProjectId={selectedProjectId} isSignedIn={isSignedIn} errorCode={errorCode} /></ManagerItemVisibility> : null}

        {!isBulkBagDepartment && (customOrderOnly || experience.showChatToOrder) && usesCompactCustomOrder ? (
          <details open={customOrderOnly} className="group rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left marker:content-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sky-100">
              <span><span className="block text-base font-bold text-slate-950">{`Need Help With a Custom ${category.label} Order?`}</span><span className="mt-0.5 block text-sm text-slate-500">Describe the request or attach a blueprint or shopping list.</span></span>
              <span aria-hidden="true" className="text-xl font-light text-slate-500 transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
            </summary>
            <div className="border-t border-slate-100 px-5 [&>section]:border-0"> <DepartmentRequestComposer category={questionnaireDepartment} displayCategory={category.label} requestId={category.slug} questionnaireDepartment={questionnaireDepartment} allowUpload={customOrderOnly || (composerHandlesUpload && experience.showPlanUpload)} /></div>
          </details>
        ) : !isBulkBagDepartment && experience.showChatToOrder ? <DepartmentRequestComposer category={questionnaireDepartment} displayCategory={category.label} requestId={category.slug} questionnaireDepartment={questionnaireDepartment} allowUpload={composerHandlesUpload && experience.showPlanUpload} /> : null}

        <DepartmentEssentials data={essentials} />
      </section>
    </main>
  )
}
