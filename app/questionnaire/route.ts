import form from "@/lib/client-questionnaire/form.html.json";
import { questionnairePage } from "@/lib/client-questionnaire/page";
export const dynamic = "force-dynamic";
export async function GET() {
  return questionnairePage(form, "Avantia Build · Your project questionnaire");
}
