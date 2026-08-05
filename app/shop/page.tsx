import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup"
import { ShopProjectToolPicker } from "@/components/buildflow/shop-project-tool-picker"
import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase"
import { getSessionWithProfile } from "@/lib/auth"
import type { ProjectRecord } from "@/lib/projects"
import { ShopCatalogExperience } from "@/components/buildflow/shop-catalog-experience"
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
    return { projects: [] as ProjectRecord[], user: null }
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

  return { projects: data ?? [], user }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = (await searchParams) ?? {}
  const hasCatalogSearch = Boolean(params.q?.trim() || params.category?.trim())

  if (hasCatalogSearch) {
    const [{ data: itemsData, error }, recentActivity] = await Promise.all([
      loadShopItems({ limit: 240 }),
      loadShopActivityForCurrentUser(24),
    ])
    const products = buildShopProducts(itemsData, error)

    return <ShopCatalogExperience products={products} recentActivity={recentActivity} />
  }

  const { projects, user } = await loadCurrentUserProjects()
  const selectedProjectId = projects.some((project) => project.id === params.project) ? params.project : ""
  const selectedAddress = selectedProjectId ? "" : params.address?.trim() || ""

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-clip bg-[#f5f5f7] pb-24 text-[#1d1d1f] sm:pb-12">
      <section className="border-b border-black/[0.05] bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-7 lg:px-10">
          <AvantiaBuildLockup />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
        <ShopProjectToolPicker
          key={`${selectedProjectId}:${selectedAddress}`}
          projects={projects}
          categories={SHOP_TOOL_CATEGORIES}
          selectedProjectId={selectedProjectId}
          selectedAddress={selectedAddress}
          isSignedIn={Boolean(user)}
          projectCreated={params.created === "1" || params.created === "existing"}
          projectError={params.error === "project-create-failed"}
        />
      </section>

      <ShopBrandShowcase />
    </main>
  )
}
