import { notFound } from "next/navigation"

import { ShopToolCategoryPage } from "@/components/buildflow/shop-tool-category-page"
import { getSessionWithProfile } from "@/lib/auth"
import type { ProjectRecord } from "@/lib/projects"
import { buildShopProducts } from "@/lib/shop-catalog"
import { loadShopItems } from "@/lib/shop-loader"
import { filterProductsForShopTool, findShopToolCategory, type ShopToolSlug } from "@/lib/shop-tools"

type ToolPageSearchParams = {
  project?: string
  address?: string
  error?: string
  success?: string
}

async function loadCurrentUserProjects() {
  const { supabase, user } = await getSessionWithProfile()

  if (!user) {
    return { projects: [], isSignedIn: false }
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

  return { projects: data ?? [], isSignedIn: true }
}

export async function renderShopToolPage(slug: ShopToolSlug, searchParams?: Promise<ToolPageSearchParams>) {
  const category = findShopToolCategory(slug)

  if (!category) {
    notFound()
  }

  const params = (await searchParams) ?? {}
  const [{ data: itemsData, error }, projectSession] = await Promise.all([
    loadShopItems({ limit: 240 }),
    loadCurrentUserProjects(),
  ])
  const projects = projectSession.projects
  const products = filterProductsForShopTool(buildShopProducts(itemsData, error), slug)
  const selectedProjectId = projects.some((project) => project.id === params.project) ? params.project : ""
  const selectedAddress = selectedProjectId ? "" : params.address?.trim() || ""

  return (
    <ShopToolCategoryPage
      category={category}
      products={products}
      projects={projects}
      selectedProjectId={selectedProjectId}
      selectedAddress={selectedAddress}
      isSignedIn={projectSession.isSignedIn}
      errorCode={params.error?.trim() || null}
      successCode={params.success?.trim() || null}
    />
  )
}
