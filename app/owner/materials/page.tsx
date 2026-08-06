import { OwnerMaterialsAdminShell } from "@/components/buildflow/owner-materials-admin-shell";
import { requireOwnerAccess } from "@/lib/owner-access";
import { getOwnerMaterialsAdminState, getOwnerMaterialsStorageStatus } from "@/lib/owner-materials-admin-store";

type OwnerMaterialsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerMaterialsPage({ searchParams }: OwnerMaterialsPageProps) {
  const { supabase } = await requireOwnerAccess();

  const query = await searchParams;
  const [initialState, storageStatus] = await Promise.all([
    getOwnerMaterialsAdminState(supabase),
    getOwnerMaterialsStorageStatus(supabase),
  ]);

  return (
    <OwnerMaterialsAdminShell
      initialState={initialState}
      storageStatus={storageStatus}
      initialUrlState={{
        mode: firstSearchValue(query.mode),
        batch: firstSearchValue(query.batch),
        filter: firstSearchValue(query.filter),
        q: firstSearchValue(query.q),
        item: firstSearchValue(query.item),
      }}
    />
  );
}
