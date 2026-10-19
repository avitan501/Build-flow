import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

function secret() {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("Storage unavailable");
  return key;
}
function signature(id: string, expiry: number) {
  return createHmac("sha256", secret()).update(`client-questionnaire-followup:v1:${id}:${expiry}`).digest("hex");
}
export function issueFollowupToken(id: string, now = Date.now()) {
  const expiry = Math.floor(now / 1000) + 86400;
  return `${expiry}.${signature(id, expiry)}`;
}
export function validFollowupToken(id: string, token: string, now = Date.now()) {
  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (expiry <= Math.floor(now / 1000) || expiry > Math.floor(now / 1000) + 86400) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(signature(id, expiry), "hex"));
}
export const followupSchema = z.object({
  id: z.uuid(), token: z.string().max(100),
  location: z.string().trim().max(180),
  timing: z.enum(["", "Soon", "Within a month", "Later / still planning", "Specific date"]),
  neededDate: z.string().refine(value => value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), "Invalid date"),
}).strict().refine(value => value.timing !== "Specific date" || Boolean(value.neededDate), "Choose a date")
  .refine(value => value.timing === "Specific date" || !value.neededDate, "Unexpected date")
  .refine(value => Boolean(value.location || value.timing), "Add a detail or skip");
export type FollowupDetails = Pick<z.infer<typeof followupSchema>, "location" | "timing" | "neededDate">;
