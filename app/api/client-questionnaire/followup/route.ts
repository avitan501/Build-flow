import { followupSchema, validFollowupToken } from "@/lib/client-questionnaire/followup";
import { saveFollowup } from "@/lib/client-questionnaire/store";
import { hasSameOrigin, json, readBody } from "@/lib/client-questionnaire/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return json({ error: "Please use the questionnaire page." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON required." }, 415);
  let body;
  try { body = await readBody(request); }
  catch (error) { return json({ error: "Please check the extra details and try again. Your original request is received." }, error instanceof Error && error.message === "size" ? 413 : 400); }
  const parsed = followupSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Please check the location and timing, or skip this step. Your original request is received." }, 400);
  try {
    const { id, token, location, timing, neededDate } = parsed.data;
    if (!validFollowupToken(id, token)) return json({ error: "This extra-details link has expired or is invalid. Your original request is still received; share these details when we contact you." }, 403);
    await saveFollowup(id, { location, timing, neededDate });
    return json({ ok: true });
  } catch {
    return json({ error: "We could not save these extra details. Your original request is received. Retry or skip this step." }, 503);
  }
}
