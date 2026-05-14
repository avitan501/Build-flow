"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { recordShopActivity } from "@/app/shop/actions"
import { placeholderImageMetadata, type ShopCatalogProduct } from "@/lib/shop-catalog"
import type { ShopActivityEvent } from "@/lib/shop-activity"
import { buildSuggestedProducts, getShopActivitySessionId, readLocalShopActivity, writeLocalShopActivity } from "@/lib/shop-activity"
import { SHOP_CART_UPDATED_EVENT, SHOP_SAVE_UPDATED_EVENT, readShopCartCount, readShopSavedIds, readShopCartMap, writeShopCartMap } from "@/lib/shop-cart"

type ShopCatalogExperienceProps = {
  products: ShopCatalogProduct[]
  recentActivity?: ShopActivityEvent[]
}

type SortMode = "featured" | "price-low" | "price-high"
type BrowseTab = "materials" | "services" | "deals" | "suppliers" | "saved" | "cart"

const SHOP_CATEGORIES = [
  "All",
  "Services",
  "Lumber",
  "Plywood",
  "Drywall",
  "Concrete",
  "Roofing",
  "Insulation",
  "Hardware",
  "Electrical",
  "Plumbing",
  "Tools",
  "Doors",
  "Trim",
  "Windows",
  "Flooring",
  "Appliances",
  "Glass",
  "Lighting",
  "Tile",
  "Cabinets",
] as const

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-low", label: "Price low" },
  { key: "price-high", label: "Price high" },
]

function formatCurrency(value: number) {
  const [dollars, cents] = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value).split(".")
  return { dollars, cents: cents ?? "00" }
}

function categoryImage(category: string) {
  return placeholderImageMetadata(category === "All" ? "Materials" : category, category).imageUrl
}

function MaterialsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function ServiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h8" />
      <path d="m17 10 3 3-3 3" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 17h4V5H2v12h3" />
      <path d="M14 8h4l4 4v5h-3" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.69L22 7H6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function SuggestedProductCard({ product }: { product: ShopCatalogProduct }) {
  const price = formatCurrency(product.price)

  return (
    <Link href={`/shop/${product.slug}`} className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="48px" className="object-contain p-1.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{product.name}</span>
        <span className="block text-[11px] text-slate-500">{product.unit}</span>
      </span>
      <span className="text-sm font-bold text-slate-950">{price.dollars}<span className="text-[10px] align-top">.{price.cents}</span></span>
    </Link>
  )
}

function ServiceListCard({ product }: { product: ShopCatalogProduct }) {
  const price = formatCurrency(product.price)

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
    >
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700">
        <ServiceIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 inline-flex rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">Service</span>
        <span className="block truncate text-sm font-semibold text-slate-950">{product.name}</span>
        <span className="mt-1 block line-clamp-2 text-[12px] leading-5 text-slate-600">{product.shortDescription || product.description}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-base font-bold text-slate-950">{price.dollars}<span className="text-[10px] align-top">.{price.cents}</span></span>
        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">View details</span>
      </span>
    </Link>
  )
}

function ShopProductCard({ product, onQuickAdd }: { product: ShopCatalogProduct; onQuickAdd: (productId: string) => number }) {
  const price = formatCurrency(product.price)
  const isService = product.productType === "service"

  return (
    <article className="group flex h-full min-h-[228px] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.10)]">
      <Link href={`/shop/${product.slug}`} className="block border-b border-slate-100 bg-slate-50/70 p-2.5 sm:p-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-white">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1280px) 18vw, (min-width: 768px) 24vw, 42vw"
            className="object-contain p-2 transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-0.5 text-slate-950">
              <span className="text-[1.15rem] font-bold leading-none">{price.dollars}</span>
              <span className="pt-0.5 text-[11px] font-bold leading-none">.{price.cents}</span>
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">{product.unit}</div>
          </div>
          {isService ? (
            <div className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
              Service
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onQuickAdd(product.id)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_24px_rgba(34,197,94,0.28)] transition hover:bg-emerald-600"
              aria-label={`Add ${product.name} to cart`}
            >
              <PlusIcon />
            </button>
          )}
        </div>

        <Link href={`/shop/${product.slug}`} className="mt-2.5 block text-[0.92rem] font-semibold leading-5 text-slate-900">
          <span className="line-clamp-2">{product.name}</span>
        </Link>

        {isService ? (
          <>
            <div className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-600">{product.shortDescription || product.description}</div>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">View details</div>
          </>
        ) : null}
      </div>
    </article>
  )
}

