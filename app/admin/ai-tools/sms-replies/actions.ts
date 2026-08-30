"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireManagerPortalProfile } from "@/lib/auth"

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on"
}

export async function saveSmsAiPreferencesAction(formData: FormData) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.customers) redirect("/")

  const preferredVoice = String(formData.get("preferredVoice") || "friendly")
  const maxSentences = Number(formData.get("maxSentences") || 2)
  const customInstructions = String(formData.get("customInstructions") || "").trim().slice(0, 1500)
  if (!new Set(["professional", "friendly", "brief"]).has(preferredVoice)) redirect("/admin/ai-tools/sms-replies?error=style")
  if (!Number.isInteger(maxSentences) || maxSentences < 1 || maxSentences > 3) redirect("/admin/ai-tools/sms-replies?error=length")

  const { error } = await supabase.from("aura_sms_ai_settings").update({
    enabled: checked(formData, "enabled"),
    preferred_voice: preferredVoice,
    max_sentences: maxSentences,
    match_customer_language: checked(formData, "matchCustomerLanguage"),
    auto_acknowledge_follow_ups: checked(formData, "autoAcknowledgeFollowUps"),
    auto_ask_delivery_details: checked(formData, "autoAskDeliveryDetails"),
    auto_acknowledge_pricing: checked(formData, "autoAcknowledgePricing"),
    auto_create_request_drafts: checked(formData, "autoCreateRequestDrafts"),
    custom_instructions: customInstructions,
    updated_by: user.id,
  }).eq("id", 1)

  if (error) redirect("/admin/ai-tools/sms-replies?error=save")
  revalidatePath("/admin/ai-tools/sms-replies")
  revalidatePath("/admin/communications")
  redirect("/admin/ai-tools/sms-replies?saved=1")
}

function trainingExampleId(formData: FormData) {
  const id = String(formData.get("exampleId") || "").trim()
  return /^[0-9a-f-]{36}$/i.test(id) ? id : ""
}

export async function setSmsAiReplyExampleEnabledAction(formData: FormData) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.customers) redirect("/")
  const id = trainingExampleId(formData)
  if (!id) redirect("/admin/ai-tools/sms-replies?error=example")
  const enabled = formData.get("enabled") === "true"
  const { error } = await supabase.from("aura_ai_reply_examples").update({ enabled }).eq("id", id)
  if (error) redirect("/admin/ai-tools/sms-replies?error=example")
  revalidatePath("/admin/ai-tools/sms-replies")
  redirect("/admin/ai-tools/sms-replies?saved=example")
}

export async function deleteSmsAiReplyExampleAction(formData: FormData) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.customers) redirect("/")
  const id = trainingExampleId(formData)
  if (!id) redirect("/admin/ai-tools/sms-replies?error=example")
  const { error } = await supabase.from("aura_ai_reply_examples").delete().eq("id", id)
  if (error) redirect("/admin/ai-tools/sms-replies?error=example")
  revalidatePath("/admin/ai-tools/sms-replies")
  redirect("/admin/ai-tools/sms-replies?saved=example")
}

function knowledgeId(formData: FormData) {
  const id = String(formData.get("knowledgeId") || "").trim()
  return /^[0-9a-f-]{36}$/i.test(id) ? id : ""
}

export async function saveSmsAiKnowledgeAction(formData: FormData) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.customers) redirect("/")
  const fact = String(formData.get("fact") || "").trim().replace(/\s+/g, " ").slice(0, 2000)
  const category = String(formData.get("category") || "general").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80) || "general"
  const sourcePath = String(formData.get("sourcePath") || "").trim().slice(0, 500)
  if (!fact || !sourcePath || (!sourcePath.startsWith("/") && !/^https:\/\//i.test(sourcePath))) {
    redirect("/admin/ai-tools/sms-replies?error=knowledge")
  }
  const { error } = await supabase.from("aura_ai_reply_knowledge").insert({
    fact,
    category,
    source_path: sourcePath,
    enabled: true,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  })
  if (error) redirect("/admin/ai-tools/sms-replies?error=knowledge")
  revalidatePath("/admin/ai-tools/sms-replies")
  redirect("/admin/ai-tools/sms-replies?saved=knowledge")
}

export async function setSmsAiKnowledgeEnabledAction(formData: FormData) {
  const { supabase, user, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.customers) redirect("/")
  const id = knowledgeId(formData)
  if (!id) redirect("/admin/ai-tools/sms-replies?error=knowledge")
  const enabled = formData.get("enabled") === "true"
  const { error } = await supabase.from("aura_ai_reply_knowledge").update({
    enabled,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq("id", id)
  if (error) redirect("/admin/ai-tools/sms-replies?error=knowledge")
  revalidatePath("/admin/ai-tools/sms-replies")
  redirect("/admin/ai-tools/sms-replies?saved=knowledge")
}

export async function deleteSmsAiKnowledgeAction(formData: FormData) {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!access.aiTools || !access.customers) redirect("/")
  const id = knowledgeId(formData)
  if (!id) redirect("/admin/ai-tools/sms-replies?error=knowledge")
  const { error } = await supabase.from("aura_ai_reply_knowledge").delete().eq("id", id)
  if (error) redirect("/admin/ai-tools/sms-replies?error=knowledge")
  revalidatePath("/admin/ai-tools/sms-replies")
  redirect("/admin/ai-tools/sms-replies?saved=knowledge")
}
