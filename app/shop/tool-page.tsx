import { notFound } from "next/navigation"

import { ShopToolCategoryPage } from "@/components/buildflow/shop-tool-category-page"
import { getSessionWithProfile } from "@/lib/auth"
import { applyDepartmentAddOns, createEmptyManagerAddOns, departmentExperienceFor, isDepartmentHidden } from "@/lib/manager-add-ons"
import type { CatalogEssentialItem } from "@/lib/department-essentials"
import type { ProjectRecord } from "@/lib/projects"
import { findShopToolCategory, type ShopToolSlug } from "@/lib/shop-tools"
import { translateShopText } from "@/lib/shop-i18n"
import { getRequestedShopLanguage } from "@/lib/shop-language-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyStorefrontQuestionnaireDefaults, DOOR_MOLDING_QUESTIONNAIRE_PREVIEW, DRYWALL_QUESTIONNAIRE_PREVIEW, ELECTRICAL_QUESTIONNAIRE_PREVIEW, FLOORING_QUESTIONNAIRE_PREVIEW, FRAMING_QUESTIONNAIRE_PREVIEW, TILE_QUESTIONNAIRE_PREVIEW } from "@/lib/material-questionnaire-preview"
import { buildMaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"
import { loadMaterialQuestionnaireForDepartment } from "@/lib/material-questionnaires-server"
import type { PublicWorkflowState } from "@/lib/workflow-public"

type ToolPageSearchParams = {
  project?: string
  address?: string
  error?: string
  success?: string
}

const MATERIAL_CATALOG_DEPARTMENT: Partial<Record<ShopToolSlug, string>> = {
  framing: "Framing",
  electrical: "Electrical",
  "tile-work": "Tile",
  "sheet-rock": "Sheet Rock",
  "door-and-molding": "Door & Molding",
  "wood-floor": "Flooring",
  siding: "Siding",
  roofing: "Roofing",
  window: "Windows",
  eitan: "Windows",
  "concrete-masonry": "Concrete",
}

const REQUIRED_PUBLIC_WORKFLOW_SLUGS = new Set<ShopToolSlug>([
  "framing",
  "kitchen",
  "tile-work",
  "door-and-molding",
  "exterior",
])

async function loadCurrentUserProjects(questionnaireDepartment: string) {
  const { supabase, user } = await getSessionWithProfile()
  if (!supabase) {
    return { projects: [], isSignedIn: false, addOns: createEmptyManagerAddOns(), questionnaireSnapshot: null }
  }
  let questionnaire = await loadMaterialQuestionnaireForDepartment(supabase, questionnaireDepartment).catch(() => null)
  if (!questionnaire) {
    // Questionnaire definitions are public storefront content, but older
    // installations may not yet grant anonymous table reads. Keep the service
    // role server-only and still filter the result to the active category.
    try {
      questionnaire = await loadMaterialQuestionnaireForDepartment(createAdminClient(), questionnaireDepartment).catch(() => null)
    } catch {
      questionnaire = null
    }
  }
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

async function loadCatalogEssentials(category: string): Promise<CatalogEssentialItem[]> {
  try {
    const { data, error } = await createAdminClient()
      .from("material_catalog_items")
      .select("name,image_url,sort_order")
      .eq("category", category)
      .eq("status", "active")
      .order("sort_order", { ascending: false })
      .limit(8)
      .returns<Array<{ name: string; image_url: string | null; sort_order: number }>>()

    if (error) return []

    return (data ?? [])
      .filter((item): item is { name: string; image_url: string; sort_order: number } => Boolean(item.image_url))
      .reverse()
      .map((item) => ({ name: item.name, imageUrl: item.image_url }))
  } catch {
    return []
  }
}

export async function renderShopToolPage(slug: ShopToolSlug, searchParams?: Promise<ToolPageSearchParams>) {
  const baseCategory = findShopToolCategory(slug)

  if (!baseCategory) {
    notFound()
  }

  const params = (await searchParams) ?? {}
  const language = await getRequestedShopLanguage()
  // Keep the customer-facing "Flooring" label while using the legacy
  // department key that existing admin questionnaire records are stored under.
  const questionnaireDepartment = baseCategory.slug === "wood-floor" ? "Wood Floor" : baseCategory.label
  const projectSession = await loadCurrentUserProjects(questionnaireDepartment)
  if (isDepartmentHidden(projectSession.addOns, baseCategory.label) && !REQUIRED_PUBLIC_WORKFLOW_SLUGS.has(slug)) notFound()
  const configuredCategory = applyDepartmentAddOns([baseCategory], projectSession.addOns)[0] ?? baseCategory
  const category = { ...configuredCategory, label: translateShopText(configuredCategory.label, language) }
  const experience = departmentExperienceFor(projectSession.addOns, baseCategory.label)
  const projects = projectSession.projects
  const selectedProjectId = projects.some((project) => project.id === params.project) ? params.project : ""
  const selectedAddress = selectedProjectId ? "" : params.address?.trim() || ""
  const storefrontDefaults = baseCategory.slug === "wood-floor"
    ? FLOORING_QUESTIONNAIRE_PREVIEW
    : baseCategory.slug === "sheet-rock"
      ? DRYWALL_QUESTIONNAIRE_PREVIEW
      : baseCategory.slug === "tile-work"
        ? TILE_QUESTIONNAIRE_PREVIEW
        : baseCategory.slug === "door-and-molding"
          ? DOOR_MOLDING_QUESTIONNAIRE_PREVIEW
          : baseCategory.slug === "framing"
            ? FRAMING_QUESTIONNAIRE_PREVIEW
            : baseCategory.slug === "electrical"
              ? ELECTRICAL_QUESTIONNAIRE_PREVIEW
              : null
  const questionnaireSnapshot = storefrontDefaults
    ? applyStorefrontQuestionnaireDefaults(projectSession.questionnaireSnapshot, storefrontDefaults)
    : projectSession.questionnaireSnapshot
  const catalogDepartment = MATERIAL_CATALOG_DEPARTMENT[baseCategory.slug]
  const catalogEssentials = catalogDepartment
    ? await loadCatalogEssentials(catalogDepartment)
    : []

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
      catalogEssentials={catalogEssentials}
    />
  )
}
