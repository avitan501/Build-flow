import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { interviewSchema, type InterviewRecord, type InterviewState } from "./schema";
const table = "owner_contractor_interviews";
export async function listInterviews(offset = 0) {
  const { data, error } = await createAdminClient().from(table)
    .select("id,revision,updated_at,company:state->profile->>company,contact:state->profile->>contact,project:state->profile->>project,status:state->>status")
    .order("updated_at", { ascending: false }).order("id").range(offset, offset + 49);
  if (error) throw new Error("Interview storage unavailable");
  return data ?? [];
}
export async function loadInterview(id: string): Promise<InterviewRecord | null> {
  const { data, error } = await createAdminClient().from(table).select("id,revision,state,updated_at").eq("id", id).maybeSingle();
  if (error) throw new Error("Interview storage unavailable");
  return data ? { ...data, state: interviewSchema.parse(data.state) } as InterviewRecord : null;
}
export async function saveInterview(id: string, revision: number, state: InterviewState, actor: string): Promise<InterviewRecord | null> {
  const db = createAdminClient();
  const current = await db.from(table).select("revision,state,history,updated_at").eq("id", id).maybeSingle();
  if (current.error) throw new Error("Interview storage unavailable");
  if ((current.data?.revision ?? 0) !== revision) return null;
  const updated_at = new Date().toISOString();
  const next = { id, state, revision: revision + 1, updated_at, updated_by: actor,
    history: current.data ? [{ revision, savedAt: current.data.updated_at, state: current.data.state }, ...(current.data.history ?? [])].slice(0, 20) : [] };
  const result = revision === 0
    ? await db.from(table).insert(next).select("id,revision,state,updated_at").maybeSingle()
    : await db.from(table).update(next).eq("id", id).eq("revision", revision).select("id,revision,state,updated_at").maybeSingle();
  if (result.error?.code === "23505") return null;
  if (result.error) throw new Error("Interview save unavailable");
  return result.data as InterviewRecord | null;
}
