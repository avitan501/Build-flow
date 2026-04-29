import { ClientWireframePage } from "@/components/buildflow/client-wireframe-page";
import { requireSignedInProfile } from "@/lib/auth";

export default async function ProjectsPage() {
  await requireSignedInProfile();
  return <ClientWireframePage pageKey="projects" />;
}
