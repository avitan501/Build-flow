import type { ReactNode } from "react"

import { AdminShell } from "@/components/buildflow/admin-shell"
import { requireManagerPortalProfile } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { access } = await requireManagerPortalProfile()
  return <AdminShell access={access}>{children}</AdminShell>
}
