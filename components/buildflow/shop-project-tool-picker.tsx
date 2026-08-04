"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState, type FormEvent } from "react"

import { createGuestProject, readSelectedGuestProject } from "@/lib/guest-projects"
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
  const [selectedCustomAddress, setSelectedCustomAddress] = useState(() => {
    if (selectedAddress || isSignedIn) return selectedAddress
    const guestProject = readSelectedGuestProject()
    return guestProject?.address || guestProject?.name || ""
  })
  const [locationStatus, setLocationStatus] = useState("")
  const [managerAddOns, setManagerAddOns] = useState<ManagerCatalogAddOns>(() => readManagerAddOns())
  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects])
  const selectedProjectIdForLinks = selectedProject?.id ?? ""
  const selectedAddressLabel = selectedProject?.address || selectedProject?.name || selectedCustomAddress || "No selected address"
  const visibleCategories = useMemo(() => applyDepartmentAddOns(categories, managerAddOns), [categories, managerAddOns])
  const managerCategorySlugs = useMemo(() => new Set(managerAddOns.categories.map((category) => category.slug)), [managerAddOns.categories])

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

    const picker = document.getElementById("address-picker-details") as HTMLDetailsElement | null
    if (picker) picker.open = false
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

    setLocationStatus("Getting your location...")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationAddress = `Current location: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`
        setProjectId("")
        setSelectedCustomAddress(locationAddress)
        setLocationStatus(isSignedIn ? "Current location selected. Creating project..." : "Current location saved on this device.")
        if (!isSignedIn) {
          createGuestProject(locationAddress, locationAddress)
          return
        }
        window.location.href = `/shop/add-address?address=${encodeURIComponent(locationAddress)}`
      },
      () => {
        setLocationStatus("Could not read your location. You can type the address instead.")
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-[14px] border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_20px_rgba(148,163,184,0.08)]">
        <div className="flex items-center gap-2">
          <div className="shrink-0 text-sm font-bold text-slate-700">
            Working on:
          </div>
          <button
            type="button"
            onClick={() => {
              const picker = document.getElementById("address-picker-details") as HTMLDetailsElement | null
              if (picker) picker.open = true
            }}
            className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-900 outline-none transition hover:bg-white focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          >
            <span className="truncate">{selectedAddressLabel}</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m7 10 5-5 5 5" />
              <path d="m7 14 5 5 5-5" />
            </svg>
          </button>
          <Link
            href="/projects"
            className="hidden min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
          >
            My Projects
          </Link>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500">
          {selectedProject
            ? `Working on ${selectedProject.address || selectedProject.name}`
            : selectedCustomAddress
              ? `New address selected: ${selectedCustomAddress}`
              : "No address selected. This will be considered a new project when you add items."}
          {locationStatus ? ` ${locationStatus}` : ""}
        </p>
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

        <details id="address-picker-details" className="group mt-3 rounded-[14px] border border-slate-200 bg-slate-50">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-left marker:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-950">Choose address</span>
                <span className="block truncate text-xs text-slate-500">Add a new address or use current location</span>
              </span>
            </span>
            <span className="shrink-0 text-sm font-bold text-green-700 group-open:hidden">Open</span>
            <span className="hidden shrink-0 text-sm font-bold text-slate-500 group-open:inline">Close</span>
          </summary>

          <div className="border-t border-slate-200 px-3 pb-3 pt-3">
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
                This saves on your device for now. Login happens only when you submit the cart.
              </div>
            ) : null}

          <div className="mt-4 grid gap-1">
            <Link href="/shop" className="flex w-full items-center gap-3 rounded-2xl px-1 py-3 text-left transition hover:bg-slate-50">
              <span className={`h-6 w-6 shrink-0 rounded-full border-2 ${!selectedProject && !selectedCustomAddress ? "border-slate-950 shadow-[inset_0_0_0_5px_white] bg-slate-950" : "border-slate-400"}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold leading-6 text-slate-950">No selected address</span>
                <span className="block text-sm leading-5 text-slate-500">Start without an address for now</span>
              </span>
            </Link>

            {selectedCustomAddress ? (
              <Link href={buildShopHref("", selectedCustomAddress)} className="flex w-full items-center gap-3 rounded-2xl px-1 py-3 text-left transition hover:bg-slate-50">
                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-950 bg-slate-950 shadow-[inset_0_0_0_5px_white]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold leading-6 text-slate-950">{selectedCustomAddress}</span>
                  <span className="block text-sm leading-5 text-slate-500">New address</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-green-700">Edit</span>
              </Link>
            ) : null}

            {projects.map((project) => {
              const address = project.address || project.name
              const selected = selectedProject?.id === project.id

              return (
                <Link key={project.id} href={buildShopHref(project.id)} className="flex w-full items-center gap-3 rounded-2xl px-1 py-3 text-left transition hover:bg-slate-50">
                  <span className={`h-6 w-6 shrink-0 rounded-full border-2 ${selected ? "border-slate-950 shadow-[inset_0_0_0_5px_white] bg-slate-950" : "border-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold leading-6 text-slate-950">{address}</span>
                    <span className="block text-sm leading-5 text-slate-500">{project.address ? project.name : "Saved project"}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-green-700">Edit</span>
                </Link>
              )
            })}
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            className="mt-4 flex w-full items-center gap-3 border-t border-slate-100 px-1 py-4 text-left text-lg font-bold text-slate-950 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-slate-950" aria-hidden="true">
              <path d="M20.3 3.7 3.1 10.9c-.9.4-.8 1.7.2 1.9l7.1 1.1 1.1 7.1c.2 1 1.5 1.1 1.9.2l7.2-17.2c.1-.3 0-.5-.1-.6-.1-.1-.3-.2-.6-.1Z" />
            </svg>
            Use current location
          </button>
          <div className="border-t border-slate-100 px-1 py-4 text-sm font-semibold text-slate-600">USA</div>
        </div>
      </details>
      </section>

      <section>
        <h2 className="mb-3 text-[2rem] font-bold tracking-normal text-slate-950">Departments</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {visibleCategories.map((category) => {
            const isManagerCategory = managerCategorySlugs.has(category.slug)
            const href = isManagerCategory
              ? buildCategoryFilterHref(category.label, selectedProjectIdForLinks, selectedCustomAddress)
              : buildToolHref(category.slug, selectedProjectIdForLinks, selectedCustomAddress)
            const isIcon = category.imageUrl.endsWith(".svg")

            return (
              <Link
                key={category.slug}
                href={href}
                className="block touch-manipulation overflow-hidden rounded-[4px] border border-slate-100 bg-white text-center shadow-[0_5px_18px_rgba(15,23,42,0.10)] transition active:scale-[0.98] active:border-[#f96302]"
              >
                <span className={`flex aspect-square items-center justify-center ${isIcon ? "bg-white p-5" : "bg-slate-100 p-0"}`}>
                  <span className="relative block h-full w-full">
                    <Image
                      src={category.imageUrl}
                      alt={category.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 22vw, 46vw"
                      className={isIcon ? "object-contain" : "object-cover"}
                    />
                  </span>
                </span>
                <span className="flex min-h-[72px] items-center justify-center border-t border-slate-50 px-3 py-3 text-base font-bold leading-5 text-slate-800 sm:text-lg">
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
