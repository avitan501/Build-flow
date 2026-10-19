import { submissionSchema } from "@/lib/client-questionnaire/schema";
import { submitResponse } from "@/lib/client-questionnaire/store";
import { hasSameOrigin, json, readBody } from "@/lib/client-questionnaire/http";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return json({ error: "Please submit from the questionnaire page." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON required." }, 415);
  let body;
  try { body = await readBody(request); }
  catch (error) { return json({ error: "The response could not be read. Keep your answers and try again." }, error instanceof Error && error.message === "size" ? 413 : 400); }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Please enter your contact details, answer the three required questions, and confirm submission." }, 400);
  if (parsed.data.website) return json({ error: "This response could not be submitted." }, 400);
  try {
    const result = await submitResponse(parsed.data.id, parsed.data.state, request);
    if (result === "limited") return json({ error: "Too many submissions today. Your answers are still here; please try again tomorrow." }, 429);
    if (result === "conflict") return json({ error: "This questionnaire was already submitted with different answers. Download your current answers before starting another." }, 409);
    if (result !== "saved" && result !== "duplicate") throw new Error("Unexpected result");
    return json({ ok: true, receipt: parsed.data.id });
  } catch { return json({ error: "We could not save your answers. They have not been cleared. Please retry or download a copy." }, 503); }
}
