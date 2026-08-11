import { notFound } from "next/navigation"

import { ShopToolCategoryPage } from "@/components/buildflow/shop-tool-category-page"
import { getSessionWithProfile } from "@/lib/auth"
import { applyDepartmentAddOns, createEmptyManagerAddOns, departmentExperienceFor, isDepartmentHidden } from "@/lib/manager-add-ons"
import type { ProjectRecord } from "@/lib/projects"
import { findShopToolCategory, type ShopToolSlug } from "@/lib/shop-tools"
import { FLOORING_QUESTIONNAIRE_PREVIEW } from "@/lib/material-questionnaire-preview"
import { buildMaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"
import { loadMaterialQuestionnaireForDepartment } from "@/lib/material-questionnaires-server"
import type { PublicWorkflowState } from "@/lib/workflow-public"

type ToolPageSearchParams = {
  project?: string
  address?: string
  error?: string
  success?: string
}

async function loadCurrentUserProjects(questionnaireDepartment: string) {
  const { supabase, user } = await getSessionWithProfile()
  if (!supabase) {
    return { projects: [], isSignedIn: false, addOns: createEmptyManagerAddOns(), questionnaireSnapshot: null }
  }
  const questionnaire = await loadMaterialQuestionnaireForDepartment(supabase, questionnaireDepartment).catch(() => null)
  const questionnaireSnapshot = questionnaire ? buildMaterialQuestionnaireSnapshot(questionnaire) : null
  const { data: publicStateRow } = await supabase
    .from("workflow_public_catalog")
    .select("state")
    .eq("id", "singleton")
    .maybeSingle<{ state: PublicWorkflowState }>()

  if (!user) {
    return { projects: [], isSignedIn: false, addOns: publicStateRow?.state?.addOns ?? createEmptyManagerAddOns(), questionnaireSnapshot }
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

  return { projects: data ?? [], isSignedIn: true, addOns: publicStateRow?.state?.addOns ?? createEmptyManagerAddOns(), questionnaireSnapshot }
}

export async function renderShopToolPage(slug: ShopToolSlug, searchParams?: Promise<ToolPageSearchParams>) {
  const baseCategory = findShopToolCategory(slug)

  if (!baseCategory) {
    notFound()
  }

  const params = (await searchParams) ?? {}
  // Keep the customer-facing "Flooring" label while using the legacy
  // department key that existing admin questionnaire records are stored under.
  const questionnaireDepartment = baseCategory.slug === "wood-floor" ? "Wood Floor" : baseCategory.label
  const projectSession = await loadCurrentUserProjects(questionnaireDepartment)
  if (isDepartmentHidden(projectSession.addOns, baseCategory.label)) notFound()
  const category = applyDepartmentAddOns([baseCategory], projectSession.addOns)[0] ?? baseCategory
  const experience = departmentExperienceFor(projectSession.addOns, baseCategory.label)
  const projects = projectSession.projects
  const selectedProjectId = projects.some((project) => project.id === params.project) ? params.project : ""
  const selectedAddress = selectedProjectId ? "" : params.address?.trim() || ""
  const questionnaireSnapshot = process.env.VERCEL_ENV !== "production" && baseCategory.slug === "wood-floor"
    ? FLOORING_QUESTIONNAIRE_PREVIEW
    : projectSession.questionnaireSnapshot

  return (
    <ShopToolCategoryPage
      category={category}
      questionnaireDepartment={questionnaireDepartment}
      experience={experience}
      projects={projects}
      selectedProjectId={selectedProjectId}
      selectedAddress={selectedAddress}
      isSignedIn={projectSession.isSignedIn}
      errorCode={params.error?.trim() || null}
      successCode={params.success?.trim() || null}
      questionnaireSnapshot={questionnaireSnapshot}
    />
  )
}
