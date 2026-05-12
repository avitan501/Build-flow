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
}

type ShopCatalogExperienceProps = {
  products: ShopCatalogProduct[]
}

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

const SHOP_CART_STORAGE_KEY = "buildflow-shop-cart"
const SHOP_SAVE_STORAGE_KEY = "buildflow-shop-save"

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function readIdsFromStorage(key: string) {
  if (typeof window === "undefined") return [] as string[]

  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return [] as string[]
  }
}

export function ShopCatalogExperience({ products }: ShopCatalogExperienceProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedProduct, setSelectedProduct] = useState<ShopCatalogProduct | null>(null)
  const [cartIds, setCartIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])

  const normalizedQuery = (searchParams.get("q") ?? "").trim().toLowerCase()
  const activeCategory = searchParams.get("category")?.trim() || null

  useEffect(() => {
    setCartIds(readIdsFromStorage(SHOP_CART_STORAGE_KEY))
    setSavedIds(readIdsFromStorage(SHOP_SAVE_STORAGE_KEY))
  }, [])

  const categories = useMemo(() => {
    return CATEGORY_CONFIG.map((category) => ({
      ...category,
      count: products.filter((product) => product.category === category.name).length,
    }))
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = !activeCategory || product.category === activeCategory
      const haystack = [product.name, product.category, product.description, product.unit, product.supplierName || "", product.quoteNumber || ""]
        .join(" ")
        .toLowerCase()
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [activeCategory, normalizedQuery, products])

  function writeIdsToStorage(key: string, ids: string[], eventName: string) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(key, JSON.stringify(ids))
    window.dispatchEvent(new Event(eventName))
  }

  function toggleCart(productId: string) {
    setCartIds((current) => {
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
      writeIdsToStorage(SHOP_CART_STORAGE_KEY, next, "buildflow-shop-cart-updated")
      return next
    })
  }

  function toggleSaved(productId: string) {
    setSavedIds((current) => {
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
      writeIdsToStorage(SHOP_SAVE_STORAGE_KEY, next, "buildflow-shop-save-updated")
      return next
    })
  }

  function setCategory(nextCategory: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextCategory) {
      params.set("category", nextCategory)
      params.set("q", nextCategory)
    } else {
      params.delete("category")
    }
    const queryString = params.toString()
    router.replace(queryString ? `/shop?${queryString}` : "/shop", { scroll: false })
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff7ff_0%,#f8fbff_42%,#eef5fc_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="overflow-hidden rounded-[32px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(242,248,255,0.94))] shadow-[0_18px_42px_rgba(148,163,184,0.12)]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-5 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">BuildFlow Shop</p>
              <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.6rem]">Find the materials you need</h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">Browse the catalog, compare categories, and open item details before you save or add anything to your local cart.</p>
            </div>
            <div className="min-h-[220px] bg-[linear-gradient(180deg,rgba(14,35,65,0.08),rgba(14,35,65,0.28)),url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.6rem] font-semibold tracking-[-0.04em] text-slate-950">Categories</h2>
            {activeCategory ? (
              <button onClick={() => setCategory(null)} className="text-sm font-semibold text-sky-700">
                Clear filter
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => {
              const active = activeCategory === category.name
              return (
                <button
                  key={category.name}
                  onClick={() => setCategory(active ? null : category.name)}
                  className={`min-w-[128px] shrink-0 overflow-hidden rounded-[24px] border text-left shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99] ${
                    active ? "border-sky-300 bg-sky-50" : "border-sky-100 bg-white"
                  }`}
                >
                  <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${category.image})` }} />
                  <div className="p-3">
                    <div className="text-sm font-semibold text-slate-950">{category.name}</div>
                    <div className="mt-1 text-[12px] text-slate-500">{category.count} items</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.6rem] font-semibold tracking-[-0.04em] text-slate-950">Catalog</h2>
            <div className="text-sm text-slate-500">{filteredProducts.length} items</div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const inCart = cartIds.includes(product.id)
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="overflow-hidden rounded-[26px] border border-sky-100 bg-white text-left shadow-[0_12px_26px_rgba(148,163,184,0.08)] transition active:scale-[0.99]"
                >
                  <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }} />
                  <div className="p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{product.category}</div>
                    <h3 className="mt-2 line-clamp-2 text-[1rem] font-semibold tracking-[-0.03em] text-slate-950">{product.name}</h3>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">{product.unit}</span>
                      <span className="font-semibold text-slate-950">{formatCurrency(product.price)}</span>
                    </div>
                    <div className="mt-3 inline-flex rounded-full border border-slate-100 bg-sky-50/60 px-3 py-1 text-[11px] font-semibold text-sky-700">
                      {inCart ? "Added to cart" : "Open details"}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </section>

      {selectedProduct ? (
        <div className="fixed inset-0 z-40 bg-slate-950/35 px-4 py-6 backdrop-blur-[2px]">
          <div className="mx-auto flex h-full max-w-2xl items-end sm:items-center">
            <div className="w-full overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_26px_60px_rgba(15,23,42,0.24)]">
              <div className="h-52 bg-cover bg-center" style={{ backgroundImage: `url(${selectedProduct.image})` }} />
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{selectedProduct.category}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">{selectedProduct.name}</h3>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-slate-400">
                    <CloseIcon />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-7 text-slate-600">{selectedProduct.description}</p>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Unit</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{selectedProduct.unit}</dd>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{formatCurrency(selectedProduct.price)}</dd>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{selectedProduct.supplierName || "BuildFlow sample catalog"}</dd>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote source</dt>
                    <dd className="mt-1 font-semibold text-slate-950">{selectedProduct.quoteNumber || "Sample catalog reference"}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => toggleCart(selectedProduct.id)}
                    className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]"
                  >
                    {cartIds.includes(selectedProduct.id) ? "Remove from cart" : "Add to cart"}
                  </button>
                  <button
                    onClick={() => toggleSaved(selectedProduct.id)}
                    className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_20px_rgba(148,163,184,0.08)] transition active:scale-[0.99]"
                  >
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