export function ShopCatalogExperience({ products, recentActivity = [] }: ShopCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sortMode, setSortMode] = useState<SortMode>("featured")
  const [cartCount, setCartCount] = useState(0)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [browseTab, setBrowseTab] = useState<BrowseTab>("materials")
  const [localActivity, setLocalActivity] = useState<ShopActivityEvent[]>([])
  const supplierSectionRef = useRef<HTMLElement>(null)
  const serviceSectionRef = useRef<HTMLElement>(null)
  const lastSearchRef = useRef("")
  const lastCategoryRef = useRef("")

  const query = (searchParams.get("q") ?? "").trim()
  const normalizedQuery = query.toLowerCase()
  const activeCategory = searchParams.get("category")?.trim() || "All"

  useEffect(() => {
    const sync = () => {
      setCartCount(readShopCartCount())
      setSavedIds(readShopSavedIds())
      setLocalActivity(readLocalShopActivity())
    }

    sync()
    window.addEventListener(SHOP_CART_UPDATED_EVENT, sync)
    window.addEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener(SHOP_CART_UPDATED_EVENT, sync)
      window.removeEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    }
  }, [])

  function trackActivity(event: ShopActivityEvent) {
    writeLocalShopActivity(event)
    setLocalActivity(readLocalShopActivity())
    void recordShopActivity({
      eventType: event.eventType,
      sessionId: getShopActivitySessionId(),
      query: event.query,
      productSlug: event.productSlug,
      productName: event.productName,
      category: event.category,
      metadata: null,
    })
  }

  useEffect(() => {
    if (!query || lastSearchRef.current === query) return
    lastSearchRef.current = query
    trackActivity({ eventType: "search", query })
  }, [query])

  useEffect(() => {
    if (!activeCategory || activeCategory === "All" || lastCategoryRef.current === activeCategory) return
    lastCategoryRef.current = activeCategory
    trackActivity({ eventType: "category_select", category: activeCategory })
  }, [activeCategory])

  const categorySummaries = SHOP_CATEGORIES.map((category) => {
    const count = category === "All" ? products.length : products.filter((product) => product.imageCategory === category || product.category === category).length
    return { name: category, image: categoryImage(category), count }
  })

  const supplierSummaries = Object.values(
    products.reduce<Record<string, { name: string; count: number; image: string }>>((acc, product) => {
      const key = product.supplierName || product.category
      if (!acc[key]) {
        acc[key] = {
          name: key,
          count: 0,
          image: product.imageUrl,
        }
      }
      acc[key].count += 1
      return acc
    }, {}),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const featuredProducts = [...products]
    .filter((product) => product.productType !== "service")
    .sort((a, b) => b.rating - a.rating || a.price - b.price)
    .slice(0, 8)

  const dealProducts = [...products]
    .filter((product) => product.productType !== "service")
    .sort((a, b) => a.price - b.price || b.rating - a.rating)
    .slice(0, 8)

  const savedProducts = products.filter((product) => savedIds.includes(product.id))
  const serviceProducts = products.filter((product) => product.productType === "service")
  const mergedActivity = [...localActivity, ...recentActivity]
  const suggestedProducts = buildSuggestedProducts(products, mergedActivity, 6)

  const filteredProducts = (() => {
    const base = products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.imageCategory === activeCategory || product.category === activeCategory
      const haystack = [product.name, product.category, product.imageCategory, product.description, product.unit, product.specLine, product.supplierName || "", product.quoteNumber || "", product.popularUse]
        .join(" ")
        .toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      const matchesSaved = browseTab !== "saved" || savedIds.includes(product.id)
      return matchesCategory && matchesQuery && matchesSaved
    })

    switch (sortMode) {
      case "price-low":
        return [...base].sort((a, b) => a.price - b.price)
      case "price-high":
        return [...base].sort((a, b) => b.price - a.price)
      default:
        return [...base].sort((a, b) => {
          const featuredDelta = Number(b.featuredLabel.includes("Popular")) - Number(a.featuredLabel.includes("Popular"))
          return featuredDelta || b.rating - a.rating
        })
    }
  })()

  const materialFilteredProducts = filteredProducts.filter((product) => product.productType !== "service")

  const resultLabel = query ? `Search results for "${query}"` : browseTab === "saved" ? "Saved materials" : activeCategory === "All" ? "All materials" : activeCategory

  function applyFilters(next: { query?: string; category?: string; close?: boolean }) {
    const params = new URLSearchParams(searchParams.toString())
    const nextQuery = next.query ?? query
    const nextCategory = next.category ?? activeCategory

    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim())
    } else {
      params.delete("q")
    }

    if (!nextCategory || nextCategory === "All") {
      params.delete("category")
    } else {
      params.set("category", nextCategory)
    }

    const queryString = params.toString()
    router.replace(queryString ? `/shop?${queryString}` : "/shop", { scroll: false })

  }

  function setCategory(nextCategory: string) {
    setBrowseTab(nextCategory === "Services" ? "services" : "materials")
    applyFilters({ category: nextCategory })
    trackActivity({ eventType: "category_select", category: nextCategory })
  }

  function quickAdd(productId: string) {
    const current = readShopCartMap()
    const nextQty = (current[productId] || 0) + 1
    writeShopCartMap({ ...current, [productId]: nextQty })
    setCartCount(readShopCartCount())
    const product = products.find((entry) => entry.id === productId)
    if (product) {
      trackActivity({ eventType: "add_to_cart", productSlug: product.slug, productName: product.name, category: product.category })
    }
    return nextQty
  }

  function activateTab(tab: BrowseTab) {
    if (tab === "cart") {
      router.push("/cart")
      return
    }

    setBrowseTab(tab)

    if (tab === "services") {
      setSortMode("featured")
      applyFilters({ category: "Services" })
      setTimeout(() => serviceSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
      return
    }

    if (tab === "suppliers") {
      supplierSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    if (tab === "deals") {
      setSortMode("price-low")
      applyFilters({ category: "All" })
      return
    }

    if (tab === "saved") {
      applyFilters({ category: activeCategory })
      return
    }

    setSortMode("featured")
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-3 py-3 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <section className="rounded-[24px] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { key: "materials", label: "Materials", icon: MaterialsIcon },
              { key: "services", label: "Services", icon: ServiceIcon },
              { key: "deals", label: "Deals", icon: TagIcon },
              { key: "suppliers", label: "Suppliers", icon: TruckIcon },
              { key: "saved", label: "Saved", icon: BookmarkIcon },
              { key: "cart", label: "Cart", icon: CartIcon },
            ].map((tab) => {
              const active = browseTab === tab.key
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => activateTab(tab.key as BrowseTab)}
                  className={`flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-2.5 text-center text-[11px] font-semibold transition sm:min-h-[76px] sm:text-xs ${
                    active ? "border-sky-300 bg-sky-50 text-sky-800" : "border-white bg-white text-slate-600 shadow-sm"
                  }`}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    <Icon {...(tab.key === "saved" ? { filled: active || savedIds.length > 0 } : {})} />
                  </span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Suggested for you</div>
              <div className="text-xs text-slate-500">Based on your recent shop activity</div>
            </div>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {suggestedProducts.map((product) => (
              <SuggestedProductCard key={`suggested-${product.slug}`} product={product} />
            ))}
          </div>
        </section>

        {serviceProducts.length > 0 ? (
          <section ref={serviceSectionRef} className="rounded-[24px] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Services</div>
              {browseTab !== "services" ? (
                <button type="button" onClick={() => activateTab("services")} className="text-sm font-semibold text-sky-700">
                  View all
                </button>
              ) : null}
            </div>
            <div className="grid gap-2.5 md:grid-cols-3">
              {(browseTab === "services" || activeCategory === "Services" ? serviceProducts : serviceProducts.slice(0, 3)).map((product) => (
                <ServiceListCard key={`service-${product.id}`} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[28px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-950">Deals on materials</div>
              <div className="text-sm text-slate-500">Fast picks with strong value and clean local images</div>
            </div>
            <button type="button" onClick={() => activateTab("deals")} className="text-sm font-semibold text-sky-700">
              Shop deals
            </button>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dealProducts.map((product) => (
              <div key={`deal-${product.id}`} className="w-[220px] shrink-0">
                <ShopProductCard product={product} onQuickAdd={quickAdd} />
              </div>
            ))}
          </div>
        </section>

        <section ref={supplierSectionRef} className="rounded-[28px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-950">Suppliers to help you build</div>
              <div className="text-sm text-slate-500">Real sources already present in the catalog</div>
            </div>
            <button type="button" onClick={() => setBrowseTab("materials")} className="text-sm font-semibold text-sky-700">
              Browse all
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {supplierSummaries.map((supplier) => (
              <button
                key={supplier.name}
                type="button"
                onClick={() => {
                  setBrowseTab("materials")
                  applyFilters({ query: supplier.name, category: "All" })
                }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-sky-200 hover:bg-sky-50"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Image src={supplier.image} alt="" fill sizes="56px" className="object-contain p-2" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{supplier.name}</span>
                  <span className="block text-xs text-slate-500">{supplier.count} item{supplier.count === 1 ? "" : "s"}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <nav aria-label="Shop categories" className="rounded-[28px] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categorySummaries.map((category) => {
              const active = activeCategory === category.name || (!searchParams.get("category") && category.name === "All")
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => setCategory(category.name)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 ${
                    active ? "border-sky-400 bg-sky-50 text-sky-800 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700"
                  }`}
                  aria-pressed={active}
                >
                  <span className="relative h-7 w-7 overflow-hidden rounded-full border border-slate-100 bg-slate-50">
                    <Image src={category.image} alt="" fill sizes="28px" className="object-contain p-1" />
                  </span>
                  <span>{category.name}</span>
                  <span className={`text-[11px] font-bold ${active ? "text-sky-600" : "text-slate-400"}`}>{category.count}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {savedProducts.length > 0 && browseTab !== "saved" ? (
          <section className="rounded-[28px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-950">Saved materials</div>
                <div className="text-sm text-slate-500">Quick access to items you bookmarked on product pages</div>
              </div>
              <button type="button" onClick={() => activateTab("saved")} className="text-sm font-semibold text-sky-700">
                View saved
              </button>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {savedProducts.slice(0, 6).map((product) => (
                <div key={`saved-${product.id}`} className="w-[220px] shrink-0">
                  <ShopProductCard product={product} onQuickAdd={quickAdd} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3 rounded-[28px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-normal text-slate-950 sm:text-2xl">{resultLabel}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{filteredProducts.length} items ready to browse</p>
          </div>

          <label className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:w-auto">
            <span className="text-slate-500">Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="min-w-[132px] bg-transparent text-sm font-semibold text-slate-900 outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {featuredProducts.length > 0 && !query && browseTab === "materials" ? (
          <section className="rounded-[28px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="text-lg font-bold text-slate-950">Featured materials</div>
            <div className="mt-1 text-sm text-slate-500">Popular picks for framing, finish, and rough-in work</div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {featuredProducts.map((product) => (
                <div key={`featured-${product.id}`} className="w-[220px] shrink-0">
                  <ShopProductCard product={product} onQuickAdd={quickAdd} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {materialFilteredProducts.length > 0 ? (
          <section aria-label="Products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {materialFilteredProducts.map((product) => (
              <ShopProductCard key={product.id} product={product} onQuickAdd={quickAdd} />
            ))}
          </section>
        ) : (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-semibold text-slate-950">No products found</h2>
            <p className="mt-2 text-sm text-slate-500">Try another category or update the search.</p>
          </section>
        )}
      </div>

    </main>
  )
}
