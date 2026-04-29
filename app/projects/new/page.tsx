import { ClientWireframePage } from "@/components/buildflow/client-wireframe-page";
import { requireSignedInProfile } from "@/lib/auth";

export default async function NewProjectPage() {
  await requireSignedInProfile();
  return <ClientWireframePage pageKey="projects-new" audienceLabel="Signed-in client" modeLabel="Protected client page" />;
}
