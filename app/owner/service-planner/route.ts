import { requireOwnerAccess } from "@/lib/owner-access";
import { loadPlanner } from "@/lib/service-planner/store";
import editor from "@/lib/service-planner/editor.generated.json";
import runtime from "@/lib/service-planner/runtime.generated.json";

export const dynamic = "force-dynamic";
export async function GET() {
  await requireOwnerAccess("/owner/service-planner");
  try {
    const saved = await loadPlanner();
    const initial = JSON.stringify({ revision: saved.revision, state: saved.state }).replace(/</g, "\\u003c");
    return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Avantia · Service planner</title></head><body><script>window.plannerInitial=${initial};</script>${editor}${runtime}</body></html>`, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" },
    });
  } catch {
    return new Response("Planner storage is temporarily unavailable. Your saved work has not been replaced. Please refresh to retry.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
