"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 4h2l2.2 10.2A1 1 0 0 0 8.2 15H18a1 1 0 0 0 1-.8L21 7H6" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m18.5 3 .6 1.9L21 5.5l-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z" />
    </svg>
  )
}

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

export function ShopCatalogExperience({ products }: ShopCatalogExperienceProps) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ShopCatalogProduct | null>(null)
  const [cartIds, setCartIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])

  const normalizedQuery = query.trim().toLowerCase()

  const categories = useMemo(() => {
    return CATEGORY_CONFIG.map((category) => ({
      ...category,
      count: products.filter((product) => product.category === category.name).length,
    }))
  }, [products])

  const categorySuggestions = useMemo(() => {
    if (!searchFocused) return []
    if (!normalizedQuery) return categories
    return categories.filter((category) => category.name.toLowerCase().includes(normalizedQuery))
  }, [categories, normalizedQuery, searchFocused])

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

  function toggleCart(productId: string) {
    setCartIds((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]))
  }

  function toggleSaved(productId: string) {
    setSavedIds((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]))
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff7ff_0%,#f8fbff_42%,#eef5fc_100%)] px-4 py-4 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.9))] p-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] sm:p-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.98]">
              <MenuIcon />
            </Link>

            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-3 rounded-[22px] border border-sky-100 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                <SearchIcon />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search materials or categories"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {searchFocused ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-20 rounded-[24px] border border-sky-100 bg-white p-3 shadow-[0_18px_40px_rgba(148,163,184,0.16)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Category suggestions</p>
                    <button onClick={() => setSearchFocused(false)} className="text-slate-400">
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categorySuggestions.length > 0 ? (
                      categorySuggestions.map((category) => (
                        <button
                          key={category.name}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setActiveCategory(category.name)
                            setQuery(category.name)
                            setSearchFocused(false)
                          }}
                          className="rounded-full border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm font-semibold text-sky-700"
                        >
                          {category.name}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No category suggestions match yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link href="/dashboard" className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.98]">
                <UserIcon />
              </Link>
              <button className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.98]">
                <CartIcon />
                {cartIds.length > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                    {cartIds.length}
                  </span>
                ) : null}
              </button>
              <Link href="/ai" className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.98]">
                <SparkleIcon />
              </Link>
            </div>
          </div>
        </section>

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
              <button onClick={() => setActiveCategory(null)} className="text-sm font-semibold text-sky-700">
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
                  onClick={() => setActiveCategory(active ? null : category.name)}
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
