import { z } from "zod";
import questions from "./questions.json";
const answerKeys = questions.sections.flatMap(section => section.questions.map(question => question.id));
const text = z.string().max(2500);
export const interviewSchema = z.object({
  type: z.literal("avantia-contractor-discovery-v1"),
  profile: z.object({ company: z.string().trim().min(1).max(180), contact: z.string().max(180), project: z.string().max(300), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict(),
  answers: z.record(z.string(), text).refine(value => Object.keys(value).every(key => answerKeys.includes(key)), "Unknown question"),
  departments: z.array(z.number().int().min(0).max(16)).max(17).refine(value => new Set(value).size === value.length),
  priorities: z.array(z.object({
    pain: z.enum(["quantities","scope","pricing","calls","stores","chasing","missing","reorders","approvals","other"]),
    evidence: text, frequency: z.string().max(300), impact: z.string().max(500),
  }).strict()).max(2),
  services: z.array(z.enum(["takeoff","quotes","orders","reorders"])).max(4).refine(value => new Set(value).size === value.length),
  plan: z.object({ summary: z.string().max(10000), responsibility: text, exclusions: text, nextStep: text, successMeasure: text, fee: z.string().max(500), internalNotes: text }).strict(),
  status: z.enum(["draft","reviewed","pilot-agreed","archived"]),
}).strict();
export const interviewSaveSchema = z.object({ id: z.string().uuid(), revision: z.number().int().min(0), state: interviewSchema }).strict();
export const interviewIdSchema = z.string().uuid();
export type InterviewState = z.infer<typeof interviewSchema>;
export type InterviewRecord = { id: string; revision: number; state: InterviewState; updated_at: string | null };
