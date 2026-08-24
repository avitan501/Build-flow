import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithProfile } from "@/lib/auth";
import { managerCapabilities } from "@/lib/owner-identity";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

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

async function invokeNotificationService(session: NonNullable<Awaited<ReturnType<typeof managerSession>>>, body: unknown) {
  const { data: authData } = await session.supabase.auth.getSession();
  const accessToken = authData.session?.access_token;
  if (!accessToken) return { response: null, result: { error: "Unauthorized" } };
  const { url, anonKey } = getSupabasePublicEnv();
  const response = await fetch(`${url}/functions/v1/manager-web-push`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({ error: "Notification service returned an invalid response" })) as Record<string, unknown>;
  return { response, result };
}

export async function GET() {
  const session = await managerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { response, result } = await invokeNotificationService(session, { action: "status" });
    if (!response) return NextResponse.json(result, { status: 401 });
    return NextResponse.json(result, { status: response.status });
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

  try {
    const userAgent = request.headers.get("user-agent") || "";
    const payload = parsed.data.action === "subscribe"
      ? { ...parsed.data, deviceName: deviceName(userAgent), userAgent: userAgent.slice(0, 1000) }
      : parsed.data;
    const { response, result } = await invokeNotificationService(session, payload);
    if (!response) return NextResponse.json(result, { status: 401 });
    return NextResponse.json(result, { status: response.status });
  } catch (cause) {
    console.error("manager_push_action_failed", { action: parsed.data.action, cause });
    return NextResponse.json({ error: "The notification setting could not be saved." }, { status: 500 });
  }
}
