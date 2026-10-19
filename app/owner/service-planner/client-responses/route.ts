import { requireOwnerAccess } from "@/lib/owner-access";
import inbox from "@/lib/client-questionnaire/inbox.html.json";
import { questionnairePage } from "@/lib/client-questionnaire/page";
export const dynamic = "force-dynamic";
export async function GET() {
  await requireOwnerAccess("/owner/service-planner/client-responses");
  return questionnairePage(inbox, "Avantia Build · Client responses");
}
