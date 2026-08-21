"use server"

import { headers } from "next/headers"

import { requireStaffProfile } from "@/lib/auth"
import { createEmptyManagerAddOns, departmentExperienceFor, isDepartmentHidden } from "@/lib/manager-add-ons"
import { findShopToolCategory } from "@/lib/shop-tools"
import { createAdminClient } from "@/lib/supabase/admin"
import type { PublicWorkflowState } from "@/lib/workflow-public"

export type OrderTestCheck = { label: string; passed: boolean; detail: string }
export type OrderTestState = {
  status: "idle" | "passed" | "failed"
  message: string
  route?: string
  checks: OrderTestCheck[]
}

const initialFailure = (message: string): OrderTestState => ({ status: "failed", message, checks: [] })

export async function runOrderTestAction(_previous: OrderTestState, formData: FormData): Promise<OrderTestState> {
  await requireStaffProfile("aiTools")
  const slug = String(formData.get("department") || "").trim()
  const mode = String(formData.get("mode") || "") === "upload" ? "upload" : "quick"
  const category = findShopToolCategory(slug)
  if (!category) return initialFailure("Choose a valid department.")

  const supabase = createAdminClient()
  const { data: publicStateRow } = await supabase.from("workflow_public_catalog").select("state").eq("id", "singleton").maybeSingle<{ state: PublicWorkflowState }>()
  const addOns = publicStateRow?.state?.addOns ?? createEmptyManagerAddOns()
  const experience = departmentExperienceFor(addOns, category.label)
  const questionnaireDepartment = category.slug === "wood-floor" ? "Wood Floor" : category.label
  const customOrderOnly = ["siding", "roofing", "window"].includes(category.slug)
  const route = `/shop/${category.slug}`
  const checks: OrderTestCheck[] = []

  checks.push({ label: "Department visibility", passed: !isDepartmentHidden(addOns, category.label), detail: isDepartmentHidden(addOns, category.label) ? "Hidden in manager department settings." : "Visible to customers." })

  try {
    const requestHeaders = await headers()
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host")
    const protocol = requestHeaders.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
    const response = host ? await fetch(`${protocol}://${host}${route}?order-health=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(8000) }) : null
    checks.push({ label: "Department page", passed: Boolean(response?.ok), detail: response?.ok ? `${route} returned ${response.status}.` : `The page did not return a successful response${response ? ` (${response.status})` : ""}.` })
  } catch {
    checks.push({ label: "Department page", passed: false, detail: "The department page did not respond within 8 seconds." })
  }

  if (mode === "quick") {
    const { data: questionnaire } = await supabase.from("material_questionnaire_categories").select("id,is_active").eq("department_key", questionnaireDepartment).eq("is_active", true).maybeSingle<{ id: string; is_active: boolean }>()
    const { count } = questionnaire ? await supabase.from("material_questions").select("id", { count: "exact", head: true }).eq("category_id", questionnaire.id).eq("is_active", true) : { count: 0 }
    checks.push({ label: "Quick order enabled", passed: experience.showQuickOrder, detail: experience.showQuickOrder ? "Quick Order is enabled in department settings." : "Enable Quick Order in department settings." })
    checks.push({ label: "Questions available", passed: Boolean(questionnaire && count && count > 0), detail: questionnaire && count ? `${count} active questions are available.` : "No active questionnaire is connected. Test Upload a plan instead, or configure questions." })
  } else {
    const uploadEnabled = customOrderOnly || experience.showPlanUpload
    checks.push({ label: "Plan attachment", passed: uploadEnabled, detail: uploadEnabled ? "Blueprint and shopping-list attachment is available." : "Enable Plan Upload in department settings." })
    const requestPathEnabled = customOrderOnly || experience.showChatToOrder || experience.showQuickOrder
    checks.push({ label: "Continue to project", passed: requestPathEnabled, detail: requestPathEnabled ? "The request can continue into project selection." : "Enable Chat to Order or Quick Order for this department." })
  }

  const passed = checks.every((check) => check.passed)
  return { status: passed ? "passed" : "failed", message: passed ? `${category.label} ${mode === "quick" ? "Quick Order" : "plan upload"} is ready.` : `${category.label} has a configuration problem.`, route, checks }
}
