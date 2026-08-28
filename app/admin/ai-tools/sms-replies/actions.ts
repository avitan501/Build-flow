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
