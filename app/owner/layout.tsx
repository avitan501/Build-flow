import type { ReactNode } from "react"

import { requireAdminProfile } from "@/lib/auth"

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  await requireAdminProfile()
  return children
}
