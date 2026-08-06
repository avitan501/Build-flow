import type { ReactNode } from "react"

import { AdminShell } from "@/components/buildflow/admin-shell"
import { requireAdminProfile } from "@/lib/auth"

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireAdminProfile()
  return <AdminShell>{children}</AdminShell>
}
