import { requireOwnerAccess } from "@/lib/owner-access";
import { loadPlanner } from "@/lib/service-planner/store";
import questions from "@/lib/contractor-discovery/questions.json";
import editor from "@/lib/contractor-discovery/editor.generated.json";
export const dynamic = "force-dynamic";
export async function GET() {
  await requireOwnerAccess("/owner/service-planner/interviews");
  try {
    const planner=await loadPlanner();
    const initial=JSON.stringify({questions,departments:planner.state.rows.map(row=>({id:row.id,name:row.department,items:row.items})),offers:planner.state.serviceOffers??null}).replace(/</g,"\\u003c");
    return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Avantia · Contractor discovery</title></head><body><script>window.discoveryConfig=${initial};</script>${editor}</body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow","Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}});
  } catch { return new Response("Your service planner is temporarily unavailable. Please retry; saved interviews have not been replaced.",{status:503,headers:{"Cache-Control":"private, no-store"}}); }
}
