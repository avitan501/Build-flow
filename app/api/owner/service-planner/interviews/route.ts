import { getOwnerAccessSession } from "@/lib/owner-access";
import { interviewIdSchema, interviewSaveSchema } from "@/lib/contractor-discovery/schema";
import { listInterviews, loadInterview, saveInterview } from "@/lib/contractor-discovery/store";
export const dynamic = "force-dynamic";
function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control":"private, no-store", "X-Robots-Tag":"noindex, nofollow" } }); }
export async function GET(request: Request) {
  const session = await getOwnerAccessSession();
  if (!session.isOwner || !session.user) return json({ error:"Owner access required" },403);
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  if (id !== null && !interviewIdSchema.safeParse(id).success) return json({ error:"Invalid interview" },400);
  const offset = Number(params.get("offset") ?? "0");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return json({error:"Invalid page"},400);
  try {
    if (!id) { const interviews = await listInterviews(offset); return json({ interviews, nextOffset: interviews.length === 50 ? offset + 50 : null }); }
    const interview = await loadInterview(id);
    return interview ? json(interview) : json({ error:"Interview not found" },404);
  } catch { return json({ error:"Could not load interviews. Please retry." },503); }
}
export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error:"Invalid origin" },403);
  const session = await getOwnerAccessSession();
  if (!session.isOwner || !session.user) return json({ error:"Owner access required" },403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error:"JSON required" },415);
  const reader = request.body?.getReader();
  if (!reader) return json({error:"Body required"},400);
  const chunks: Uint8Array[] = []; let bytes=0;
  while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.length; if (bytes>1000000) { await reader.cancel(); return json({error:"Interview is too large"},413); } chunks.push(value); }
  let parsed;
  try { parsed = interviewSaveSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { return json({error:"Invalid JSON"},400); }
  if (!parsed.success) return json({error:"Check company name and interview entries."},400);
  try {
    const result=await saveInterview(parsed.data.id,parsed.data.revision,parsed.data.state,session.user.id);
    return result ? json({id:result.id,revision:result.revision,updated_at:result.updated_at}) : json({error:"A newer version exists. Download your notes, then reopen the saved interview to compare."},409);
  } catch { return json({error:"Could not save. Keep this page open and retry or download your notes."},503); }
}
