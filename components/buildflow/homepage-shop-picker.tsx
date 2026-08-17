"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react"

import { ShopTranslationBoundary } from "@/components/buildflow/shop-language-provider"
import { clearSelectedGuestProject, createGuestProject, GUEST_PROJECTS_UPDATED_EVENT, readSelectedGuestProject } from "@/lib/guest-projects"
import { MANAGER_ADD_ONS_UPDATED_EVENT, applyDepartmentAddOns, createEmptyManagerAddOns, readManagerAddOns, type ManagerCatalogAddOns } from "@/lib/manager-add-ons"
import type { ProjectRecord } from "@/lib/projects"
import type { ShopToolCategory } from "@/lib/shop-tools"

type HomepageShopPickerProps = {
  projects: ProjectRecord[]
  categories: ShopToolCategory[]
  selectedProjectId?: string
  selectedAddress?: string
  isSignedIn?: boolean
  projectCreated?: boolean
  projectError?: boolean
  homepageCompact?: boolean
}

function buildToolHref(slug: string, projectId: string, address: string) {
  const params = new URLSearchParams()
  if (projectId) {
    params.set("project", projectId)
  } else if (address.trim()) {
    params.set("address", address.trim())
  }

  const query = params.toString()
  return query ? `/shop/${slug}?${query}` : `/shop/${slug}`
}

function buildShopHref(projectId: string, address = "") {
  const params = new URLSearchParams()
  if (projectId) {
    params.set("project", projectId)
  } else if (address.trim()) {
    params.set("address", address.trim())
  }

  const query = params.toString()
  return query ? `/shop?${query}` : "/shop"
}

function buildCategoryFilterHref(category: string, projectId: string, address: string) {
  const params = new URLSearchParams()
  params.set("category", category)

  if (projectId) {
    params.set("project", projectId)
  } else if (address.trim()) {
    params.set("address", address.trim())
  }

  return `/shop?${params.toString()}`
}

const CATEGORY_CUTOUTS: Partial<Record<string, { imageUrl: string; imagePosition: string; imageSize?: string }>> = {
  framing: { imageUrl: "/images/department-essentials/lumber-grid.webp", imagePosition: "0% 0%" },
  "sheet-rock": { imageUrl: "/images/department-essentials/drywall-grid.webp", imagePosition: "0% 0%" },
  "door-and-molding": { imageUrl: "/images/department-essentials/door-molding-group.webp", imagePosition: "50% 50%", imageSize: "cover" },
  "wood-floor": { imageUrl: "/images/department-essentials/flooring-group.webp", imagePosition: "50% 50%", imageSize: "cover" },
  siding: { imageUrl: "/images/department-essentials/siding-grid.webp", imagePosition: "0% 0%" },
  roofing: { imageUrl: "/images/department-essentials/roofing-grid.webp", imagePosition: "0% 0%" },
  window: { imageUrl: "/images/department-essentials/windows-grid.webp", imagePosition: "0% 0%" },
}

const FAST_SERVICES = [
  {
    label: "Beat a Quote",
    description: "Upload a supplier quote",
    href: "/beat-a-quote",
    imagePosition: "0% 0%",
  },
  {
    label: "AI Takeoff with Human Verification",
    description: "Send plans for a material list",
    href: "/request-quote?request=ai-takeoff",
    imagePosition: "50% 0%",
  },
  {
    label: "Upload a List",
    description: "PDF, photo, or material list",
    href: "/request-quote?request=material-list",
    imagePosition: "100% 0%",
  },
  {
    label: "Find an Item",
    description: "Hard-to-find or custom material",
    href: "/request-quote?request=custom-item",
    imagePosition: "50% 50%",
  },
  {
    label: "Delivery Management",
    description: "Coordinate materials bought anywhere",
    href: "/request-quote?request=delivery-management",
    imagePosition: "100% 50%",
  },
  {
    label: "Liquidation",
    description: "Shop surplus and closeout materials",
    href: "/shop?category=Liquidation",
    imagePosition: "0% 100%",
  },
  {
    label: "Paperwork Management",
    description: "Organize quotes, POs, and invoices",
    href: "/request-quote?request=paperwork-management",
    imagePosition: "50% 100%",
  },
  {
    label: "Rush Material Request",
    description: "Get help with an urgent jobsite need",
    href: "/request-quote?request=rush-materials",
    imagePosition: "100% 100%",
  },
  {
    label: "High-End",
    description: "Premium finishes and specialty materials",
    href: "/request-quote?request=high-end",
    imagePosition: "50% 50%",
  },
] as const

