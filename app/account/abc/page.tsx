import { redirect } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";

export default async function LegacyAbcAccountPage() {
  await requireSignedInProfile();
  redirect("/admin/abc");
}
