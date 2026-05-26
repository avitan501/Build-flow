"use server"

import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionWithProfile } from "@/lib/auth"
import { createProjectEvent } from "@/lib/projects"
import type { ShopActivityEventType } from "@/lib/shop-activity"

export async function recordShopActivity(input: {
  eventType: ShopActivityEventType
  sessionId?: string | null
  query?: string | null
  productSlug?: string | null
  productName?: string | null
  category?: string | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    const { user } = await getSessionWithProfile()
    const admin = createAdminClient()

    await admin.from("shop_activity").insert({
      user_id: user?.id ?? null,
      session_id: input.sessionId?.trim() || null,
      event_type: input.eventType,
      query: input.query?.trim() || null,
      product_slug: input.productSlug?.trim() || null,
      product_name: input.productName?.trim() || null,
      category: input.category?.trim() || null,
      metadata: input.metadata ?? null,
    })

    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function createShopProjectFromAddressAction(formData: FormData) {
  const { supabase, user } = await getSessionWithProfile()
  const address = String(formData.get("address") || "").trim()

  if (!address) {
    redirect("/shop")
  }

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/shop?address=${address}`)}`)
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: address,
      address,
      status: "draft",
    })
    .select("id, name")
    .single<{ id: string; name: string }>()

  if (error || !project) {
    redirect(`/shop?address=${encodeURIComponent(address)}&error=project-create-failed`)
  }

  await createProjectEvent({
    supabase,
    projectId: project.id,
    ownerId: user.id,
    eventType: "project_opened",
    source: "website",
    title: "Project created from shop address",
    description: `Project ${project.name} was created from the shop page.`,
    metadata: { project_id: project.id, address },
  })

  redirect(`/shop?project=${project.id}&created=1`)
}
