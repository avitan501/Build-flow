import { redirect } from "next/navigation";

import { requireStaffProfile } from "@/lib/auth";

export default async function AdminProjectsPage() {
  await requireStaffProfile("customers");
  redirect("/admin/users?view=projects");
}
