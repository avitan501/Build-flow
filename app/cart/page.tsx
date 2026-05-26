import { ShopCartExperience } from "@/components/buildflow/shop-cart-experience"
import { getSessionWithProfile } from "@/lib/auth"
import type { ProjectRecord } from "@/lib/projects"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopItems } from "@/lib/shop-loader"

type CartPageProps = {
  searchParams?: Promise<{
    error?: string
    success?: string
  }>
}

export default async function CartPage({ searchParams }: CartPageProps) {
  const params = (await searchParams) ?? {}
  const { supabase, user } = await getSessionWithProfile()
  const { data: itemsData, error } = await loadShopItems({ limit: 200 })

  let projects: Pick<ProjectRecord, "id" | "name" | "address" | "status">[] = []

  if (user) {
    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, address, status")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .returns<Pick<ProjectRecord, "id" | "name" | "address" | "status">[]>()

    if (projectsError) {
      throw new Error("Failed to load cart projects.")
    }

    projects = projectRows ?? []
  }

  const products = buildShopProducts(itemsData, error)

  return <ShopCartExperience products={products} projects={projects} isSignedIn={Boolean(user)} feedbackCode={params.error || params.success || null} feedbackTone={params.error ? "error" : params.success ? "success" : null} />
}
