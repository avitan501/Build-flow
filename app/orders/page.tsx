import { WireframePageByKey } from "@/components/buildflow/wireframe-page-loader";
import { requireSignedInProfile } from "@/lib/auth";

export default async function OrdersPage() {
  await requireSignedInProfile();
  return <WireframePageByKey pageKey="orders" />;
}