const EXTRA_DEPARTMENTS = [
  { label: "Plumbing", imagePosition: "0% 0%", href: "/request-quote?request=plumbing" },
  { label: "Lighting", imagePosition: "50% 0%", href: "/request-quote?request=lighting" },
  { label: "Insulation", imagePosition: "100% 0%", href: "/request-quote?request=insulation" },
  { label: "Concrete & Masonry", imagePosition: "0% 100%", href: "/shop/concrete-masonry" },
  { label: "Cabinets & Appliances", imagePosition: "50% 100%", href: "/request-quote?request=cabinets" },
  { label: "Tool Rental", imagePosition: "100% 100%", href: "/request-quote?request=tool-rental" },
] as const

function subscribeToGuestProject(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(GUEST_PROJECTS_UPDATED_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(GUEST_PROJECTS_UPDATED_EVENT, onStoreChange)
  }
}

function getSelectedGuestAddress() {
  const guestProject = readSelectedGuestProject()
  return guestProject?.address || guestProject?.name || ""
}

function getServerGuestAddress() {
  return ""
}

export function HomepageShopPicker({
  projects,
  categories,
  selectedProjectId = "",
  selectedAddress = "",
  isSignedIn = false,
  projectCreated = false,
  projectError = false,
  homepageCompact = false,
}: HomepageShopPickerProps) {
  const [projectId, setProjectId] = useState(selectedProjectId)
  const [selectedCustomAddress, setSelectedCustomAddress] = useState(selectedAddress)
  const guestSelectedAddress = useSyncExternalStore(subscribeToGuestProject, getSelectedGuestAddress, getServerGuestAddress)
  const activeCustomAddress = selectedCustomAddress || (!isSignedIn ? guestSelectedAddress : "")
  const [locationStatus, setLocationStatus] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState("")
  const [homepageSection, setHomepageSection] = useState<"services" | "materials">("services")
  const [showAllServices, setShowAllServices] = useState(false)
  const [showAllDepartments, setShowAllDepartments] = useState(false)
  const [managerAddOns, setManagerAddOns] = useState<ManagerCatalogAddOns>(createEmptyManagerAddOns)
  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects])
  const selectedProjectIdForLinks = selectedProject?.id ?? ""
  const selectedAddressLabel = selectedProject?.address || selectedProject?.name || activeCustomAddress || "No selected address"
  const selectedProjectName = selectedProject?.address && selectedProject.name.trim() !== selectedProject.address.trim() ? selectedProject.name : null
  const selectedAddressHelper = locationStatus || selectedProjectName || (selectedAddressLabel === "No selected address" ? "Choose an address to keep every request connected to the right project." : "")
  const visibleCategories = useMemo(() => applyDepartmentAddOns(categories, managerAddOns), [categories, managerAddOns])
  const managerCategorySlugs = useMemo(() => new Set(managerAddOns.categories.map((category) => category.slug)), [managerAddOns.categories])
  const showProjectSelector = !homepageCompact
  const projectChoices = useMemo(() => {
    const query = projectSearch.trim().toLowerCase()
    if (!query) {
      const recentProjects = projects.slice(0, 5)
      if (!projectId || recentProjects.some((project) => project.id === projectId)) {
        return recentProjects
      }

      const currentProject = projects.find((project) => project.id === projectId)
      return currentProject ? [currentProject, ...recentProjects.slice(0, 4)] : recentProjects
    }

    return projects.filter((project) => `${project.name} ${project.address || ""}`.toLowerCase().includes(query))
  }, [projectId, projectSearch, projects])

  useEffect(() => {
    const syncManagerCategories = () => {
      setManagerAddOns(readManagerAddOns())
    }

    syncManagerCategories()
    window.addEventListener("storage", syncManagerCategories)
    window.addEventListener(MANAGER_ADD_ONS_UPDATED_EVENT, syncManagerCategories as EventListener)

    return () => {
      window.removeEventListener("storage", syncManagerCategories)
      window.removeEventListener(MANAGER_ADD_ONS_UPDATED_EVENT, syncManagerCategories as EventListener)
    }
  }, [])

  function handleAddressSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSignedIn) return

    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const address = String(formData.get("address") || "").trim()
    if (!address) return

    createGuestProject(address, address)
    setProjectId("")
    setSelectedCustomAddress(address)
    setLocationStatus("Project saved on this device. You can keep shopping as a guest.")
    setAddressPickerOpen(false)
  }

  async function saveResolvedLocation(latitude: number, longitude: number) {
    const response = await fetch(`/api/location/reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`, {
      headers: { Accept: "application/json" },
    })
    const result = (await response.json().catch(() => null)) as { address?: string; error?: string } | null

    if (!response.ok || !result?.address) {
      throw new Error(result?.error || "We could not find the street address for this location.")
    }

    const locationAddress = result.address.trim()
    setProjectId("")
    setSelectedCustomAddress(locationAddress)

    if (!isSignedIn) {
      createGuestProject(locationAddress, locationAddress)
      setLocationStatus("Current address selected.")
      setAddressPickerOpen(false)
      return
    }

    setLocationStatus(`Address found: ${locationAddress}. Saving project...`)
    window.location.href = `/shop/add-address?address=${encodeURIComponent(locationAddress)}`
  }

  function useCurrentLocation() {
    if (!window.isSecureContext) {
      setLocationStatus("Current location needs HTTPS. Type the address instead for this preview link.")
      return
    }

    if (!navigator.geolocation) {
      setLocationStatus("Location is not available on this device.")
      return
    }

    setIsLocating(true)
    setLocationStatus("Finding your exact address...")
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await saveResolvedLocation(position.coords.latitude, position.coords.longitude)
        } catch (error) {
          setLocationStatus(error instanceof Error ? error.message : "We found your location but could not resolve its street address. Please type the address instead.")
        } finally {
          setIsLocating(false)
        }
      },
      () => {
        setIsLocating(false)
        setLocationStatus("Location permission was not available. Please type the address instead.")
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <ShopTranslationBoundary><div className="grid gap-1">
      {!homepageCompact ? <header className="relative max-w-3xl border-l-2 border-[#0071e3] pb-4 pl-4 pr-1 pt-1 sm:pb-6 sm:pl-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">Avantia builder shop</p>
        <h1 className="mt-1.5 text-[1.85rem] font-semibold leading-[1.1] tracking-[0] text-[#111] sm:text-[2.45rem]">Everything a builder needs.</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-6 tracking-[0] text-[#60646c] sm:text-base">Materials, pricing, delivery, and jobsite support, organized in one place.</p>
      </header> : null}

      {homepageCompact ? (
        <div className="mb-2 grid grid-cols-2 rounded-md border border-slate-200 bg-white p-1 sm:hidden" aria-label="Shop section">
          <button type="button" onClick={() => setHomepageSection("services")} aria-pressed={homepageSection === "services"} className={`min-h-11 rounded px-3 text-sm font-semibold ${homepageSection === "services" ? "bg-[#071126] text-white" : "text-slate-600"}`}>Services</button>
          <button type="button" onClick={() => setHomepageSection("materials")} aria-pressed={homepageSection === "materials"} className={`min-h-11 rounded px-3 text-sm font-semibold ${homepageSection === "materials" ? "bg-[#071126] text-white" : "text-slate-600"}`}>Materials</button>
        </div>
      ) : null}

      {showProjectSelector ? <section className="max-w-3xl rounded-[18px] border border-black/[0.06] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.045)] sm:p-3.5">
        <button
          type="button"
          onClick={() => {
            setProjectSearch("")
            setAddressPickerOpen((open) => !open)
          }}
          aria-expanded={addressPickerOpen}
          aria-controls="address-picker-panel"
          className="group grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 text-left outline-none"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0E2A4A] text-white shadow-[0_6px_16px_rgba(14,42,74,0.16)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">Project address</span>
            <span data-testid="project-address-value" className="mt-0.5 block min-w-0 text-[15px] font-semibold leading-5 text-[#1d1d1f] [overflow-wrap:anywhere]">{selectedAddressLabel}</span>
            {selectedAddressHelper ? <span aria-live="polite" className="mt-0.5 block text-[11px] leading-4 text-slate-500">{selectedAddressHelper}</span> : null}
          </span>
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-[#0066cc] transition group-hover:bg-slate-200">
            {addressPickerOpen ? "Close" : selectedAddressLabel === "No selected address" ? "Add" : "Change"}
          </span>
        </button>
        {projectCreated ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            Project saved and selected.
          </div>
        ) : null}
        {projectError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            Could not save this address as a project. The address is still selected for now.
          </div>
        ) : null}

        {addressPickerOpen ? (
          <div id="address-picker-panel" data-testid="address-picker-panel" className="mt-4 rounded-[22px] border border-slate-200 bg-[#f5f5f7] p-3">
            <div className="flex items-center justify-between gap-3 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Select an address</h3>
                <p className="mt-0.5 text-xs text-slate-500">Use a saved project, add an address, or locate this device.</p>
              </div>
              <button
                type="button"
                onClick={() => setAddressPickerOpen(false)}
                aria-label="Close address selector"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="m6 6 12 12" />
                  <path d="m18 6-12 12" />
                </svg>
              </button>
            </div>
            <form action={isSignedIn ? "/shop/add-address" : undefined} method="get" onSubmit={handleAddressSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                name="address"
                list="shop-address-suggestions"
                autoComplete="street-address"
                inputMode="text"
                placeholder="Add a new address"
                className="h-12 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
              <datalist id="shop-address-suggestions">
                {projects.map((project) => (
                  <option key={project.id} value={project.address || project.name} />
                ))}
              </datalist>
              <button type="submit" className="h-12 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800">
                {isSignedIn ? "Save project" : "Use address"}
              </button>
            </form>
            {!isSignedIn ? (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                This saves on your device for now. Login happens only when you submit your request.
              </div>
            ) : null}

            {projects.length > 5 ? (
              <label className="mt-3 flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="sr-only">Search saved projects</span>
                <input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search saved projects"
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            ) : null}

          <div className="mt-3 grid max-h-[17rem] gap-1 overflow-y-auto border-t border-slate-200 pt-2 [overscroll-behavior:contain]">
            <Link href="/shop" prefetch={false} onClick={() => {
              setProjectId("")
              setSelectedCustomAddress("")
              if (!isSignedIn) clearSelectedGuestProject()
              setAddressPickerOpen(false)
            }} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white">
              <span className={`h-6 w-6 shrink-0 rounded-full border-2 ${!selectedProject && !activeCustomAddress ? "border-slate-950 shadow-[inset_0_0_0_5px_white] bg-slate-950" : "border-slate-400"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold leading-6 text-slate-950">No selected address</span>
                <span className="block text-sm leading-5 text-slate-500">Continue without choosing a project</span>
              </span>
            </Link>

            {activeCustomAddress ? (
              <button type="button" onClick={() => setAddressPickerOpen(false)} className="flex w-full items-center gap-3 rounded-2xl bg-white px-2 py-2.5 text-left shadow-sm">
                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-950 bg-slate-950 shadow-[inset_0_0_0_5px_white]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold leading-6 text-slate-950 [overflow-wrap:anywhere]">{activeCustomAddress}</span>
                  <span className="block text-sm leading-5 text-slate-500">Current selection</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-emerald-700">Selected</span>
              </button>
            ) : null}

            {projectChoices.map((project) => {
              const address = project.address || project.name
              const selected = selectedProject?.id === project.id
              const projectName = project.address && project.name.trim() !== project.address.trim() ? project.name : "Saved project"

              return (
                <Link key={project.id} href={buildShopHref(project.id)} prefetch={false} onClick={() => {
                  setProjectId(project.id)
                  setSelectedCustomAddress("")
                  setAddressPickerOpen(false)
                }} className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white ${selected ? "bg-white shadow-sm" : ""}`}>
                  <span className={`h-6 w-6 shrink-0 rounded-full border-2 ${selected ? "border-slate-950 shadow-[inset_0_0_0_5px_white] bg-slate-950" : "border-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold leading-6 text-slate-950 [overflow-wrap:anywhere]">{address}</span>
                    <span className="block text-sm leading-5 text-slate-500">{projectName}</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold ${selected ? "text-emerald-700" : "text-[#0066cc]"}`}>{selected ? "Selected" : "Select"}</span>
                </Link>
              )
            })}
            {projectSearch && projectChoices.length === 0 ? (
              <p className="px-2 py-5 text-center text-sm text-slate-500">No matching projects.</p>
            ) : null}
          </div>

          {projects.length > 5 && !projectSearch ? (
            <Link href="/projects" prefetch={false} className="mt-2 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-[#0066cc]">
              View all {projects.length} projects
            </Link>
          ) : null}

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={isLocating}
            className="mt-4 flex w-full items-center gap-3 border-t border-slate-100 px-1 py-4 text-left text-lg font-bold text-slate-950 transition hover:bg-slate-50 disabled:cursor-wait disabled:text-slate-500"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-slate-950" aria-hidden="true">
              <path d="M20.3 3.7 3.1 10.9c-.9.4-.8 1.7.2 1.9l7.1 1.1 1.1 7.1c.2 1 1.5 1.1 1.9.2l7.2-17.2c.1-.3 0-.5-.1-.6-.1-.1-.3-.2-.6-.1Z" />
            </svg>
            {isLocating ? "Finding exact address..." : "Use current location"}
          </button>
          </div>
        ) : null}
      </section> : null}

      <section data-testid="homepage-services-section" className={`${homepageCompact && homepageSection !== "services" ? "hidden sm:block" : "block"} mt-1 min-w-0 border-t border-slate-200/80 py-4 sm:py-6`}>
        <div className="px-1">
          {!homepageCompact ? <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">Project support</p> : null}
          <h2 className="text-[1.4rem] font-semibold leading-tight tracking-[0] text-[#171717] sm:text-[1.75rem]">Choose a service</h2>
          {!homepageCompact ? <p className="mt-1 text-[13px] leading-5 text-slate-500 sm:text-sm">Send a quote, plan, list, or jobsite need. We will organize the next step.</p> : null}
        </div>

        <div data-testid="fast-service-grid" className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5 px-1 sm:grid-cols-5 sm:gap-x-4 lg:grid-cols-10">
          {FAST_SERVICES.map((service, index) => {
            return (
              <Link
                key={service.label}
                href={service.href}
                prefetch={false}
                className={`group min-w-0 touch-manipulation flex-col items-center text-center focus-visible:outline-none ${homepageCompact && index >= 4 && !showAllServices ? "hidden sm:flex" : "flex"}`}
              >
                <span
                  data-testid="service-image"
                  role="img"
                  aria-label={`${service.label} service`}
                  className="block aspect-square w-full max-w-[6.25rem] bg-white bg-no-repeat mix-blend-multiply transition duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-[1.035] group-focus-visible:ring-2 group-focus-visible:ring-[#0071e3] sm:max-w-[7.25rem]"
                  style={{
                    backgroundImage: "url(/images/department-essentials/service-tools-grid.webp)",
                    backgroundPosition: service.imagePosition,
                    backgroundSize: "300% 300%",
                  }}
                />
                <span className="mt-1.5 block text-[12px] font-semibold leading-4 tracking-[0] text-[#181818] transition-colors group-hover:text-[#0066cc] [overflow-wrap:anywhere] sm:text-[13px]">{service.label}</span>
                <span className="mt-0.5 hidden max-w-[13ch] text-[11px] leading-4 text-slate-500 sm:block">{service.description}</span>
              </Link>
            )
          })}
        </div>
        {homepageCompact ? <button type="button" onClick={() => setShowAllServices((shown) => !shown)} className="mx-auto mt-4 flex min-h-10 items-center justify-center rounded border border-slate-300 bg-white px-5 text-sm font-semibold text-[#0066cc] sm:hidden">{showAllServices ? "Show less" : "View all services"}</button> : null}
      </section>

      <section data-testid="homepage-materials-section" className={`${homepageCompact && homepageSection !== "materials" ? "hidden sm:block" : "block"} min-w-0 border-t border-slate-200/80 py-5 sm:py-7`}>
        <div className="px-1">
          {!homepageCompact ? <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">Material departments</p> : null}
          <h2 className="text-[1.4rem] font-semibold leading-tight tracking-[0] text-[#171717] sm:text-[1.75rem]">Shop materials</h2>
          {!homepageCompact ? <p className="mt-1 text-[13px] leading-5 text-slate-500 sm:text-sm">Choose a department to build a list, upload details, or request current pricing.</p> : null}
        </div>

        <div data-testid="department-grid" className="mt-4 grid w-full min-w-0 grid-cols-3 gap-x-2 gap-y-5 px-1 pb-3 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-6">
          {visibleCategories.map((category, index) => {
            const isManagerCategory = managerCategorySlugs.has(category.slug)
            const href = isManagerCategory
              ? buildCategoryFilterHref(category.label, selectedProjectIdForLinks, activeCustomAddress)
              : buildToolHref(category.slug, selectedProjectIdForLinks, activeCustomAddress)
            const cutout = CATEGORY_CUTOUTS[category.slug]

            return (
              <Link
                key={category.slug}
                href={href}
                prefetch={false}
                data-testid="department-card"
                className={`group min-w-0 touch-manipulation flex-col items-center bg-transparent text-center focus-visible:outline-none ${homepageCompact && index >= 6 && !showAllDepartments ? "hidden sm:flex" : "flex"}`}
              >
                <span className="relative block aspect-square w-full max-w-[6.5rem] overflow-hidden bg-transparent transition duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-[1.035] group-focus-visible:ring-2 group-focus-visible:ring-[#0071e3] sm:max-w-[8rem]">
                  {cutout ? (
                    <span
                      role="img"
                      aria-label={category.imageAlt}
                      className="absolute inset-0 bg-transparent bg-no-repeat mix-blend-multiply"
                      style={{ backgroundImage: `url(${cutout.imageUrl})`, backgroundPosition: cutout.imagePosition, backgroundSize: cutout.imageSize ?? "400% 200%" }}
                    />
                  ) : (
                    <Image
                      src={category.imageUrl}
                      alt={category.imageAlt}
                      fill
                      sizes="(max-width: 639px) 32vw, (max-width: 1023px) 24vw, 18vw"
                      className="scale-[0.9] object-contain mix-blend-multiply"
                    />
                  )}
                </span>
                <span className="mt-1.5 block w-full min-w-0 px-0.5 text-[12px] font-semibold leading-4 tracking-[0] text-[#181818] transition-colors group-hover:text-[#0066cc] [overflow-wrap:anywhere] sm:mt-2 sm:text-[14px] sm:leading-5">
                  {category.label}
                </span>
              </Link>
            )
          })}
          {EXTRA_DEPARTMENTS.map((department, index) => (
            <Link
              key={department.label}
              href={department.href}
              prefetch={false}
              data-testid="department-card"
              className={`group min-w-0 touch-manipulation flex-col items-center bg-transparent text-center focus-visible:outline-none ${homepageCompact && visibleCategories.length + index >= 6 && !showAllDepartments ? "hidden sm:flex" : "flex"}`}
            >
              <span
                data-testid="expanded-department-image"
                role="img"
                aria-label={`${department.label} materials`}
                className="relative block aspect-square w-full max-w-[6.5rem] overflow-hidden bg-transparent bg-no-repeat mix-blend-multiply transition duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-[1.035] group-focus-visible:ring-2 group-focus-visible:ring-[#0071e3] sm:max-w-[8rem]"
                style={{
                  backgroundImage: "url(/images/department-essentials/expanded-materials-grid.webp)",
                  backgroundPosition: department.imagePosition,
                  backgroundSize: "300% 200%",
                }}
              />
              <span className="mt-1.5 block w-full min-w-0 px-0.5 text-[12px] font-semibold leading-4 tracking-[0] text-[#181818] transition-colors group-hover:text-[#0066cc] [overflow-wrap:anywhere] sm:mt-2 sm:text-[14px] sm:leading-5">
                {department.label}
              </span>
            </Link>
          ))}
        </div>
        {homepageCompact ? <button type="button" onClick={() => setShowAllDepartments((shown) => !shown)} className="mx-auto mt-2 flex min-h-10 items-center justify-center rounded border border-slate-300 bg-white px-5 text-sm font-semibold text-[#0066cc] sm:hidden">{showAllDepartments ? "Show less" : "View all materials"}</button> : null}
      </section>
    </div></ShopTranslationBoundary>
  )
}
