import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import seed from "./seed.json";
import { plannerSchema, type PlannerRecord, type PlannerState } from "./schema";

const id = "avantia-service-planner";
const table = "owner_service_planners";
export async function loadPlanner(): Promise<PlannerRecord> {
  const { data, error } = await createAdminClient().from(table).select("revision,state,history,updated_at").eq("id", id).maybeSingle();
  if (error) throw new Error("Planner storage unavailable");
  if (!data) return { revision: 0, state: plannerSchema.parse(seed), history: [], updated_at: null };
  return { ...data, state: plannerSchema.parse(data.state) } as PlannerRecord;
}

export async function savePlanner(revision: number, state: PlannerState, actor: string): Promise<PlannerRecord | null> {
  const current = await loadPlanner();
  if (current.revision !== revision) return null;
  const updated_at = new Date().toISOString();
  const next = { id, revision: revision + 1, state, updated_at, updated_by: actor,
    history: [{ revision, savedAt: current.updated_at ?? updated_at, state: current.state }, ...current.history].slice(0, 20) };
  const db = createAdminClient();
  const result = revision === 0
    ? await db.from(table).insert(next).select("revision,state,history,updated_at").maybeSingle()
    : await db.from(table).update(next).eq("id", id).eq("revision", revision).select("revision,state,history,updated_at").maybeSingle();
  if (result.error?.code === "23505") return null;
  if (result.error) throw new Error("Planner save unavailable");
  return result.data as PlannerRecord | null;
}
