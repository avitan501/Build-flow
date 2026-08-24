import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { ensureManagerPushConfig, getManagerPushPreferences, sendManagerPushNotification } from "@/lib/manager-push-notifications";
import { managerCapabilities } from "@/lib/owner-identity";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const subscriptionSchema = z.object({ action: z.literal("subscribe"), subscription: z.object({ endpoint: z.string().url().max(4000), keys: z.object({ p256dh: z.string().min(20).max(1000), auth: z.string().min(8).max(500) }) }) });
const unsubscribeSchema = z.object({ action: z.literal("unsubscribe"), endpoint: z.string().url().max(4000) });
const preferencesSchema = z.object({ action: z.literal("preferences"), preferences: z.object({ new_orders: z.boolean(), calls_and_messages: z.boolean(), supplier_updates: z.boolean(), quote_approvals: z.boolean(), delivery_updates: z.boolean() }) });
const testSchema = z.object({ action: z.literal("test") });
const requestSchema = z.discriminatedUnion("action", [subscriptionSchema, unsubscribeSchema, preferencesSchema, testSchema]);

async function managerSession() {
  const session = await getSessionWithProfile();
  if (!session.user || !session.supabase) return null;
  const access = managerCapabilities({ email: session.user.email || session.profile?.email, role: session.profile?.role, approvalStatus: session.profile?.approval_status, isActive: session.profile?.is_active });
  return access.owner || access.operationsManager ? session : null;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function deviceName(userAgent: string) {
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/android/i.test(userAgent)) return "Android phone";
  if (/edg/i.test(userAgent)) return "Microsoft Edge";
  if (/chrome/i.test(userAgent)) return "Google Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Web browser";
}

export async function GET() {
  const session = await managerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const admin = createAdminClient();
    const [publicKey, preferences, deviceCountResult] = await Promise.all([
      ensureManagerPushConfig(),
      getManagerPushPreferences(session.user.id),
      admin.from("manager_push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", session.user.id),
    ]);
    return NextResponse.json({ publicKey, preferences, deviceCount: deviceCountResult.count ?? 0 });
  } catch (cause) {
    console.error("manager_push_status_failed", cause);
    return NextResponse.json({ error: "Notifications are not ready yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const session = await managerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification request" }, { status: 400 });

  const admin = createAdminClient();
  try {
    if (parsed.data.action === "subscribe") {
      const userAgent = request.headers.get("user-agent") || "";
      const { endpoint, keys } = parsed.data.subscription;
      const { error } = await admin.from("manager_push_subscriptions").upsert({ user_id: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, device_name: deviceName(userAgent), user_agent: userAgent.slice(0, 1000), last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
      if (error) throw error;
      await admin.from("manager_push_preferences").upsert({ user_id: session.user.id }, { onConflict: "user_id", ignoreDuplicates: true });
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.action === "unsubscribe") {
      const { error } = await admin.from("manager_push_subscriptions").delete().eq("endpoint", parsed.data.endpoint).eq("user_id", session.user.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.action === "preferences") {
      const { error } = await admin.from("manager_push_preferences").upsert({ user_id: session.user.id, ...parsed.data.preferences, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const result = await sendManagerPushNotification({ eventType: "test", title: "Avantia notifications are working", body: "This device will receive new order and communication alerts.", href: "/admin/build-map", userIds: [session.user.id], tag: `avantia-test-${Date.now()}` });
    return NextResponse.json({ ok: true, ...result });
  } catch (cause) {
    console.error("manager_push_action_failed", { action: parsed.data.action, cause });
    return NextResponse.json({ error: "The notification setting could not be saved." }, { status: 500 });
  }
}
