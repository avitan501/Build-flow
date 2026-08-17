import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { ShopFaq } from "@/components/buildflow/shop-faq"
import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { HomepageShopPicker } from "@/components/buildflow/homepage-shop-picker"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopActivityForCurrentUser } from "@/lib/shop-activity-server"
import { loadShopItems } from "@/lib/shop-loader"
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools"
import { pageMetadata } from "@/lib/site-metadata"

export const metadata = pageMetadata({
  title: "Order Construction Materials | Avantia Build",
  description: "Choose a department, build a material list, upload plans, and request organized pricing and jobsite delivery.",
  path: "/shop",
})

type ShopSearchParams = Promise<Record<string, string | string[] | undefined>>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ShopPage({ searchParams }: { searchParams: ShopSearchParams }) {
  const query = await searchParams
  const category = firstValue(query.category)?.trim()
  const search = firstValue(query.q)?.trim()
  const showCatalog = Boolean(category || search)

  if (!showCatalog) {
    return (
      <main className="min-h-screen overflow-x-clip bg-[#f5f5f7] px-4 pb-24 pt-6 text-[#071126] sm:px-8 sm:pb-16 sm:pt-10 lg:px-10">
        <div className="mx-auto w-full max-w-[88rem]">
          <header className="max-w-3xl pb-5 sm:pb-8">
            <Link href="/" aria-label="Back to home" title="Back to home" className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 sm:mb-5">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0071e3]">Avantia builder shop</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[0] text-[#111] sm:text-5xl">Order materials</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-lg sm:leading-7">Choose a service or material department. Send a plan, list, quote, photo, or jobsite request and we will organize the next step.</p>
          </header>
          <HomepageShopPicker projects={[]} categories={SHOP_TOOL_CATEGORIES} isSignedIn={false} homepageCompact />
        </div>
      </main>
    )
  }

  const [{ data: itemsData, error }, recentActivity] = await Promise.all([
    loadShopItems({ limit: 240 }),
    loadShopActivityForCurrentUser(24),
  ])
  const products = buildShopProducts(itemsData, error)

  return <><ShopCatalogExperience products={products} recentActivity={recentActivity} /><ShopFaq /></>
}
