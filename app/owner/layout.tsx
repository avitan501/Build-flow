import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AdminShell } from "@/components/buildflow/admin-shell"
import { requireManagerPortalProfile } from "@/lib/auth"

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const { access } = await requireManagerPortalProfile()
  if (!access.customers) redirect("/")
  return <AdminShell access={access}>{children}</AdminShell>
}
