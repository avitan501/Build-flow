"use server"

import { revalidatePath } from "next/cache"

import { getSessionWithProfile } from "@/lib/auth"
import { createProjectEvent } from "@/lib/projects"
import type { QuoteRequestAnswer } from "@/lib/quote-requests"

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; authRequired?: boolean }

async function currentUser() {
  const session = await getSessionWithProfile()
  if (!session.supabase || !session.user) return null
  return { supabase: session.supabase, user: session.user }
}

export async function getAddToProjectOptionsAction(): Promise<ActionResult<{
  userId: string
  projects: Array<{ id: string; name: string; address: string | null }>
  drafts: Array<{ id: string; projectId: string; title: string }>
}>> {
  const session = await currentUser()
  if (!session) return { ok: false, error: "Sign in to add this item to a project.", authRequired: true }

  const [{ data: projects, error: projectsError }, { data: drafts, error: draftsError }] = await Promise.all([
    session.supabase
      .from("projects")
      .select("id, name, address")
      .eq("owner_id", session.user.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    session.supabase
      .from("quote_requests")
      .select("id, project_id, title")
      .eq("owner_id", session.user.id)
      .eq("status", "draft")
      .order("updated_at", { ascending: false }),
  ])

  if (projectsError || draftsError) return { ok: false, error: "Could not load your projects. Please try again." }

  return {
    ok: true,
    data: {
      userId: session.user.id,
      projects: (projects ?? []).map((project) => ({ id: project.id, name: project.name, address: project.address })),
      drafts: (drafts ?? []).map((draft) => ({ id: draft.id, projectId: draft.project_id, title: draft.title })),
    },
  }
}

export async function saveQuoteAttachmentRecordAction(input: {
  projectId: string
  requestId: string
  itemId: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
}): Promise<ActionResult> {
  const session = await currentUser()
  if (!session) return { ok: false, error: "Your session expired.", authRequired: true }

  const { data: item } = await session.supabase
    .from("quote_request_items")
    .select("id")
    .eq("id", input.itemId)
    .eq("request_id", input.requestId)
    .eq("project_id", input.projectId)
    .eq("owner_id", session.user.id)
    .maybeSingle()
  if (!item) return { ok: false, error: "The request item was not found." }

  const { error } = await session.supabase.from("quote_request_attachments").insert({
    request_id: input.requestId,
    project_id: input.projectId,
    owner_id: session.user.id,
    item_id: input.itemId,
    file_name: input.fileName,
    file_path: input.filePath,
    file_type: input.fileType || null,
    file_size: input.fileSize,
  })
  if (error) return { ok: false, error: "The file uploaded, but its project record could not be saved." }
  revalidatePath(`/projects/${input.projectId}`)
  return { ok: true, data: undefined }
}

export async function addCatalogItemToProjectAction(input: {
  projectId: string
  requestId?: string
  requestTitle?: string
  product: {
    id: string
    name: string
    department: string
    itemType: "material" | "service" | "file_upload" | "custom_priced"
    quantity: number
    unit: string
    unitPrice: number
    requiredQuestionIds: string[]
    details?: string
  }
}): Promise<ActionResult<{ requestId: string; itemId: string }>> {
  const session = await currentUser()
  if (!session) return { ok: false, error: "Sign in to add this item to a project.", authRequired: true }

  const { data: project } = await session.supabase
    .from("projects")
    .select("id, name")
    .eq("id", input.projectId)
    .eq("owner_id", session.user.id)
    .neq("status", "archived")
    .maybeSingle<{ id: string; name: string }>()

  if (!project) return { ok: false, error: "Choose an active project." }

  let requestId = input.requestId?.trim() || ""
  if (requestId) {
    const { data: request } = await session.supabase
      .from("quote_requests")
      .select("id")
      .eq("id", requestId)
      .eq("project_id", project.id)
      .eq("owner_id", session.user.id)
      .eq("status", "draft")
      .maybeSingle<{ id: string }>()
    if (!request) return { ok: false, error: "That draft request is no longer available." }
  } else {
    const suggestedTitle = input.requestTitle?.trim() || `${input.product.department} request`
    const { data: request, error } = await session.supabase
      .from("quote_requests")
      .insert({ project_id: project.id, owner_id: session.user.id, title: suggestedTitle, status: "draft" })
      .select("id")
      .single<{ id: string }>()
    if (error || !request) return { ok: false, error: "Could not start the quote request." }
    requestId = request.id
  }

  const needsQuestions = input.product.requiredQuestionIds.length > 0
  const { data: item, error: itemError } = await session.supabase
    .from("quote_request_items")
    .insert({
      request_id: requestId,
      project_id: project.id,
      owner_id: session.user.id,
      catalog_item_id: input.product.id,
      name: input.product.name.trim(),
      department: input.product.department.trim() || "General",
      item_type: input.product.itemType,
      quantity: Math.max(1, Number(input.product.quantity) || 1),
      unit: input.product.unit.trim() || null,
      unit_price: Math.max(0, Number(input.product.unitPrice) || 0),
      qualification_status: needsQuestions ? "pending" : "not_required",
      metadata: {
        required_question_ids: input.product.requiredQuestionIds,
        ...(input.product.details?.trim() ? { request_details: input.product.details.trim().slice(0, 4000) } : {}),
      },
    })
    .select("id")
    .single<{ id: string }>()

  if (itemError || !item) return { ok: false, error: "Could not add the item to this request." }

  await createProjectEvent({
    supabase: session.supabase,
    projectId: project.id,
    ownerId: session.user.id,
    eventType: "material_added",
    source: "materials",
    title: `${input.product.name} added`,
    description: `Added to ${input.requestTitle?.trim() || "a draft quote request"}.`,
    metadata: { quote_request_id: requestId, quote_request_item_id: item.id },
  })

  revalidatePath(`/projects/${project.id}`)
  return { ok: true, data: { requestId, itemId: item.id } }
}

export async function saveQuoteItemAnswersAction(input: {
  projectId: string
  requestId: string
  itemId: string
  answers: QuoteRequestAnswer[]
  skipped?: boolean
}): Promise<ActionResult> {
  const session = await currentUser()
  if (!session) return { ok: false, error: "Your session expired. Please sign in again.", authRequired: true }

  const { error } = await session.supabase
    .from("quote_request_items")
    .update({ answers: input.answers, qualification_status: input.skipped ? "skipped" : "answered" })
    .eq("id", input.itemId)
    .eq("request_id", input.requestId)
    .eq("project_id", input.projectId)
    .eq("owner_id", session.user.id)

  if (error) return { ok: false, error: "Could not save the answers." }
  revalidatePath(`/projects/${input.projectId}`)
  return { ok: true, data: undefined }
}

export async function updateProjectAction(input: {
  projectId: string
  name?: string
  address?: string
  status?: "draft" | "active" | "archived"
}): Promise<ActionResult> {
  const session = await currentUser()
  if (!session) return { ok: false, error: "Your session expired.", authRequired: true }

  const patch: Record<string, string | null> = {}
  if (typeof input.name === "string") {
    if (!input.name.trim()) return { ok: false, error: "Project name is required." }
    patch.name = input.name.trim()
  }
  if (typeof input.address === "string") patch.address = input.address.trim() || null
  if (input.status) patch.status = input.status

  const { error } = await session.supabase.from("projects").update(patch).eq("id", input.projectId).eq("owner_id", session.user.id)
  if (error) return { ok: false, error: "Could not update the project." }
  revalidatePath("/projects")
  revalidatePath(`/projects/${input.projectId}`)
  return { ok: true, data: undefined }
}

export async function saveProjectAnswersAction(input: {
  projectId: string
  answers: Array<{ questionId: string; value: string }>
}): Promise<ActionResult> {
  const session = await currentUser()
  if (!session) return { ok: false, error: "Your session expired.", authRequired: true }

  const { data: project } = await session.supabase
    .from("projects")
    .select("id")
    .eq("id", input.projectId)
    .eq("owner_id", session.user.id)
    .maybeSingle()
  if (!project) return { ok: false, error: "Project not found." }

  const rows = input.answers.map((answer) => ({
    project_id: input.projectId,
    question_id: answer.questionId,
    owner_id: session.user.id,
    value: answer.value.trim(),
  }))
  const { error } = await session.supabase.from("project_question_answers").upsert(rows, { onConflict: "project_id,question_id" })
  if (error) return { ok: false, error: "Could not save project information." }
  revalidatePath(`/projects/${input.projectId}`)
  return { ok: true, data: undefined }
}

export async function submitQuoteRequestAction(input: { projectId: string; requestId: string }): Promise<ActionResult> {
  const session = await currentUser()
  if (!session) return { ok: false, error: "Your session expired.", authRequired: true }

  const { data: request } = await session.supabase
    .from("quote_requests")
    .select("id, title")
    .eq("id", input.requestId)
    .eq("project_id", input.projectId)
    .eq("owner_id", session.user.id)
    .eq("status", "draft")
    .maybeSingle<{ id: string; title: string }>()
  if (!request) return { ok: false, error: "Only draft requests can be submitted." }

  const [{ data: questions }, { data: projectAnswers }, { data: items }] = await Promise.all([
    session.supabase.from("project_questions").select("id, label, required").eq("active", true).eq("required", true),
    session.supabase.from("project_question_answers").select("question_id, value").eq("project_id", input.projectId).eq("owner_id", session.user.id),
    session.supabase.from("quote_request_items").select("id, catalog_item_id, department, qualification_status, answers, metadata").eq("request_id", input.requestId).eq("owner_id", session.user.id),
  ])

  if (!items || items.length === 0) return { ok: false, error: "Add at least one item before submitting." }
  const answerMap = new Map((projectAnswers ?? []).map((answer) => [answer.question_id, answer.value?.trim()]))
  const missingProjectQuestion = (questions ?? []).find((question) => !answerMap.get(question.id))
  if (missingProjectQuestion) return { ok: false, error: `Complete the project question: ${missingProjectQuestion.label}` }

  const incompleteItem = items.find((item) => {
    const required = Array.isArray(item.metadata?.required_question_ids) ? item.metadata.required_question_ids as string[] : []
    if (required.length === 0) return false
    const answered = new Set((Array.isArray(item.answers) ? item.answers : []).filter((answer: QuoteRequestAnswer) => answer.value?.trim()).map((answer: QuoteRequestAnswer) => answer.questionId))
    return required.some((questionId) => !answered.has(questionId))
  })
  if (incompleteItem) return { ok: false, error: "Complete all required item questions before submitting." }

  const { error } = await session.supabase.rpc("submit_quote_request_packages", {
    p_request_id: input.requestId,
    p_project_id: input.projectId,
  })
  if (error) return { ok: false, error: "Could not prepare and submit this quote request." }

  await createProjectEvent({
    supabase: session.supabase,
    projectId: input.projectId,
    ownerId: session.user.id,
    eventType: "status_changed",
    source: "quotes",
    title: `${request.title} submitted`,
    description: "Supplier packages are waiting for manager approval.",
    metadata: { quote_request_id: input.requestId },
  })
  revalidatePath(`/projects/${input.projectId}`)
  return { ok: true, data: undefined }
}
