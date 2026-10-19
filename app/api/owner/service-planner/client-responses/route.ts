import { z } from "zod";
import { getOwnerAccessSession } from "@/lib/owner-access";
import { listResponses, loadResponse } from "@/lib/client-questionnaire/store";
import { json } from "@/lib/client-questionnaire/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await getOwnerAccessSession();
  if (!session.isOwner || !session.user) return json({ error: "Owner access required." }, 403);
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const offset = Number(params.get("offset") ?? "0");
  if ((id !== null && !z.uuid().safeParse(id).success) || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return json({ error: "Invalid request." }, 400);
  try {
    if (id) { const response = await loadResponse(id); return response ? json(response) : json({ error: "Response not found." }, 404); }
    const responses = await listResponses(offset);
    return json({ responses, nextOffset: responses.length === 50 ? offset + 50 : null });
  } catch { return json({ error: "Responses are temporarily unavailable. Please retry." }, 503); }
}
