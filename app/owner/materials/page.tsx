import { OwnerMaterialsAdminShell } from "@/components/buildflow/owner-materials-admin-shell";
import { getOwnerMaterialsAdminState } from "@/lib/owner-materials-admin-store";

export default async function OwnerMaterialsPage() {
  const initialState = await getOwnerMaterialsAdminState();

  return <OwnerMaterialsAdminShell initialState={initialState} />;
}
