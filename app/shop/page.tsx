import Link from "next/link"

import { ShopProjectToolPicker } from "@/components/buildflow/shop-project-tool-picker"
import { getSessionWithProfile } from "@/lib/auth"
import type { ProjectRecord } from "@/lib/projects"
import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
import { ShopToolProductGrid } from "@/components/buildflow/shop-tool-product-grid"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopActivityForCurrentUser } from "@/lib/shop-activity-server"
import { loadShopItems } from "@/lib/shop-loader"
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools"

type ShopPageProps = {
  searchParams?: Promise<{ project?: string; address?: string; created?: string; error?: string; q?: string; category?: string }>
}

async function loadCurrentUserProjects() {
  const { supabase, user } = await getSessionWithProfile()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, address, status, created_at, updated_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<ProjectRecord[]>()

  if (error) {
    throw new Error("Failed to load projects.")
  }

  return data ?? []
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = (await searchParams) ?? {}
  const hasCatalogSearch = Boolean(params.q?.trim() || params.category?.trim())
  const [{ data: itemsData, error }, recentActivity] = await Promise.all([
    loadShopItems({ limit: 240 }),
    loadShopActivityForCurrentUser(24),
  ])
  const products = buildShopProducts(itemsData, error)

  if (hasCatalogSearch) {
    return <ShopCatalogExperience products={products} recentActivity={recentActivity} />
  }

  const { user } = await getSessionWithProfile()
  const projects = await loadCurrentUserProjects()
  const selectedProjectId = projects.some((project) => project.id === params.project) ? params.project : ""
  const selectedAddress = selectedProjectId ? "" : params.address?.trim() || ""
  const materialProducts = products.filter((product) => product.productType !== "service")

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-4 pb-28 text-slate-900 sm:px-6 sm:py-5 sm:pb-10 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-4">
        <ShopProjectToolPicker
          projects={projects}
          categories={SHOP_TOOL_CATEGORIES}
          selectedProjectId={selectedProjectId}
          selectedAddress={selectedAddress}
          isSignedIn={Boolean(user)}
          projectCreated={params.created === "1" || params.created === "existing"}
          projectError={params.error === "project-create-failed"}
        />

        {materialProducts.length > 0 ? (
          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.65rem] font-bold tracking-normal text-slate-950">Shop materials</h2>
              <Link href="/shop?category=All" className="text-sm font-semibold text-sky-700">Open catalog</Link>
            </div>
            <ShopToolProductGrid products={materialProducts} />
          </section>
        ) : null}
      </section>
    </main>
  )
}
