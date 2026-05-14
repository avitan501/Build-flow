"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { placeholderImageMetadata, type ShopCatalogProduct } from "@/lib/shop-catalog"
import { SHOP_CART_UPDATED_EVENT, SHOP_SAVE_UPDATED_EVENT, readShopCartCount, readShopSavedIds, readShopCartMap, writeShopCartMap } from "@/lib/shop-cart"

type ShopCatalogExperienceProps = {
  products: ShopCatalogProduct[]
}

type SortMode = "featured" | "price-low" | "price-high"
type BrowseTab = "materials" | "deals" | "suppliers" | "saved" | "cart"

type SearchSuggestion = {
  label: string
  category: string
  image: string
}

const SHOP_CATEGORIES = [
  "All",
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

const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  "Lumber",
  "Plywood",
  "Drywall",
  "Doors",
  "Trim",
  "Windows",
  "Tile",
  "Cabinets",
  "Plumbing",
  "Electrical",
  "Glass",
  "Lighting",
  "Tools",
  "Concrete",
  "Roofing",
  "Insulation",
].map((label) => ({
  label,
  category: label,
  image: placeholderImageMetadata(label, label).imageUrl,
}))

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

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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

function ShopProductCard({ product, onQuickAdd }: { product: ShopCatalogProduct; onQuickAdd: (productId: string) => number }) {
  const price = formatCurrency(product.price)

  return (
    <article className="group flex h-full min-h-[292px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.10)]">
      <Link href={`/shop/${product.slug}`} className="block border-b border-slate-100 bg-slate-50/70 p-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 28vw, 44vw"
            className="object-contain p-3 transition duration-300 group-hover:scale-[1.04]"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-0.5 text-slate-950">
              <span className="text-[1.28rem] font-bold leading-none">{price.dollars}</span>
              <span className="pt-0.5 text-xs font-bold leading-none">.{price.cents}</span>
            </div>
            <div className="mt-0.5 text-[12px] font-medium text-slate-500">{product.unit}</div>
          </div>
          <button
            type="button"
            onClick={() => onQuickAdd(product.id)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_12px_24px_rgba(34,197,94,0.28)] transition hover:bg-emerald-600"
            aria-label={`Add ${product.name} to cart`}
          >
            <PlusIcon />
          </button>
        </div>

        <Link href={`/shop/${product.slug}`} className="mt-3 block min-h-[44px] text-[0.96rem] font-semibold leading-5 text-slate-900">
          <span className="line-clamp-2">{product.name}</span>
        </Link>

        <div className="mt-2 text-[12px] font-medium text-slate-500">Ready to quote</div>
      </div>
    </article>
  )
}

