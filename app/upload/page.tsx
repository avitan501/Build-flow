import { ClientWireframePage } from "@/components/buildflow/client-wireframe-page";
import { requireSignedInProfile } from "@/lib/auth";

export default async function UploadPage() {
  await requireSignedInProfile();
  return <ClientWireframePage pageKey="upload" audienceLabel="Signed-in client" modeLabel="Protected client page" />;
}
