import { WireframePageByKey } from "@/components/buildflow/wireframe-page-loader";
import { requireSignedInProfile } from "@/lib/auth";

export default async function DemoOrderPage() {
  await requireSignedInProfile();
  return <WireframePageByKey pageKey="orders-demo" />;
}
