import { notFound } from "next/navigation"

import { ShopToolCategoryPage } from "@/components/buildflow/shop-tool-category-page"
import { getSessionWithProfile } from "@/lib/auth"
import type { ProjectRecord } from "@/lib/projects"
import { findShopToolCategory, type ShopToolSlug } from "@/lib/shop-tools"

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
  const projectSession = await loadCurrentUserProjects()
  const projects = projectSession.projects
  const selectedProjectId = projects.some((project) => project.id === params.project) ? params.project : ""
  const selectedAddress = selectedProjectId ? "" : params.address?.trim() || ""

  return (
    <ShopToolCategoryPage
      category={category}
      projects={projects}
      selectedProjectId={selectedProjectId}
      selectedAddress={selectedAddress}
      isSignedIn={projectSession.isSignedIn}
      errorCode={params.error?.trim() || null}
      successCode={params.success?.trim() || null}
    />
  )
}
