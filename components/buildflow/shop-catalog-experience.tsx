"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { placeholderImageMetadata, type ShopCatalogProduct } from "@/lib/shop-catalog"

type ShopCatalogExperienceProps = {
  products: ShopCatalogProduct[]
}

type SortMode = "featured" | "price-low" | "price-high"

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

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-low", label: "Price low" },
  { key: "price-high", label: "Price high" },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function categoryImage(category: string) {
  return placeholderImageMetadata(category === "All" ? "Materials" : category, category).imageUrl
}

function StarIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
      <path d="m10 1.7 2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.8 2.6.9-5.5-4-3.9 5.5-.8L10 1.7Z" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function ShopProductCard({ product }: { product: ShopCatalogProduct }) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex h-full min-h-[286px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 active:translate-y-0"
    >
      <div className="border-b border-slate-100 bg-slate-50/70 p-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-white">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
            className="object-contain p-3 transition duration-300 group-hover:scale-[1.04]"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[1.35rem] font-bold leading-none tracking-normal text-slate-950">{formatCurrency(product.price)}</span>
          <span className="truncate text-[12px] font-medium text-slate-500">/{product.unit}</span>
        </div>

        <h3 className="mt-2 line-clamp-2 min-h-[40px] text-[0.92rem] font-semibold leading-5 tracking-normal text-slate-900">{product.name}</h3>

        <div className="mt-2 flex items-center gap-1 text-[12px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-0.5 text-amber-500">
            <StarIcon />
            {product.rating.toFixed(1)}
          </span>
          <span className="text-slate-300">|</span>
          <span className="truncate">{product.reviewLabel.replace(/^[0-9.]+\s*-\s*/, "")}</span>
        </div>

        <span className="mt-auto inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-700 transition group-hover:border-sky-300 group-hover:bg-sky-100">
          View details
          <ChevronRightIcon />
        </span>
      </div>
    </Link>
  )
}

export function ShopCatalogExperience({ products }: ShopCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sortMode, setSortMode] = useState<SortMode>("featured")

  const query = (searchParams.get("q") ?? "").trim()
  const normalizedQuery = query.toLowerCase()
  const activeCategory = searchParams.get("category")?.trim() || "All"

  const categorySummaries = useMemo(() => {
    return SHOP_CATEGORIES.map((category) => {
      const count = category === "All" ? products.length : products.filter((product) => product.imageCategory === category || product.category === category).length
      return { name: category, image: categoryImage(category), count }
    })
  }, [products])

  const filteredProducts = useMemo(() => {
    const base = products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.imageCategory === activeCategory || product.category === activeCategory
      const haystack = [product.name, product.category, product.imageCategory, product.description, product.unit, product.specLine, product.supplierName || "", product.quoteNumber || "", product.popularUse]
        .join(" ")
        .toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesCategory && matchesQuery
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
  }, [activeCategory, normalizedQuery, products, sortMode])

  const resultLabel = query ? `Search results for "${query}"` : activeCategory === "All" ? "All materials" : activeCategory

  function setCategory(nextCategory: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextCategory === "All") {
      params.delete("category")
    } else {
      params.set("category", nextCategory)
    }

    const queryString = params.toString()
    router.replace(queryString ? `/shop?${queryString}` : "/shop", { scroll: false })
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-3 py-3 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <nav aria-label="Shop categories" className="border-b border-slate-200/80 bg-white">
          <div className="flex gap-2 overflow-x-auto px-1 py-3 [scrollbar-width:none] sm:px-2 [&::-webkit-scrollbar]:hidden">
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

        <section className="flex flex-col gap-3 border-b border-slate-200/80 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-normal text-slate-950 sm:text-2xl">{resultLabel}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{filteredProducts.length} items</p>
          </div>

          <label className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:w-auto">
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

        {filteredProducts.length > 0 ? (
          <section aria-label="Products" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {filteredProducts.map((product) => (
              <ShopProductCard key={product.id} product={product} />
            ))}
          </section>
        ) : (
          <section className="border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <h2 className="text-lg font-semibold text-slate-950">No products found</h2>
            <p className="mt-2 text-sm text-slate-500">Try another category or update the search in the top bar.</p>
          </section>
        )}
      </div>
    </main>
  )
}
