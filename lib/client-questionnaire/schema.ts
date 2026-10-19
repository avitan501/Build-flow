import { z } from "zod";
import questions from "./questions.json";

const keys = [...questions.sections.flatMap(section => section.questions.map(question => question.id)), ...questions.legacyQuestions.map(question => question.id)];
const requiredKeys = questions.sections.flatMap(section => section.questions.filter(question => question.required).map(question => question.id));
export const responseSchema = z.object({
  type: z.literal("avantia-client-questionnaire-v1"),
  profile: z.object({
    name: z.string().trim().min(1).max(180),
    company: z.string().trim().max(180),
    email: z.union([z.literal(""), z.email().max(254)]),
    phone: z.string().trim().max(40),
  }).strict().refine(profile => Boolean(profile.email || profile.phone), "Enter an email or phone number"),
  answers: z.record(z.string(), z.string().trim().max(10000))
    .refine(answers => Object.entries(answers).every(([key,value]) => key === "departments" || value.length <= 2500), "Answer is too long")
    .refine(answers => questions.sections.every(section => section.questions.every(question => {
      const lines = (answers[question.id] || "").split("\n");
      if ("multiple" in question && question.multiple === false && question.choices.filter(choice => lines.includes(choice)).length > 1) return false;
      if ("exclusive" in question && Array.isArray(question.exclusive) && question.exclusive.some(choice => lines.includes(choice)) && lines.length > 1) return false;
      return true;
    })), "Choose one answer for single-choice questions; do not combine no issues with other answers")
    .refine(answers => Object.keys(answers).every(key => keys.includes(key)), "Unknown question")
    .refine(answers => requiredKeys.every(key => Boolean(answers[key]?.trim())), "Choose your requested help and delivery preference"),
  consent: z.literal(true),
}).strict();
export const submissionSchema = z.object({ id: z.uuid(), state: responseSchema, website: z.string().max(200) }).strict();
export type ClientResponse = z.infer<typeof responseSchema>;
