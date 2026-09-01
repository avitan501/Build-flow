import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  SUPPLIER_NETWORK_CHANNELS,
  type SupplierNetworkChannel,
  type SupplierNetworkOverride,
  type SupplierNetworkStage,
} from "@/lib/supplier-network";

const PREFIX = "supplier_network_options_v1:";

type OptionRow = { details: string | null };

export function serializeSupplierNetworkOptions(
  key: string,
  override: SupplierNetworkOverride,
) {
  return `${PREFIX}${JSON.stringify({ key, ...override })}`;
}

export async function loadSupplierNetworkOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("manager_goals")
    .select("details")
    .eq("assignee", "carlos")
    .like("details", `${PREFIX}%`);
  if (error)
    throw new Error(`Unable to load supplier options: ${error.message}`);

  const allowed = new Set<string>(SUPPLIER_NETWORK_CHANNELS);
  const stages = new Set<SupplierNetworkStage>(["approved", "contact", "more"]);
  const entries: Array<[string, SupplierNetworkOverride]> = [];
  for (const row of (data ?? []) as OptionRow[]) {
    if (!row.details?.startsWith(PREFIX)) continue;
    try {
      const parsed = JSON.parse(row.details.slice(PREFIX.length)) as {
        key?: unknown;
        channels?: unknown;
        stage?: unknown;
        status?: unknown;
        note?: unknown;
        hidden?: unknown;
        priority?: unknown;
      };
      if (typeof parsed.key !== "string") continue;
      entries.push([
        parsed.key,
        {
          ...(Array.isArray(parsed.channels)
            ? {
                channels: parsed.channels.filter(
                  (channel): channel is SupplierNetworkChannel =>
                    typeof channel === "string" && allowed.has(channel),
                ),
              }
            : {}),
          ...(typeof parsed.stage === "string" &&
          stages.has(parsed.stage as SupplierNetworkStage)
            ? { stage: parsed.stage as SupplierNetworkStage }
            : {}),
          ...(typeof parsed.status === "string"
            ? { status: parsed.status.slice(0, 80) }
            : {}),
          ...(typeof parsed.note === "string"
            ? { note: parsed.note.slice(0, 2000) }
            : {}),
          ...(typeof parsed.hidden === "boolean"
            ? { hidden: parsed.hidden }
            : {}),
          ...(typeof parsed.priority === "boolean"
            ? { priority: parsed.priority }
            : {}),
        },
      ]);
    } catch {
      // Ignore malformed legacy notes without blocking the supplier workspace.
    }
  }
  return Object.fromEntries(entries) as Record<string, SupplierNetworkOverride>;
}

export async function saveSupplierNetworkOptions(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  supplierName: string,
  override: SupplierNetworkOverride,
) {
  const title = `Supplier options · ${key}`;
  const { data: existing, error: readError } = await supabase
    .from("manager_goals")
    .select("id")
    .eq("assignee", "carlos")
    .eq("title", title)
    .maybeSingle<{ id: string }>();
  if (readError)
    throw new Error(`Unable to read supplier options: ${readError.message}`);

  const payload = {
    assignee: "carlos" as const,
    title,
    details: serializeSupplierNetworkOptions(key, override),
    status: "open" as const,
  };
  const result = existing
    ? await supabase.from("manager_goals").update(payload).eq("id", existing.id)
    : await supabase.from("manager_goals").insert({
        ...payload,
        created_by: userId,
        title: `Supplier options · ${key}`,
      });
  if (result.error)
    throw new Error(
      `Unable to save options for ${supplierName}: ${result.error.message}`,
    );
}
