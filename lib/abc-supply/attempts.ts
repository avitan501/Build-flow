import "server-only";

import { createHash } from "node:crypto";

import { decryptAbcSecret, encryptAbcSecret } from "@/lib/abc-supply/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export async function createAbcOAuthAttempt(params: { state: string; verifier: string; userId: string }) {
  const { error } = await createAdminClient().from("abc_supply_oauth_attempts").insert({
    state_hash: hashState(params.state),
    user_id: params.userId,
    verifier_ciphertext: encryptAbcSecret(params.verifier),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error("Could not start the ABC connection.");
}

export async function consumeAbcOAuthAttempt(params: { state: string; expectedUserId?: string }) {
  let query = createAdminClient()
    .from("abc_supply_oauth_attempts")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state_hash", hashState(params.state))
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString());
  if (params.expectedUserId) query = query.eq("user_id", params.expectedUserId);
  const { data, error } = await query
    .select("user_id, verifier_ciphertext")
    .maybeSingle<{ user_id: string; verifier_ciphertext: string }>();
  if (error || !data) throw new Error("The ABC connection request expired or was already used.");
  return { userId: data.user_id, verifier: decryptAbcSecret(data.verifier_ciphertext) };
}
