import { WireframePageByKey } from "@/components/buildflow/wireframe-page-loader";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminQuotesPage() {
  await requireAdminProfile();
  return <WireframePageByKey pageKey="admin-quotes" />;
}