export function ShopCatalogExperience({ products }: ShopCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sortMode, setSortMode] = useState<SortMode>("featured")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [draftQuery, setDraftQuery] = useState("")
  const [cartCount, setCartCount] = useState(0)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [browseTab, setBrowseTab] = useState<BrowseTab>("materials")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supplierSectionRef = useRef<HTMLElement>(null)

  const query = (searchParams.get("q") ?? "").trim()
  const normalizedQuery = query.toLowerCase()
  const activeCategory = searchParams.get("category")?.trim() || "All"

  useEffect(() => {
    const sync = () => {
      setCartCount(readShopCartCount())
      setSavedIds(readShopSavedIds())
    }

    sync()
    window.addEventListener(SHOP_CART_UPDATED_EVENT, sync)
    window.addEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    return () => {
      window.removeEventListener(SHOP_CART_UPDATED_EVENT, sync)
      window.removeEventListener(SHOP_SAVE_UPDATED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    if (!isSearchOpen) return
    const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 60)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      window.clearTimeout(timeout)
      document.body.style.overflow = originalOverflow
    }
  }, [isSearchOpen])

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
    .sort((a, b) => b.rating - a.rating || a.price - b.price)
    .slice(0, 8)

  const dealProducts = [...products]
    .sort((a, b) => a.price - b.price || b.rating - a.rating)
    .slice(0, 8)

  const savedProducts = products.filter((product) => savedIds.includes(product.id))

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

  const visibleSuggestions = (() => {
    const term = normalize(draftQuery)
    if (!term) return SEARCH_SUGGESTIONS
    return SEARCH_SUGGESTIONS.filter((suggestion) => normalize(`${suggestion.label} ${suggestion.category}`).includes(term))
  })()

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

    if (next.close) {
      setIsSearchOpen(false)
    }
  }

  function setCategory(nextCategory: string) {
    setBrowseTab("materials")
    applyFilters({ category: nextCategory })
  }

  function submitSearch() {
    setBrowseTab("materials")
    applyFilters({ query: draftQuery, close: true })
  }

  function applySuggestion(suggestion: SearchSuggestion) {
    setBrowseTab("materials")
    setDraftQuery(suggestion.label)
    applyFilters({ query: suggestion.label, category: suggestion.category, close: true })
  }

  function quickAdd(productId: string) {
    const current = readShopCartMap()
    const nextQty = (current[productId] || 0) + 1
    writeShopCartMap({ ...current, [productId]: nextQty })
    setCartCount(readShopCartCount())
    return nextQty
  }

  function activateTab(tab: BrowseTab) {
    if (tab === "cart") {
      router.push("/cart")
      return
    }

    setBrowseTab(tab)

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
        <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#ffffff_0%,#f6fbff_100%)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">BuildFlow Shop</div>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Materials</h1>
            </div>
            <Link href="/cart" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
              <CartIcon />
              <span>Cart</span>
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-xs text-white">{cartCount}</span>
            </Link>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Project view</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-950">Materials</div>
                <div className="text-sm text-slate-500">Browse products, suppliers, and deals</div>
              </div>
              <TruckIcon />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDraftQuery(query)
              setIsSearchOpen(true)
            }}
            className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-full border border-slate-200 bg-slate-100/95 px-4 text-left text-slate-500 transition hover:border-sky-200 hover:bg-sky-50/80 hover:text-slate-700"
            aria-haspopup="dialog"
            aria-expanded={isSearchOpen}
            aria-controls="shop-search-overlay"
          >
            <span className="text-slate-400">
              <SearchIcon />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium sm:text-[15px]">{query || "Search materials and products"}</span>
          </button>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {[
              { key: "materials", label: "Materials", icon: SearchIcon },
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
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition ${
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

        {filteredProducts.length > 0 ? (
          <section aria-label="Products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {filteredProducts.map((product) => (
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

      {isSearchOpen ? (
        <div id="shop-search-overlay" role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-white/96 backdrop-blur-sm">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
            <div className="mb-4 grid grid-cols-[48px_1fr_48px] items-center">
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
                aria-label="Close search"
              >
                <CloseIcon />
              </button>
              <div className="text-center text-sm font-semibold tracking-[0.18em] text-slate-900">BUILDFLOW</div>
              <div />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <label htmlFor="shop-search-input" className="sr-only">
                Search materials and products
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-slate-400">
                  <SearchIcon />
                </span>
                <input
                  id="shop-search-input"
                  ref={searchInputRef}
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      submitSearch()
                    }
                  }}
                  placeholder="Search materials and products"
                  className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {draftQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftQuery("")
                      searchInputRef.current?.focus()
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Suggestions</div>
              <div className="space-y-1">
                {visibleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <Image src={suggestion.image} alt="" fill sizes="48px" className="object-contain p-1.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{suggestion.label}</span>
                      <span className="block truncate text-xs text-slate-500">Browse {suggestion.label.toLowerCase()} materials</span>
                    </span>
                    <span className="text-slate-400">
                      <SearchIcon />
                    </span>
                  </button>
                ))}
                {visibleSuggestions.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-slate-500">No quick suggestions match yet. Press search to filter the catalog.</div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBrowseTab("materials")
                  applyFilters({ query: "", category: "All", close: true })
                }}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={submitSearch}
                className="flex-1 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.25)] transition hover:bg-sky-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
