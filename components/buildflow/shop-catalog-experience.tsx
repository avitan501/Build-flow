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
type CartMap = Record<string, number>

const CATEGORY_CONFIG = [
  { name: "Lumber", image: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=400&q=80" },
  { name: "Plywood", image: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=400&q=80" },
  { name: "Treated Lumber", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80" },
  { name: "LVL Beams", image: "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=400&q=80" },
  { name: "Fasteners", image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=400&q=80" },
  { name: "Hangers", image: "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?auto=format&fit=crop&w=400&q=80" },
  { name: "Adhesives", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=400&q=80" },
  { name: "Flashing", image: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=400&q=80" },
] as const

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-low", label: "Price ↑" },
  { key: "price-high", label: "Price ↓" },
  { key: "unit", label: "Unit" },
]
const FRAMING_CATEGORIES = new Set(["Lumber", "Plywood", "LVL Beams", "Fasteners", "Hangers"])
const SHOP_CART_STORAGE_KEY = "buildflow-shop-cart"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

function readCartMap(): CartMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(SHOP_CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as CartMap) : {}
  } catch {
    return {}
  }
}

export function ShopCatalogExperience({ products }: ShopCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sortMode, setSortMode] = useState<SortMode>("featured")
  const [collectionMode, setCollectionMode] = useState<CollectionMode>("all")
  const [cartMap, setCartMap] = useState<CartMap>(() => readCartMap())

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

  function persistCart(next: CartMap) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event("buildflow-shop-cart-updated"))
  }

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

  function quickAdd(productId: string, quantity = 1) {
    setCartMap((current) => {
      const next = { ...current, [productId]: (current[productId] || 0) + quantity }
      persistCart(next)
      return next
    })
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf5fb_0%,#f8fbff_36%,#eef5fb_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.1)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.1rem] font-semibold tracking-[-0.04em] text-slate-950">Categories</h2>
            {activeCategory ? <button onClick={() => setCategory(null)} className="text-sm font-semibold text-sky-700">Clear</button> : null}
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => {
              const active = activeCategory === category.name
              return (
                <button key={category.name} onClick={() => setCategory(active ? null : category.name)} className={`min-w-[138px] shrink-0 overflow-hidden rounded-[24px] border text-left shadow-[0_12px_24px_rgba(148,163,184,0.08)] ${active ? "border-sky-300 bg-sky-50" : "border-slate-100 bg-white"}`}>
                  <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${category.image})` }} />
                  <div className="p-3.5">
                    <div className="text-sm font-semibold text-slate-950">{category.name}</div>
                    <div className="mt-1 text-[12px] text-slate-500">{category.count} items</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,250,255,0.96))] p-4 shadow-[0_18px_42px_rgba(148,163,184,0.1)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-950">Popular for framing</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Top picks</span>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featuredProducts.map((product) => (
              <article key={product.id} className="min-w-[235px] max-w-[235px] shrink-0 overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_12px_28px_rgba(148,163,184,0.1)]">
                <Link href={`/shop/${product.slug}`} className="block">
                  <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }} />
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      <span className="text-sky-700">{product.featuredLabel}</span>
                      <span className="text-emerald-700">{product.availability}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">{product.name}</h3>
                    <p className="mt-2 text-xs text-slate-500">{product.reviewLabel}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{product.specLine}</p>
                    <div className="mt-3 text-base font-semibold text-slate-950">{formatCurrency(product.price)}</div>
                    <div className="text-[12px] text-slate-500">{product.unit}</div>
                  </div>
                </Link>
                <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                  <button onClick={() => quickAdd(product.id)} className="rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-3 py-2 text-sm font-semibold text-slate-950">Add</button>
                  <Link href={`/shop/${product.slug}?buy=1`} className="rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white">Buy now</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.1)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-slate-950">Products</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{filteredProducts.length} results</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCollectionMode("all")} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${collectionMode === "all" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>All</button>
              <button onClick={() => setCollectionMode("framing")} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${collectionMode === "framing" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>Framing</button>
              {SORT_OPTIONS.map((option) => (
                <button key={option.key} onClick={() => setSortMode(option.key)} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${sortMode === option.key ? "bg-sky-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{option.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const quantityInCart = cartMap[product.id] || 0
              return (
                <article key={product.id} className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_16px_34px_rgba(148,163,184,0.1)]">
                  <Link href={`/shop/${product.slug}`} className="block">
                    <div className="relative h-44 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }}>
                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 shadow-sm">{product.category}</div>
                      <div className="absolute bottom-3 right-3 rounded-full bg-emerald-50/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">{product.availability}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="line-clamp-2 text-[1rem] font-semibold tracking-[-0.03em] text-slate-950">{product.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{product.reviewLabel}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-slate-950">{formatCurrency(product.price)}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">{product.unit}</div>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.specLine}</p>
                    </div>
                  </Link>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
                    <button onClick={() => quickAdd(product.id)} className="rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950">{quantityInCart > 0 ? `Cart · ${quantityInCart}` : "Add to cart"}</button>
                    <Link href={`/shop/${product.slug}?buy=1`} className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">Buy now</Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
