import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "npm:@supabase/supabase-js@2.104.1"
import webPush from "npm:web-push@3.6.7"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

type Preferences = {
  new_orders: boolean
  calls_and_messages: boolean
  supplier_updates: boolean
  quote_approvals: boolean
  delivery_updates: boolean
}

type EventType = "new_order" | "call_message" | "supplier_update" | "quote_approval" | "delivery_update" | "test"
type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
type QueueEvent = { id: number; event_type: EventType; title: string; body: string; href: string; tag: string | null }

const defaults: Preferences = {
  new_orders: true,
  calls_and_messages: true,
  supplier_updates: true,
  quote_approvals: true,
  delivery_updates: true,
}

const preferenceByEvent: Partial<Record<EventType, keyof Preferences>> = {
  new_order: "new_orders",
  call_message: "calls_and_messages",
  supplier_update: "supplier_updates",
  quote_approval: "quote_approvals",
  delivery_update: "delivery_updates",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max)
}

function safeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return result === 0
}

async function managerUser(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile } = await admin.from("profiles").select("role,approval_status,is_active").eq("id", data.user.id).maybeSingle()
  const allowed = ["admin", "staff"].includes(profile?.role || "") && profile?.approval_status === "approved" && profile?.is_active === true
  return allowed ? data.user : null
}

async function publicKey() {
  const { data, error } = await admin.from("manager_push_config").select("public_key").eq("id", "primary").maybeSingle()
  if (error || !data?.public_key) throw new Error(`Push configuration is unavailable: ${error?.message || "missing public key"}`)
  return data.public_key as string
}

async function preferences(userId: string) {
  const { data, error } = await admin.from("manager_push_preferences").select("new_orders,calls_and_messages,supplier_updates,quote_approvals,delivery_updates").eq("user_id", userId).maybeSingle()
  if (error) throw new Error(`Notification preferences are unavailable: ${error.message}`)
  return (data ?? defaults) as Preferences
}

async function deliver(event: { eventType: EventType; title: string; body: string; href: string; tag?: string; userIds?: string[] }) {
  const vapidPublicKey = await publicKey()
  const { data: privateKey, error: privateKeyError } = await admin.rpc("get_manager_web_push_private_key")
  if (privateKeyError || typeof privateKey !== "string" || !privateKey) throw new Error(`Push signing key is unavailable: ${privateKeyError?.message || "missing private key"}`)

  let query = admin.from("manager_push_subscriptions").select("id,user_id,endpoint,p256dh,auth")
  if (event.userIds?.length) query = query.in("user_id", event.userIds)
  const { data: subscriptionRows, error: subscriptionError } = await query
  if (subscriptionError) throw new Error(`Notification devices are unavailable: ${subscriptionError.message}`)

  const rows = (subscriptionRows ?? []) as Subscription[]
  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const { data: preferenceRows, error: preferenceError } = userIds.length
    ? await admin.from("manager_push_preferences").select("user_id,new_orders,calls_and_messages,supplier_updates,quote_approvals,delivery_updates").in("user_id", userIds)
    : { data: [], error: null }
  if (preferenceError) throw new Error(`Notification preferences are unavailable: ${preferenceError.message}`)

  const byUser = new Map((preferenceRows ?? []).map((row) => [row.user_id as string, row as Preferences & { user_id: string }]))
  const preferenceKey = preferenceByEvent[event.eventType]
  const selected = rows.filter((row) => !preferenceKey || (byUser.get(row.user_id) ?? defaults)[preferenceKey])
  const payload = JSON.stringify({
    title: clean(event.title, 100),
    body: clean(event.body, 240),
    href: event.href.startsWith("/") ? clean(event.href, 500) : "/admin/build-map",
    tag: clean(event.tag || `avantia-${event.eventType}`, 120),
  })

  webPush.setVapidDetails("mailto:office@build.avantiap.com", vapidPublicKey, privateKey)
  let delivered = 0
  let failed = 0
  const expiredIds: string[] = []
  await Promise.all(selected.map(async (row) => {
    try {
      await webPush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 3600 })
      delivered += 1
    } catch (cause) {
      failed += 1
      const statusCode = typeof cause === "object" && cause && "statusCode" in cause ? Number(cause.statusCode) : 0
      if (statusCode === 404 || statusCode === 410) expiredIds.push(row.id)
      else console.error("manager_push_delivery_failed", { eventType: event.eventType, statusCode })
    }
  }))

  if (expiredIds.length) await admin.from("manager_push_subscriptions").delete().in("id", expiredIds)
  await admin.from("manager_push_notification_log").insert({
    event_type: event.eventType,
    title: clean(event.title, 160),
    body: clean(event.body, 500),
    href: clean(event.href, 500),
    delivered_count: delivered,
    failed_count: failed,
  })
  return { delivered, failed, subscribedDevices: selected.length }
}

