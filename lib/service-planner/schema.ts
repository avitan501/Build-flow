import { z } from "zod";

export const painIds = ["reorders", "missing", "pricing", "calls", "chasing", "stores", "quantities", "scope", "approvals", "other"] as const;
export const solutionIds = ["contact", "reorders", "compare", "takeoff", "scope", "gaps", "complete", "order", "book", "confirm", "approve", "other"] as const;
export const plannerSchema = z.object({
  type: z.literal("avantia-checklist-v5-fees"),
  rows: z.array(z.object({
    id: z.number().int().min(0).max(16),
    department: z.string().max(450), items: z.string().max(450),
    services: z.array(z.boolean().nullable()).length(7),
    pain: z.string().max(450), solution: z.string().max(450),
    painIds: z.array(z.enum(painIds)).max(10), solutionIds: z.array(z.enum(solutionIds)).max(12),
    painOther: z.string().max(250), solutionOther: z.string().max(250),
  }).strict()).length(17).refine(rows => rows.every((row, i) => row.id === i), "Invalid department order"),
  fees: z.array(z.string().max(180)).length(7),
}).strict();
export type PlannerState = z.infer<typeof plannerSchema>;
export const saveSchema = z.object({ revision: z.number().int().nonnegative(), state: plannerSchema }).strict();
export type PlannerVersion = { revision: number; savedAt: string; state: PlannerState };
export type PlannerRecord = { revision: number; state: PlannerState; history: PlannerVersion[]; updated_at: string | null };
