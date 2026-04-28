import { WireframePageByKey } from "@/components/buildflow/wireframe-page-loader";
import { requireSignedInProfile } from "@/lib/auth";

export default async function UploadPage() {
  await requireSignedInProfile();
  return <WireframePageByKey pageKey="upload" />;
}