async function dispatchAuthorized(request: Request) {
  const provided = request.headers.get("x-manager-push-dispatch") || ""
  const { data: expected, error } = await admin.rpc("get_manager_push_dispatch_secret")
  return !error && typeof expected === "string" && safeEqual(provided, expected)
}

async function deliverQueue() {
  const { data, error } = await admin.rpc("claim_manager_push_events", { p_limit: 25 })
  if (error) throw new Error(`Notification queue is unavailable: ${error.message}`)
  const events = (data ?? []) as QueueEvent[]
  let processed = 0
  for (const event of events) {
    try {
      await deliver({ eventType: event.event_type, title: event.title, body: event.body, href: event.href, tag: event.tag || undefined })
      await admin.from("manager_push_queue").update({ processed_at: new Date().toISOString(), last_error: null }).eq("id", event.id)
      processed += 1
    } catch (cause) {
      await admin.from("manager_push_queue").update({ last_error: clean(cause instanceof Error ? cause.message : "Delivery failed", 500) }).eq("id", event.id)
    }
  }
  return { processed, claimed: events.length }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405)
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return json({ error: "Invalid JSON" }, 400) }
  const action = clean(body.action, 40)

  try {
    if (action === "deliver_queue") {
      if (!await dispatchAuthorized(request)) return json({ error: "Unauthorized" }, 401)
      return json(await deliverQueue())
    }

    const user = await managerUser(request)
    if (!user) return json({ error: "Manager authorization required" }, 401)

    if (action === "status") {
      const [key, prefs, countResult] = await Promise.all([
        publicKey(),
        preferences(user.id),
        admin.from("manager_push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ])
      return json({ publicKey: key, preferences: prefs, deviceCount: countResult.count ?? 0 })
    }

    if (action === "subscribe") {
      const subscription = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined
      const endpoint = clean(subscription?.endpoint, 4000)
      const p256dh = clean(subscription?.keys?.p256dh, 1000)
      const auth = clean(subscription?.keys?.auth, 500)
      if (!endpoint.startsWith("https://") || p256dh.length < 20 || auth.length < 8) return json({ error: "Invalid push subscription" }, 400)
      const { error } = await admin.from("manager_push_subscriptions").upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        device_name: clean(body.deviceName, 120) || "This device",
        user_agent: clean(body.userAgent, 1000),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" })
      if (error) throw error
      await admin.from("manager_push_preferences").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true })
      return json({ ok: true })
    }

    if (action === "unsubscribe") {
      const endpoint = clean(body.endpoint, 4000)
      const { error } = await admin.from("manager_push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id)
      if (error) throw error
      return json({ ok: true })
    }

    if (action === "preferences") {
      const input = body.preferences as Partial<Preferences> | undefined
      const next = Object.fromEntries(Object.keys(defaults).map((key) => [key, Boolean(input?.[key as keyof Preferences])])) as Preferences
      const { error } = await admin.from("manager_push_preferences").upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      if (error) throw error
      return json({ ok: true })
    }

    if (action === "test") {
      return json({ ok: true, ...await deliver({
        eventType: "test",
        title: "Avantia notifications are working",
        body: "This device will receive new order and communication alerts.",
        href: "/admin/build-map",
        userIds: [user.id],
        tag: `avantia-test-${Date.now()}`,
      }) })
    }

    return json({ error: "Unsupported action" }, 400)
  } catch (cause) {
    console.error("manager_web_push_failed", { action, cause })
    return json({ error: "Notification service is temporarily unavailable" }, 503)
  }
})
