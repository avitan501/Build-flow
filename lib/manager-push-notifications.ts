import "server-only";

import webPush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

export type ManagerPushEventType = "new_order" | "call_message" | "supplier_update" | "quote_approval" | "delivery_update" | "test";

export type ManagerPushPreferences = {
  new_orders: boolean;
  calls_and_messages: boolean;
  supplier_updates: boolean;
  quote_approvals: boolean;
  delivery_updates: boolean;
};

type PushSubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type PushConfigRow = { public_key: string };

const defaultPreferences: ManagerPushPreferences = {
  new_orders: true,
  calls_and_messages: true,
  supplier_updates: true,
  quote_approvals: true,
  delivery_updates: true,
};

const preferenceByEvent: Partial<Record<ManagerPushEventType, keyof ManagerPushPreferences>> = {
  new_order: "new_orders",
  call_message: "calls_and_messages",
  supplier_update: "supplier_updates",
  quote_approval: "quote_approvals",
  delivery_update: "delivery_updates",
};

export async function ensureManagerPushConfig() {
  const admin = createAdminClient();
  const { data: existing, error: configError } = await admin.from("manager_push_config").select("public_key").eq("id", "primary").maybeSingle<PushConfigRow>();
  if (configError) throw new Error(`Unable to load Web Push configuration: ${configError.message}`);
  if (existing?.public_key) return existing.public_key;

  const generated = webPush.generateVAPIDKeys();
  const { data, error } = await admin.rpc("initialize_manager_web_push", {
    p_public_key: generated.publicKey,
    p_private_key: generated.privateKey,
  });
  if (error || typeof data !== "string" || !data) throw new Error(`Unable to initialize Web Push configuration: ${error?.message || "empty response"}`);
  return data;
}

export async function getManagerPushPreferences(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("manager_push_preferences").select("new_orders,calls_and_messages,supplier_updates,quote_approvals,delivery_updates").eq("user_id", userId).maybeSingle<ManagerPushPreferences>();
  if (error) throw new Error(`Unable to load notification preferences: ${error.message}`);
  return data ?? defaultPreferences;
}

export async function sendManagerPushNotification(input: {
  eventType: ManagerPushEventType;
  title: string;
  body: string;
  href: string;
  userIds?: string[];
  tag?: string;
}) {
  const admin = createAdminClient();
  const publicKey = await ensureManagerPushConfig();
  const { data: privateKey, error: privateKeyError } = await admin.rpc("get_manager_web_push_private_key");
  if (privateKeyError || typeof privateKey !== "string" || !privateKey) throw new Error(`Unable to load Web Push signing key: ${privateKeyError?.message || "missing key"}`);

  let subscriptionsQuery = admin.from("manager_push_subscriptions").select("id,user_id,endpoint,p256dh,auth");
  if (input.userIds?.length) subscriptionsQuery = subscriptionsQuery.in("user_id", input.userIds);
  const { data: subscriptions, error: subscriptionError } = await subscriptionsQuery.returns<PushSubscriptionRow[]>();
  if (subscriptionError) throw new Error(`Unable to load notification devices: ${subscriptionError.message}`);

  const rows = subscriptions ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: preferences, error: preferencesError } = userIds.length
    ? await admin.from("manager_push_preferences").select("user_id,new_orders,calls_and_messages,supplier_updates,quote_approvals,delivery_updates").in("user_id", userIds)
    : { data: [], error: null };
  if (preferencesError) throw new Error(`Unable to load notification preferences: ${preferencesError.message}`);

  const preferencesByUser = new Map((preferences ?? []).map((row) => [row.user_id as string, row as ManagerPushPreferences & { user_id: string }]));
  const preferenceKey = preferenceByEvent[input.eventType];
  const selected = rows.filter((row) => !preferenceKey || (preferencesByUser.get(row.user_id) ?? defaultPreferences)[preferenceKey]);

  webPush.setVapidDetails("mailto:office@build.avantiap.com", publicKey, privateKey);
  const payload = JSON.stringify({
    title: input.title.slice(0, 100),
    body: input.body.slice(0, 240),
    href: input.href.startsWith("/") ? input.href : "/admin/build-map",
    tag: input.tag || `avantia-${input.eventType}`,
  });

  let delivered = 0;
  let failed = 0;
  const expiredIds: string[] = [];
  await Promise.all(selected.map(async (row) => {
    try {
      await webPush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 60 * 60 });
      delivered += 1;
    } catch (cause) {
      failed += 1;
      const statusCode = typeof cause === "object" && cause && "statusCode" in cause ? Number(cause.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) expiredIds.push(row.id);
      else console.error("manager_push_delivery_failed", { eventType: input.eventType, statusCode });
    }
  }));

  if (expiredIds.length) await admin.from("manager_push_subscriptions").delete().in("id", expiredIds);
  await admin.from("manager_push_notification_log").insert({
    event_type: input.eventType,
    title: input.title.slice(0, 160),
    body: input.body.slice(0, 500),
    href: input.href.slice(0, 500),
    delivered_count: delivered,
    failed_count: failed,
  });
  return { delivered, failed, subscribedDevices: selected.length };
}

export async function notifyManagersSafely(input: Parameters<typeof sendManagerPushNotification>[0]) {
  try {
    if (input.eventType === "test") return await sendManagerPushNotification(input);
    const requestMatch = input.eventType === "new_order"
      ? input.tag?.match(/^avantia-request-([0-9a-f-]{36})$/i)
      : null;
    const dedupeKey = requestMatch
      ? `new_order:${requestMatch[1]}`
      : `${input.eventType}:${input.tag || `${input.href}:${input.title}`}`;
    const { error } = await createAdminClient().rpc("queue_manager_push_event", {
      p_event_type: input.eventType,
      p_title: input.title,
      p_body: input.body,
      p_href: input.href,
      p_dedupe_key: dedupeKey,
      p_tag: input.tag || null,
    });
    if (error) throw new Error(`Unable to queue manager notification: ${error.message}`);
    return { delivered: 0, failed: 0, subscribedDevices: 0, queued: true };
  } catch (cause) {
    console.error("manager_push_notification_failed", { eventType: input.eventType, cause });
    return { delivered: 0, failed: 0, subscribedDevices: 0, queued: false };
  }
}
