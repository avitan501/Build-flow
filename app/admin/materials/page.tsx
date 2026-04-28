import { WireframePageByKey } from "@/components/buildflow/wireframe-page-loader";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminMaterialsPage() {
  await requireAdminProfile();
  return <WireframePageByKey pageKey="admin-materials" />;
}
