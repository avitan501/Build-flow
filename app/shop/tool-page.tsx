import { notFound } from "next/navigation"

import { ShopToolCategoryPage } from "@/components/buildflow/shop-tool-category-page"
import { getSessionWithProfile } from "@/lib/auth"
import { applyDepartmentAddOns, createEmptyManagerAddOns, departmentExperienceFor, isDepartmentHidden } from "@/lib/manager-add-ons"
import type { ProjectRecord } from "@/lib/projects"
import { findShopToolCategory, type ShopToolSlug } from "@/lib/shop-tools"
import type { PublicWorkflowState } from "@/lib/workflow-public"

type ToolPageSearchParams = {
  project?: string
  address?: string
  error?: string
  success?: string
}

async function loadCurrentUserProjects() {
  const { supabase, user } = await getSessionWithProfile()
  if (!supabase) {
    return { projects: [], isSignedIn: false, addOns: createEmptyManagerAddOns() }
  }
  const { data: publicStateRow } = await supabase
    .from("workflow_public_catalog")
    .select("state")
    .eq("id", "singleton")
    .maybeSingle<{ state: PublicWorkflowState }>()

  if (!user) {
    return { projects: [], isSignedIn: false, addOns: publicStateRow?.state?.addOns ?? createEmptyManagerAddOns() }
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

  return { projects: data ?? [], isSignedIn: true, addOns: publicStateRow?.state?.addOns ?? createEmptyManagerAddOns() }
}

export async function renderShopToolPage(slug: ShopToolSlug, searchParams?: Promise<ToolPageSearchParams>) {
  const baseCategory = findShopToolCategory(slug)

  if (!baseCategory) {
    notFound()
  }

  const params = (await searchParams) ?? {}
  const projectSession = await loadCurrentUserProjects()
  if (isDepartmentHidden(projectSession.addOns, baseCategory.label)) notFound()
  const category = applyDepartmentAddOns([baseCategory], projectSession.addOns)[0] ?? baseCategory
  const experience = departmentExperienceFor(projectSession.addOns, baseCategory.label)
  const projects = projectSession.projects
  const selectedProjectId = projects.some((project) => project.id === params.project) ? params.project : ""
  const selectedAddress = selectedProjectId ? "" : params.address?.trim() || ""

  return (
    <ShopToolCategoryPage
      category={category}
      questionnaireDepartment={baseCategory.label}
      experience={experience}
      projects={projects}
      selectedProjectId={selectedProjectId}
      selectedAddress={selectedAddress}
      isSignedIn={projectSession.isSignedIn}
      errorCode={params.error?.trim() || null}
      successCode={params.success?.trim() || null}
    />
  )
}
