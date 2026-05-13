"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import type { ShopCatalogProduct } from "@/lib/shop-catalog"

type ShopCatalogExperienceProps = {
  products: ShopCatalogProduct[]
}

type SortMode = "featured" | "price-low" | "price-high" | "unit"
type CollectionMode = "all" | "framing"

const CATEGORY_CONFIG = [
  { name: "Lumber", image: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=800&q=80" },
  { name: "Plywood", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80" },
  { name: "Treated Lumber", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80" },
  { name: "LVL Beams", image: "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=800&q=80" },
  { name: "Fasteners", image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80" },
  { name: "Hangers", image: "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?auto=format&fit=crop&w=800&q=80" },
  { name: "Adhesives", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80" },
  { name: "Flashing", image: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=800&q=80" },
] as const

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-low", label: "Price ↑" },
  { key: "price-high", label: "Price ↓" },
  { key: "unit", label: "Unit" },
]
const FRAMING_CATEGORIES = new Set(["Lumber", "Plywood", "LVL Beams", "Fasteners", "Hangers"])

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function ShopSimpleCard({ product, compact = false }: { product: ShopCatalogProduct; compact?: boolean }) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className={`group overflow-hidden rounded-[24px] border border-white/90 bg-white/96 shadow-[0_16px_34px_rgba(148,163,184,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(148,163,184,0.18)] active:scale-[0.99] ${compact ? "min-w-[210px] max-w-[210px] shrink-0" : ""}`}
    >
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f6fbff_0%,#ecf5ff_100%)]">
        <div className={`${compact ? "aspect-[1.08/1]" : "aspect-[1.08/1]"} overflow-hidden`}>
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]" loading="lazy" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-sky-50/35 to-transparent" />
      </div>
      <div className={`flex flex-col ${compact ? "p-3.5" : "p-4"}`}>
        <h3 className="line-clamp-2 text-[0.98rem] font-semibold tracking-[-0.03em] text-slate-950">{product.name}</h3>
        <div className="mt-3 text-lg font-semibold text-slate-950">{formatCurrency(product.price)}</div>
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-slate-400">{product.unit}</div>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-700 transition group-hover:gap-1.5">
          View details
          <ChevronRightIcon />
        </div>
      </div>
    </Link>
  )
}

export function ShopCatalogExperience({ products }: ShopCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sortMode, setSortMode] = useState<SortMode>("featured")
  const [collectionMode, setCollectionMode] = useState<CollectionMode>("all")

  const normalizedQuery = (searchParams.get("q") ?? "").trim().toLowerCase()
  const activeCategory = searchParams.get("category")?.trim() || null

  const categories = useMemo(
    () => CATEGORY_CONFIG.map((category) => ({ ...category, count: products.filter((product) => product.category === category.name).length })),
    [products],
  )

  const featuredProducts = useMemo(
    () => products.filter((product) => product.featuredLabel === "Popular for framing" || FRAMING_CATEGORIES.has(product.category)).slice(0, 6),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const base = products.filter((product) => {
      const matchesCategory = !activeCategory || product.category === activeCategory
      const matchesCollection = collectionMode === "all" || FRAMING_CATEGORIES.has(product.category)
      const haystack = [product.name, product.category, product.description, product.unit, product.specLine, product.supplierName || "", product.quoteNumber || "", product.popularUse]
        .join(" ")
        .toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesCategory && matchesCollection && matchesQuery
    })

    switch (sortMode) {
      case "price-low":
        return [...base].sort((a, b) => a.price - b.price)
      case "price-high":
        return [...base].sort((a, b) => b.price - a.price)
      case "unit":
        return [...base].sort((a, b) => a.unit.localeCompare(b.unit))
      default:
        return [...base].sort((a, b) => Number(b.featuredLabel === "Popular for framing") - Number(a.featuredLabel === "Popular for framing"))
    }
  }, [activeCategory, collectionMode, normalizedQuery, products, sortMode])

  function setCategory(nextCategory: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextCategory) {
      params.set("category", nextCategory)
      params.set("q", nextCategory)
    } else {
      params.delete("category")
      params.delete("q")
    }
    const queryString = params.toString()
    router.replace(queryString ? `/shop?${queryString}` : "/shop", { scroll: false })
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eaf4ff_0%,#f7fbff_34%,#eef6ff_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,248,255,0.92))] p-4 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.1rem] font-semibold tracking-[-0.04em] text-slate-950">Categories</h2>
            {activeCategory ? <button onClick={() => setCategory(null)} className="text-sm font-semibold text-sky-700">Clear</button> : null}
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category, index) => {
              const active = activeCategory === category.name
              return (
                <button
                  key={category.name}
                  onClick={() => setCategory(active ? null : category.name)}
                  className={`w-[122px] min-w-[122px] shrink-0 overflow-hidden rounded-[22px] border text-left shadow-[0_12px_24px_rgba(148,163,184,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_28px_rgba(148,163,184,0.16)] active:scale-[0.98] ${active ? "border-sky-300 bg-sky-50" : "border-white/90 bg-white/96"}`}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="h-[84px] overflow-hidden bg-slate-100">
                    <img src={category.image} alt={category.name} className="h-full w-full object-cover transition duration-500 hover:scale-[1.06]" loading="lazy" />
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-2 text-[13px] font-semibold leading-4 text-slate-950">{category.name}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{category.count} items</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(232,244,255,0.92))] p-4 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-950">Popular for framing</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-500">Top picks</span>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featuredProducts.map((product) => (
              <ShopSimpleCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/94 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-slate-950">Products</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{filteredProducts.length} results</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCollectionMode("all")} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${collectionMode === "all" ? "bg-slate-950 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700"}`}>All</button>
              <button onClick={() => setCollectionMode("framing")} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${collectionMode === "framing" ? "bg-slate-950 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700"}`}>Framing</button>
              {SORT_OPTIONS.map((option) => (
                <button key={option.key} onClick={() => setSortMode(option.key)} className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${sortMode === option.key ? "bg-sky-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700"}`}>{option.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ShopSimpleCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
