"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export type ShopCatalogProduct = {
  id: string
  name: string
  description: string
  category: string
  unit: string
  price: number
  supplierName: string | null
  quoteNumber: string | null
  image: string
  specLine: string
  availability: string
  featuredLabel: string
  popularUse: string
}

type ShopCatalogExperienceProps = {
  products: ShopCatalogProduct[]
}

type SortMode = "featured" | "price-low" | "price-high" | "unit"
type CollectionMode = "all" | "framing"

type CartMap = Record<string, number>

const CATEGORY_CONFIG = [
  {
    name: "Lumber",
    image: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Plywood",
    image: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Treated Lumber",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "LVL Beams",
    image: "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Fasteners",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Hangers",
    image: "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Adhesives",
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Flashing",
    image: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=400&q=80",
  },
] as const

const TRUST_CHIPS = ["Supplier-backed pricing", "Local cart only", "Ready for quote review"] as const
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-low", label: "Price ↑" },
  { key: "price-high", label: "Price ↓" },
  { key: "unit", label: "Unit" },
]
const FRAMING_CATEGORIES = new Set(["Lumber", "Plywood", "LVL Beams", "Fasteners", "Hangers"])
const SHOP_CART_STORAGE_KEY = "buildflow-shop-cart"
const SHOP_SAVE_STORAGE_KEY = "buildflow-shop-save"

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function readCartMap(): CartMap {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(SHOP_CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null

    if (Array.isArray(parsed)) {
      return parsed.reduce<CartMap>((acc, id) => {
        if (typeof id === "string") acc[id] = 1
        return acc
      }, {})
    }

    if (parsed && typeof parsed === "object") {
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[0] === "string" && typeof entry[1] === "number" && entry[1] > 0),
      )
    }

    return {}
  } catch {
    return {}
  }
}

function readSavedIds(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(SHOP_SAVE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []
  } catch {
    return []
  }
}

