import { NextResponse } from "next/server"

import type { SmsReplyDraft } from "@/app/admin/communications/actions"
import { getSessionWithProfile } from "@/lib/auth"
import { contactEmailForDisplay } from "@/lib/auth-phone"
import type { AuraContactRow } from "@/lib/aura/dashboard"
import { managerCapabilities } from "@/lib/owner-identity"
import type { ShopQualificationSettings } from "@/lib/shop-qualification"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await getSessionWithProfile()
  if (!session.user || !session.supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const access = managerCapabilities({
    email: session.user.email || session.profile?.email,
    role: session.profile?.role,
    approvalStatus: session.profile?.approval_status,
    isActive: session.profile?.is_active,
  })
  if (!access.communications) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [contacts, clients, leads, suppliers, requests, drafts] = await Promise.all([
    session.supabase.from("aura_contacts").select("id,full_name,normalized_phone,email,company,notes,sms_ai_mode,sms_ai_style,auto_create_request_drafts,created_at").order("created_at", { ascending: false }).limit(500).returns<AuraContactRow[]>(),
    access.customers ? session.supabase.from("profiles").select("id,full_name,email,phone,company_name").eq("role", "client").eq("is_active", true).order("full_name").limit(500) : Promise.resolve({ data: [] }),
    access.customers ? session.supabase.from("manager_outreach_leads").select("id,full_name,company_name,email,phone").neq("status", "archived").order("full_name").limit(500) : Promise.resolve({ data: [] }),
    access.suppliers ? session.supabase.rpc("staff_load_supplier_directory_snapshot") : Promise.resolve({ data: null }),
    access.customers ? session.supabase.from("quote_requests").select("id,title,status").neq("status", "draft").order("updated_at", { ascending: false }).limit(150) : Promise.resolve({ data: [] }),
    access.customers ? session.supabase.from("aura_sms_reply_drafts").select("id,communication_id,counterparty_phone,reply_text,decision,safety_reason,safety_level,safety_signals,intent,latency_ms,input_tokens,output_tokens,estimated_cost_usd,prompt_version,ai_model,updated_at").in("decision", ["draft", "blocked", "send_failed"]).order("updated_at", { ascending: false }).limit(200).returns<SmsReplyDraft[]>() : Promise.resolve({ data: [] }),
  ])
  if (contacts.error) return NextResponse.json({ error: "Communication directory is temporarily unavailable." }, { status: 503 })
  const snapshot = suppliers.data as {
    settings?: ShopQualificationSettings
  } | null
  const response = NextResponse.json({
    contacts: contacts.data ?? [],
    customers: (clients.data ?? []).map((client) => ({
      ...client,
      email: contactEmailForDisplay(client.email) || null,
    })),
    leads: leads.data ?? [],
    suppliers: snapshot?.settings?.suppliers ?? [],
    materialRequests: requests.data ?? [],
    smsReplyDrafts: drafts.data ?? [],
  })
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
