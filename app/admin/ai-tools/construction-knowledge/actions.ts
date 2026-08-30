"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireManagerPortalProfile } from "@/lib/auth"

const knowledgeRoute = "/admin/ai-tools/construction-knowledge"

async function requireConstructionKnowledgeOwner() {
  const profile = await requireManagerPortalProfile()
  if (!profile.access.aiTools || !profile.access.owner) redirect("/")
  return profile
}

function knowledgeId(formData: FormData) {
  const id = String(formData.get("knowledgeId") || "").trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : ""
}

function reviewedKnowledge(formData: FormData) {
  const fact = String(formData.get("fact") || "").trim().replace(/\s+/g, " ").slice(0, 2000)
  const category = String(formData.get("category") || "general").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80) || "general"
  const sourcePath = String(formData.get("sourcePath") || "").trim().slice(0, 500)
  const sourceIsSafe = sourcePath.startsWith("/") || /^https:\/\//i.test(sourcePath)
  return { fact, category, sourcePath, valid: Boolean(fact && sourcePath && sourceIsSafe) }
}

function refreshKnowledgePages() {
  revalidatePath(knowledgeRoute)
  revalidatePath("/admin/ai-tools/sms-replies")
}

async function insertReviewedKnowledge(input: { fact: string; category: string; sourcePath: string }) {
  const { supabase, user } = await requireConstructionKnowledgeOwner()
  const { error } = await supabase.from("aura_ai_reply_knowledge").insert({
    fact: input.fact,
    category: input.category,
    source_path: input.sourcePath,
    enabled: true,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  })
  return error
}

export async function addConstructionKnowledgeAction(formData: FormData) {
  const knowledge = reviewedKnowledge(formData)
  if (!knowledge.valid) redirect(`${knowledgeRoute}?error=invalid`)

  const error = await insertReviewedKnowledge({
    fact: knowledge.fact,
    category: knowledge.category,
    sourcePath: knowledge.sourcePath,
  })
  if (error) redirect(`${knowledgeRoute}?error=save`)
  refreshKnowledgePages()
  redirect(`${knowledgeRoute}?saved=added`)
}

function orderStandardValue(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) || "").trim().replace(/\s+/g, " ").slice(0, maxLength)
}

export async function addOrderStandardAction(formData: FormData) {
  const name = orderStandardValue(formData, "standardName", 100)
  const customerNeed = orderStandardValue(formData, "customerNeed", 300)
  const options = orderStandardValue(formData, "options", 500)
  const questions = orderStandardValue(formData, "questions", 500)
  const confirmations = orderStandardValue(formData, "confirmations", 400)
  const sampleReply = orderStandardValue(formData, "sampleReply", 300)
  const sourcePath = orderStandardValue(formData, "sourcePath", 500)
  const sourceIsSafe = sourcePath.startsWith("/") || /^https:\/\//i.test(sourcePath)

  if (!name || !customerNeed || !questions || !confirmations || !sampleReply || !sourceIsSafe) {
    redirect(`${knowledgeRoute}?error=invalid-standard#order-standards`)
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "general"
  const fact = [
    `Order standard: ${name}.`,
    `Use when: ${customerNeed}.`,
    options ? `Common intake shorthand or options: ${options}.` : "",
    `Ask only what is still unresolved: ${questions}.`,
    `Confirm before finalizing: ${confirmations}.`,
    `Short customer reply example: ${sampleReply}`,
  ].filter(Boolean).join(" ").slice(0, 2000)

  const error = await insertReviewedKnowledge({
    fact,
    category: `order-standard-${slug}`,
    sourcePath,
  })
  if (error) redirect(`${knowledgeRoute}?error=save#order-standards`)
  refreshKnowledgePages()
  redirect(`${knowledgeRoute}?saved=standard#order-standards`)
}

export async function updateConstructionKnowledgeAction(formData: FormData) {
  const { supabase, user } = await requireConstructionKnowledgeOwner()
  const id = knowledgeId(formData)
  const knowledge = reviewedKnowledge(formData)
  if (!id || !knowledge.valid) redirect(`${knowledgeRoute}?error=invalid`)

  const { error } = await supabase.from("aura_ai_reply_knowledge").update({
    fact: knowledge.fact,
    category: knowledge.category,
    source_path: knowledge.sourcePath,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq("id", id)
  if (error) redirect(`${knowledgeRoute}?error=save`)
  refreshKnowledgePages()
  redirect(`${knowledgeRoute}?saved=updated`)
}

export async function setConstructionKnowledgeEnabledAction(formData: FormData) {
  const { supabase, user } = await requireConstructionKnowledgeOwner()
  const id = knowledgeId(formData)
  if (!id) redirect(`${knowledgeRoute}?error=invalid`)

  const { error } = await supabase.from("aura_ai_reply_knowledge").update({
    enabled: formData.get("enabled") === "true",
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq("id", id)
  if (error) redirect(`${knowledgeRoute}?error=save`)
  refreshKnowledgePages()
  redirect(`${knowledgeRoute}?saved=status`)
}

export async function deleteConstructionKnowledgeAction(formData: FormData) {
  const { supabase } = await requireConstructionKnowledgeOwner()
  const id = knowledgeId(formData)
  if (!id) redirect(`${knowledgeRoute}?error=invalid`)

  const { error } = await supabase.from("aura_ai_reply_knowledge").delete().eq("id", id)
  if (error) redirect(`${knowledgeRoute}?error=save`)
  refreshKnowledgePages()
  redirect(`${knowledgeRoute}?saved=removed`)
}
