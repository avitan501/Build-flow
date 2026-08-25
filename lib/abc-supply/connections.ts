import "server-only";

import { decryptAbcSecret, encryptAbcSecret } from "@/lib/abc-supply/crypto";
import { getAbcSupplyConfig } from "@/lib/abc-supply/config";
import { refreshAbcAccessToken, type AbcTokenResponse } from "@/lib/abc-supply/oauth";
import { createAdminClient } from "@/lib/supabase/admin";

type ConnectionRow = {
  user_id: string;
  environment: "sandbox" | "production";
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  scope: string;
  expires_at: string;
  updated_at: string;
};

function expiryFromToken(token: AbcTokenResponse) {
  return new Date(Date.now() + Math.max(token.expires_in - 30, 30) * 1000).toISOString();
}

export async function saveAbcConnection(userId: string, token: AbcTokenResponse) {
  const admin = createAdminClient();
  const existing = await admin.from("abc_supply_connections").select("refresh_token_ciphertext").eq("user_id", userId).maybeSingle<{ refresh_token_ciphertext: string | null }>();
  if (existing.error) throw new Error("Could not read the existing ABC connection.");
  const { error } = await admin.from("abc_supply_connections").upsert({
    user_id: userId,
    environment: getAbcSupplyConfig().environment,
    access_token_ciphertext: encryptAbcSecret(token.access_token),
    refresh_token_ciphertext: token.refresh_token ? encryptAbcSecret(token.refresh_token) : existing.data?.refresh_token_ciphertext || null,
    token_type: token.token_type || "Bearer",
    scope: token.scope || "",
    expires_at: expiryFromToken(token),
  }, { onConflict: "user_id" });
  if (error) throw new Error("Could not save the ABC connection.");
}

async function loadConnection(userId: string) {
  const { data, error } = await createAdminClient()
    .from("abc_supply_connections")
    .select("user_id, environment, access_token_ciphertext, refresh_token_ciphertext, scope, expires_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle<ConnectionRow>();
  if (error) throw new Error("Could not load the ABC connection.");
  return data;
}

export async function getAbcConnectionStatus(userId: string) {
  const row = await loadConnection(userId);
  return row ? {
    connected: true as const,
    environment: row.environment,
    scopes: row.scope.split(/\s+/).filter(Boolean),
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  } : { connected: false as const };
}

export async function getAbcUserAccessToken(userId: string, forceRefresh = false) {
  const row = await loadConnection(userId);
  if (!row) throw new Error("Connect a myABCsupply account before requesting pricing.");
  if (row.environment !== getAbcSupplyConfig().environment) throw new Error("Reconnect myABCsupply for the current ABC environment.");
  if (!forceRefresh && new Date(row.expires_at).getTime() > Date.now() + 60_000) return decryptAbcSecret(row.access_token_ciphertext);
  if (!row.refresh_token_ciphertext) throw new Error("The ABC session expired. Reconnect myABCsupply.");
  const refreshed = await refreshAbcAccessToken(decryptAbcSecret(row.refresh_token_ciphertext));
  await saveAbcConnection(userId, refreshed);
  return refreshed.access_token;
}

export async function deleteAbcConnection(userId: string) {
  const { error } = await createAdminClient().from("abc_supply_connections").delete().eq("user_id", userId);
  if (error) throw new Error("Could not disconnect myABCsupply.");
}
