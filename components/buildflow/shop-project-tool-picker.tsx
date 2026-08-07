"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react"

import { DepartmentSymbolBadges } from "@/components/buildflow/department-symbol-badges"
import { clearSelectedGuestProject, createGuestProject, GUEST_PROJECTS_UPDATED_EVENT, readSelectedGuestProject } from "@/lib/guest-projects"
import { MANAGER_ADD_ONS_UPDATED_EVENT, applyDepartmentAddOns, readManagerAddOns, type ManagerCatalogAddOns } from "@/lib/manager-add-ons"
import type { ProjectRecord } from "@/lib/projects"
import type { ShopToolCategory } from "@/lib/shop-tools"

type ShopProjectToolPickerProps = {
  projects: ProjectRecord[]
  categories: ShopToolCategory[]
  selectedProjectId?: string
  selectedAddress?: string
  isSignedIn?: boolean
  projectCreated?: boolean
  projectError?: boolean
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

function categoryProductGridUrl(category: ShopToolCategory) {
  return category.imageUrl
}

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

export function ShopProjectToolPicker({
  projects,
  categories,
  selectedProjectId = "",
  selectedAddress = "",
  isSignedIn = false,
  projectCreated = false,
  projectError = false,
}: ShopProjectToolPickerProps) {
  const [projectId, setProjectId] = useState(selectedProjectId)
  const [selectedCustomAddress, setSelectedCustomAddress] = useState(selectedAddress)
  const guestSelectedAddress = useSyncExternalStore(subscribeToGuestProject, getSelectedGuestAddress, getServerGuestAddress)
  const activeCustomAddress = selectedCustomAddress || (!isSignedIn ? guestSelectedAddress : "")
  const [locationStatus, setLocationStatus] = useState("")
  const [isLocating, setIsLocating] = useState(false)
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState("")
  const [managerAddOns, setManagerAddOns] = useState<ManagerCatalogAddOns>(() => readManagerAddOns())
  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects])
  const selectedProjectIdForLinks = selectedProject?.id ?? ""
  const selectedAddressLabel = selectedProject?.address || selectedProject?.name || activeCustomAddress || "No selected address"
  const selectedProjectName = selectedProject?.address && selectedProject.name.trim() !== selectedProject.address.trim() ? selectedProject.name : null
  const selectedAddressHelper = locationStatus || selectedProjectName || (selectedAddressLabel === "No selected address" ? "Choose an address to keep every request connected to the right project." : "")
  const visibleCategories = useMemo(() => applyDepartmentAddOns(categories, managerAddOns), [categories, managerAddOns])
  const managerCategorySlugs = useMemo(() => new Set(managerAddOns.categories.map((category) => category.slug)), [managerAddOns.categories])
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
    <div className="grid gap-4">
      <section className="rounded-[24px] border border-black/[0.06] bg-white px-4 py-4 shadow-[0_12px_36px_rgba(0,0,0,0.05)] sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0E2A4A] text-white shadow-[0_8px_20px_rgba(14,42,74,0.18)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">Project address</p>
            <button
              type="button"
              onClick={() => {
                setProjectSearch("")
                setAddressPickerOpen((open) => !open)
              }}
              aria-expanded={addressPickerOpen}
              aria-controls="address-picker-panel"
              className="mt-1 flex w-full min-w-0 items-center justify-between gap-3 text-left outline-none"
            >
              <span data-testid="project-address-value" className="min-w-0 text-base font-semibold leading-6 text-[#1d1d1f] [overflow-wrap:anywhere]">{selectedAddressLabel}</span>
              <span className="shrink-0 text-sm font-semibold text-[#0066cc]">{addressPickerOpen ? "Close" : selectedAddressLabel === "No selected address" ? "Add" : "Change"}</span>
            </button>
            {selectedAddressHelper ? <p aria-live="polite" className="mt-1 text-xs leading-5 text-slate-500">{selectedAddressHelper}</p> : null}
          </div>
          <Link
            href="/projects"
            prefetch={false}
            className="hidden min-h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-[#1d1d1f] transition hover:bg-slate-50 sm:inline-flex"
          >
            My Projects
          </Link>
        </div>
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
      </section>

      <section className="min-w-0 py-5 sm:py-7">
        <div className="px-1">
          <div>
            <h2 className="text-[1.85rem] font-semibold leading-tight text-[#1d1d1f] sm:text-[2.35rem]">Shop by department</h2>
            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">Materials, services, calculators, and plan uploads.</p>
          </div>
        </div>

        <div data-testid="department-grid" className="mt-5 grid w-full min-w-0 grid-cols-3 gap-3 px-1 pb-4 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5">
          {visibleCategories.map((category) => {
            const isManagerCategory = managerCategorySlugs.has(category.slug)
            const href = isManagerCategory
              ? buildCategoryFilterHref(category.label, selectedProjectIdForLinks, activeCustomAddress)
              : buildToolHref(category.slug, selectedProjectIdForLinks, activeCustomAddress)
            const productGridUrl = categoryProductGridUrl(category)

            return (
              <Link
                key={category.slug}
                href={href}
                prefetch={false}
                data-testid="department-card"
                className="group flex min-h-[150px] min-w-0 touch-manipulation flex-col overflow-hidden rounded-lg border border-black/[0.08] bg-white text-left shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-black/[0.14] hover:shadow-[0_16px_34px_rgba(0,0,0,0.10)] active:scale-[0.98] sm:min-h-[176px]"
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden border-b border-black/[0.06] bg-[#fafafa]">
                  <Image
                    src={productGridUrl}
                    alt={`${category.label} products`}
                    fill
                    sizes="(max-width: 639px) 32vw, (max-width: 1023px) 24vw, 18vw"
                    className="object-contain p-2 transition duration-300 group-hover:scale-[1.025] sm:p-3"
                  />
                  <span className="absolute left-2 top-2">
                    <DepartmentSymbolBadges symbols={category.symbols} compact />
                  </span>
                </span>
                <span className="flex min-h-12 w-full min-w-0 items-center px-3 py-2 text-[12px] font-bold leading-4 text-[#1d1d1f] [overflow-wrap:anywhere] sm:min-h-14 sm:text-[14px] sm:leading-5">
                  {category.label}
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