export function ShopCatalogExperience({ products }: ShopCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedProduct, setSelectedProduct] = useState<ShopCatalogProduct | null>(null)
  const [cartMap, setCartMap] = useState<CartMap>({})
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [sortMode, setSortMode] = useState<SortMode>("featured")
  const [collectionMode, setCollectionMode] = useState<CollectionMode>("all")
  const [detailQuantity, setDetailQuantity] = useState(1)

  const normalizedQuery = (searchParams.get("q") ?? "").trim().toLowerCase()
  const activeCategory = searchParams.get("category")?.trim() || null

  useEffect(() => {
    setCartMap(readCartMap())
    setSavedIds(readSavedIds())
  }, [])

  useEffect(() => {
    if (!selectedProduct) {
      setDetailQuantity(1)
      return
    }

    setDetailQuantity(cartMap[selectedProduct.id] || 1)
  }, [cartMap, selectedProduct])

  const categories = useMemo(() => {
    return CATEGORY_CONFIG.map((category) => ({
      ...category,
      count: products.filter((product) => product.category === category.name).length,
    }))
  }, [products])

  const featuredProducts = useMemo(() => {
    return products.filter((product) => product.featuredLabel === "Popular for framing" || FRAMING_CATEGORIES.has(product.category)).slice(0, 6)
  }, [products])

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

  function persistSaved(next: string[]) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(SHOP_SAVE_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event("buildflow-shop-save-updated"))
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

  function updateDetailQuantity(nextQuantity: number) {
    setDetailQuantity(Math.max(1, nextQuantity))
  }

  function applyDetailCart(productId: string) {
    setCartMap((current) => {
      const next = { ...current, [productId]: detailQuantity }
      persistCart(next)
      return next
    })
  }

  function toggleSaved(productId: string) {
    setSavedIds((current) => {
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
      persistSaved(next)
      return next
    })
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf5fb_0%,#f8fbff_36%,#eef5fb_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,245,255,0.96) 55%,rgba(231,244,239,0.94))] shadow-[0_24px_60px_rgba(148,163,184,0.16)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-5 sm:p-7 lg:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">BuildFlow Shop</p>
              <h1 className="mt-3 text-[2.1rem] font-semibold tracking-[-0.06em] text-slate-950 sm:text-[2.8rem]">Find the right materials for the job</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">Browse framing, sheathing, fasteners, and jobsite essentials with cleaner search, premium product cards, and quick local cart saves before you request a quote.</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {TRUST_CHIPS.map((chip) => (
                  <span key={chip} className="rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative min-h-[230px] bg-[linear-gradient(180deg,rgba(9,25,49,0.12),rgba(9,25,49,0.34)),url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center">
              <div className="absolute inset-x-4 bottom-4 rounded-[26px] border border-white/20 bg-slate-950/35 p-4 text-white backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Jobsite ready</p>
                <p className="mt-2 text-sm leading-6 text-white/90">Search by category, save core materials, and open cleaner product details without leaving the shop flow.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.1)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">Shop by category</h2>
              <p className="mt-1 text-sm text-slate-500">Fast visual entry points for common material groups.</p>
            </div>
            {activeCategory ? <button onClick={() => setCategory(null)} className="text-sm font-semibold text-sky-700">Clear</button> : null}
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => {
              const active = activeCategory === category.name
              return (
                <button
                  key={category.name}
                  onClick={() => setCategory(active ? null : category.name)}
                  className={`min-w-[148px] shrink-0 overflow-hidden rounded-[26px] border text-left shadow-[0_12px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99] ${active ? "border-sky-300 bg-sky-50" : "border-slate-100 bg-white"}`}
                >
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

        <section className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,250,255,0.96))] p-4 shadow-[0_18px_42px_rgba(148,163,184,0.1)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">Popular for framing</h2>
              <p className="mt-1 text-sm text-slate-500">Retail-style picks for the most common framing package needs.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featuredProducts.map((product) => (
              <div key={product.id} className="min-w-[235px] max-w-[235px] shrink-0 overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-[0_12px_28px_rgba(148,163,184,0.1)]">
                <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">{product.featuredLabel}</p>
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950">{product.name}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{product.availability}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{product.specLine}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[12px] text-slate-500">{product.unit}</div>
                      <div className="mt-1 text-base font-semibold text-slate-950">{formatCurrency(product.price)}</div>
                    </div>
                    <button onClick={() => quickAdd(product.id)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                      <PlusIcon /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_42px_rgba(148,163,184,0.1)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.4rem] font-semibold tracking-[-0.04em] text-slate-950">Catalog</h2>
              <p className="mt-1 text-sm text-slate-500">{filteredProducts.length} items matching your current shop search and filters.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setCollectionMode("all")} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${collectionMode === "all" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>All materials</button>
              <button onClick={() => setCollectionMode("framing")} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${collectionMode === "framing" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>Framing essentials</button>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSortMode(option.key)}
                  className={`rounded-full px-3.5 py-2 text-sm font-semibold ${sortMode === option.key ? "bg-sky-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const saved = savedIds.includes(product.id)
              const quantityInCart = cartMap[product.id] || 0
              return (
                <article key={product.id} className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_16px_34px_rgba(148,163,184,0.1)]">
                  <button onClick={() => setSelectedProduct(product)} className="block w-full text-left">
                    <div className="relative h-44 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }}>
                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 shadow-sm">{product.category}</div>
                      <div className="absolute bottom-3 right-3 rounded-full bg-emerald-50/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">{product.availability}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="line-clamp-2 text-[1rem] font-semibold tracking-[-0.03em] text-slate-950">{product.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{product.unit}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-slate-950">{formatCurrency(product.price)}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">per item</div>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.specLine}</p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{product.featuredLabel}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{product.popularUse}</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 border-t border-slate-100 p-4">
                    <button onClick={() => quickAdd(product.id)} className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_26px_rgba(220,168,69,0.18)]">
                      {quantityInCart > 0 ? `In cart · ${quantityInCart}` : "Quick add"}
                    </button>
                    <button onClick={() => toggleSaved(product.id)} className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${saved ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-500"}`}>
                      <BookmarkIcon filled={saved} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </section>

      {selectedProduct ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 px-4 py-6 backdrop-blur-[3px]">
          <div className="mx-auto flex h-full max-w-4xl items-end sm:items-center">
            <div className="grid w-full overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.26)] lg:grid-cols-[1fr_0.95fr]">
              <div className="min-h-[270px] bg-cover bg-center" style={{ backgroundImage: `url(${selectedProduct.image})` }} />
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">{selectedProduct.category}</p>
                    <h3 className="mt-2 text-[1.6rem] font-semibold tracking-[-0.05em] text-slate-950">{selectedProduct.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{selectedProduct.description}</p>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-slate-400">
                    <CloseIcon />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price</dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(selectedProduct.price)}</dd>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Unit</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{selectedProduct.unit}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Specs</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{selectedProduct.specLine}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier / source</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{selectedProduct.supplierName || "BuildFlow sample catalog"}</dd>
                    <div className="mt-1 text-xs text-slate-500">{selectedProduct.quoteNumber || "Sample catalog reference"}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#f9fbff_0%,#f3f8ff_100%)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quantity</p>
                      <p className="mt-1 text-sm text-slate-600">Adjust local cart quantity before saving.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
                      <button onClick={() => updateDetailQuantity(detailQuantity - 1)} className="h-8 w-8 rounded-full text-lg font-semibold text-slate-600">-</button>
                      <span className="min-w-8 text-center text-sm font-semibold text-slate-950">{detailQuantity}</span>
                      <button onClick={() => updateDetailQuantity(detailQuantity + 1)} className="h-8 w-8 rounded-full text-lg font-semibold text-slate-600">+</button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => applyDetailCart(selectedProduct.id)} className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)]">
                    Save {detailQuantity} to cart
                  </button>
                  <button onClick={() => toggleSaved(selectedProduct.id)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_20px_rgba(148,163,184,0.08)]">
                    {savedIds.includes(selectedProduct.id) ? "Saved" : "Save for later"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
