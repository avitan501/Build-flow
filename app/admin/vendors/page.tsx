import { SupplierRoutingManager } from "@/components/buildflow/supplier-routing-manager";
import { requireAdminProfile } from "@/lib/auth";

export default async function AdminVendorsPage() {
  await requireAdminProfile();

  return <SupplierRoutingManager />;
}
