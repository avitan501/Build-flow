import Link from "next/link"
import { ArrowLeft, Building2 } from "lucide-react"

import { ShopToolProductGrid } from "@/components/buildflow/shop-tool-product-grid"
import { APPLIANCE_RENTAL_PRODUCTS } from "@/lib/shop-catalog"
import { shopDepartmentMetadata } from "@/lib/site-metadata"

export const metadata = shopDepartmentMetadata(
  "appliances",
  "Appliances",
  "Shop rental-ready appliance packages with exact model numbers, product photos, and current Avantia Build pricing.",
)

export default function AppliancesPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 pb-28 pt-5 text-[#071126] sm:px-8 sm:pb-16 sm:pt-8 lg:px-10">
      <section className="mx-auto w-full max-w-7xl">
        <Link
          href="/shop"
          aria-label="Back to materials"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>

        <header className="mt-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Appliances
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[0] text-[#111] sm:text-5xl">Rentals</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Straightforward appliances for apartments and rental properties. Every item includes the exact model, three product views, and the current Avantia Build price.
          </p>
        </header>

        <section className="mt-6 rounded-[24px] border border-white bg-white/72 p-3 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:mt-8 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Rental pieces</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Available appliances</h2>
            </div>
            <span className="text-sm font-medium text-slate-500">{APPLIANCE_RENTAL_PRODUCTS.length} items</span>
          </div>

          <ShopToolProductGrid products={APPLIANCE_RENTAL_PRODUCTS} questionnaireDepartment="Appliances" />
        </section>
      </section>
    </main>
  )
}
