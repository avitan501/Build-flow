import { WireframePageByKey } from "@/components/buildflow/wireframe-page-loader";
import { requireStaffProfile } from "@/lib/auth";

export default async function AdminQuotesPage() {
  await requireStaffProfile("quotes");
  return <WireframePageByKey pageKey="admin-quotes" />;
}
