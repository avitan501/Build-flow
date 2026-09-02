import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ManagerNotificationEvent } from "@/lib/manager-notification-feed";

type QueueRow = Omit<ManagerNotificationEvent, "read_at">;
type ReadRow = { notification_id: number; read_at: string };

const queueSelection = "id,event_type,title,body,href,created_at,processed_at";

export async function loadManagerNotificationFeed(
  supabase: SupabaseClient,
  userId: string,
  limit = 100,
) {
  const { data: queueRows, error: queueError } = await supabase
    .from("manager_push_queue")
    .select(queueSelection)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (queueError) throw new Error(`Notification feed is unavailable: ${queueError.message}`);

  const rows = (queueRows ?? []) as QueueRow[];
  const ids = rows.map((row) => row.id);
  const { data: readRows, error: readError } = ids.length
    ? await supabase
      .from("manager_notification_reads")
      .select("notification_id,read_at")
      .eq("user_id", userId)
      .in("notification_id", ids)
    : { data: [], error: null };
  if (readError) throw new Error(`Notification read state is unavailable: ${readError.message}`);

  const readAtById = new Map(
    ((readRows ?? []) as ReadRow[]).map((row) => [row.notification_id, row.read_at]),
  );
  return rows.map((row) => ({ ...row, read_at: readAtById.get(row.id) ?? null }));
}

export async function markManagerNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds: number[],
) {
  const ids = [...new Set(notificationIds.filter((id) => Number.isSafeInteger(id) && id > 0))];
  if (!ids.length) return;
  const readAt = new Date().toISOString();
  const { error } = await supabase.from("manager_notification_reads").upsert(
    ids.map((notificationId) => ({ user_id: userId, notification_id: notificationId, read_at: readAt })),
    { onConflict: "user_id,notification_id" },
  );
  if (error) throw new Error(`Notification read state could not be saved: ${error.message}`);
}
