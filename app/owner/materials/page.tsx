import { OwnerMaterialsAdminShell } from "@/components/buildflow/owner-materials-admin-shell";
import { requireOwnerAccess } from "@/lib/owner-access";
import { getOwnerMaterialsAdminState } from "@/lib/owner-materials-admin-store";

export default async function OwnerMaterialsPage() {
  await requireOwnerAccess();

  const initialState = await getOwnerMaterialsAdminState();

  return <OwnerMaterialsAdminShell initialState={initialState} />;
}
