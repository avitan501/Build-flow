import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const ownerEmail = "avitanneto@gmail.com"
const corsHeaders = {
  "access-control-allow-origin": "https://build.avantiap.com",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  })
}

function clean(value: unknown, max: number) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max)
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  if (!token || !supabaseUrl || !serviceRoleKey) return json({ error: "unauthorized" }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authenticated, error: authenticationError } = await admin.auth.getUser(token)
  if (authenticationError || !authenticated.user) return json({ error: "unauthorized" }, 401)

  const callerEmail = authenticated.user.email?.trim().toLowerCase() || ""
  const [{ data: profile }, { data: grant }] = await Promise.all([
    admin.from("profiles").select("role,approval_status,is_active").eq("id", authenticated.user.id).maybeSingle<{ role: string; approval_status: string; is_active: boolean }>(),
    admin.from("staff_access_grants").select("can_manage_customers,active").ilike("email", callerEmail).maybeSingle<{ can_manage_customers: boolean; active: boolean }>(),
  ])
  const isOwner = callerEmail === ownerEmail && profile?.role === "admin" && profile.approval_status === "approved" && profile.is_active
  const isCustomerStaff = profile?.role === "staff" && profile.approval_status === "approved" && profile.is_active && grant?.active && grant.can_manage_customers
  if (!isOwner && !isCustomerStaff) return json({ error: "forbidden" }, 403)

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return json({ error: "invalid_json" }, 400)
  }

  const fullName = clean(payload.fullName, 160)
  const email = clean(payload.email, 320).toLowerCase()
  const phone = clean(payload.phone, 40) || null
  const companyName = clean(payload.companyName, 180) || null
  if (fullName.length < 2) return json({ error: "invalid_name" }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid_email" }, 400)

  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id,role,is_active")
    .ilike("email", email)
    .limit(1)
    .maybeSingle<{ id: string; role: string; is_active: boolean }>()
  if (existingError) return json({ error: "directory_unavailable" }, 500)
  if (existing) {
    if (existing.role !== "client") return json({ error: "email_in_use_by_staff" }, 409)
    if (!existing.is_active) return json({ error: "client_inactive" }, 409)
    return json({ ok: true, customerId: existing.id })
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: `${crypto.randomUUID()}Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone, company_name: companyName },
  })
  if (authError || !authData.user) return json({ error: "auth_user_creation_failed" }, 500)

  const customerId = authData.user.id
  const { error: profileError } = await admin.from("profiles").upsert({
    id: customerId,
    email,
    full_name: fullName,
    phone,
    company_name: companyName,
    role: "client",
    approval_status: "pending",
    is_active: true,
  }, { onConflict: "id" })
  if (profileError) {
    await admin.auth.admin.deleteUser(customerId)
    return json({ error: "profile_creation_failed" }, 500)
  }

  return json({ ok: true, customerId }, 201)
})
