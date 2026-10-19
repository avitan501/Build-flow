import "server-only";
import { createHash, createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FollowupDetails } from "./followup";
import type { ClientResponse } from "./schema";

export async function submitResponse(id: string, state: ClientResponse, request: Request) {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Storage unavailable");
  // Vercel overwrites this header. Never trust arbitrary client forwarding headers.
  const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : "local";
  const day = new Date().toISOString().slice(0, 10);
  const bucket = createHmac("sha256", secret).update(`${day}:${ip || "unknown"}`).digest("hex");
  const content = JSON.stringify(state);
  const { data, error } = await createAdminClient().rpc("submit_client_questionnaire", {
    p_id: id, p_state: state, p_content_hash: createHash("sha256").update(content).digest("hex"), p_bucket: bucket,
  });
  if (error) throw new Error("Submission unavailable");
  return data as "saved" | "duplicate" | "conflict" | "limited";
}
export async function listResponses(offset: number) {
  const { data, error } = await createAdminClient().from("client_questionnaire_submissions")
    .select("id,created_at,name:state->profile->>name,company:state->profile->>company")
    .order("created_at", { ascending: false }).order("id").range(offset, offset + 49);
  if (error) throw new Error("Inbox unavailable");
  return data ?? [];
}
export async function loadResponse(id: string) {
  const { data, error } = await createAdminClient().from("client_questionnaire_submissions")
    .select("id,created_at,state").eq("id", id).maybeSingle();
  if (error) throw new Error("Inbox unavailable");
  if (!data) return null;
  const { data: followup, error: followupError } = await createAdminClient().from("client_questionnaire_followups")
    .select("location,timing,needed_date,updated_at").eq("submission_id", id).maybeSingle();
  if (followupError) throw new Error("Inbox unavailable");
  return { ...data, followup };
}
export async function saveFollowup(id: string, details: FollowupDetails) {
  const { error } = await createAdminClient().from("client_questionnaire_followups").upsert({
    submission_id: id, location: details.location, timing: details.timing,
    needed_date: details.neededDate || null, updated_at: new Date().toISOString(),
  }, { onConflict: "submission_id" });
  if (error) throw new Error("Follow-up unavailable");
}
