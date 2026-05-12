import { redirect } from "next/navigation";

import { requireAdminProfile } from "@/lib/auth";

export default async function AdminMaterialsPage() {
  await requireAdminProfile();
  redirect("/owner/materials");
}
