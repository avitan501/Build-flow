"use client"

import Link from "next/link"
import Image from "next/image"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { MATERIAL_IMAGE_CATEGORIES, placeholderImageMetadata, type ShopCatalogProduct } from "@/lib/shop-catalog"

type ShopCatalogExperienceProps = {
  products: ShopCatalogProduct[]
}

type SortMode = "featured" | "price-low" | "price-high" | "unit"
type CollectionMode = "all" | "framing"

const CATEGORY_CONFIG = MATERIAL_IMAGE_CATEGORIES.map((name) => ({ name, image: placeholderImageMetadata(name).imageUrl }))

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
      className={`group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md active:scale-[0.99] ${compact ? "min-w-[210px] max-w-[210px] shrink-0" : ""}`}
    >
      <div className="bg-slate-50 p-4">
        <div className="aspect-square overflow-hidden rounded-md border border-slate-100 bg-white">
          <Image src={product.imageUrl} alt={product.imageAlt} width={800} height={800} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
        </div>
      </div>
      <div className={`flex flex-col ${compact ? "p-3.5" : "p-4"}`}>
        <h3 className="line-clamp-2 min-h-12 text-[0.98rem] font-semibold text-slate-950">{product.name}</h3>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-lg font-semibold text-slate-950">{formatCurrency(product.price)}</span>
          <span className="pb-0.5 text-xs text-slate-500">{product.unit}</span>
        </div>
        <div className="mt-3 h-5 text-xs font-medium text-slate-500">{product.reviewLabel}</div>
        <div className="mt-4 inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-3 text-sm font-semibold text-sky-700 transition group-hover:border-sky-200 group-hover:bg-sky-100">
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
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                  className={`w-[122px] min-w-[122px] shrink-0 overflow-hidden rounded-lg border text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${active ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="h-[84px] overflow-hidden bg-slate-50 p-2">
                    <Image src={category.image} alt={`${category.name} material category`} width={400} height={400} className="h-full w-full object-contain transition duration-300 hover:scale-[1.04]" />
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

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
