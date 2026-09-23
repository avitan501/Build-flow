import { getOwnerAccessSession } from "@/lib/owner-access";
import { loadPlanner, savePlanner } from "@/lib/service-planner/store";
import { saveSchema } from "@/lib/service-planner/schema";

export const dynamic = "force-dynamic";
function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
export async function GET() {
  const session = await getOwnerAccessSession();
  if (!session.isOwner || !session.user) return json({ error: "Owner access required" }, 403);
  try { return json(await loadPlanner()); }
  catch { return json({ error: "Could not load your saved planner. Please retry." }, 503); }
}
export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid origin" }, 403);
  const session = await getOwnerAccessSession();
  if (!session.isOwner || !session.user) return json({ error: "Owner access required" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON required" }, 415);
  // Bound the actual body, including requests with no Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Body required" }, 400);
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    bytes += value.length;
    if (bytes > 64000) { await reader.cancel(); return json({ error: "Planner is too large" }, 413); }
    chunks.push(value);
  }
  let parsed;
  try { parsed = saveSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
  catch { return json({ error: "Invalid JSON" }, 400); }
  if (!parsed.success) return json({ error: "Invalid planner entries" }, 400);
  try {
    const saved = await savePlanner(parsed.data.revision, parsed.data.state, session.user.id);
    if (!saved) return json({ error: "A newer version was saved elsewhere. Reload before editing again." }, 409);
    return json({ revision: saved.revision, updated_at: saved.updated_at });
  } catch { return json({ error: "Could not save. Keep this page open and retry." }, 503); }
}
