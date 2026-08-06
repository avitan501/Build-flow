import { redirect } from "next/navigation";

import { getSessionWithProfile } from "@/lib/auth";
import { isApprovedManagerIdentity } from "@/lib/owner-identity";

export { isOwnerIdentity } from "@/lib/owner-identity";

export async function getOwnerAccessSession() {
  const session = await getSessionWithProfile();
  const email = session.user?.email || session.profile?.email || null;

  return {
    ...session,
    isOwner: Boolean(
      session.user &&
        isApprovedManagerIdentity({
          email,
          role: session.profile?.role,
          approvalStatus: session.profile?.approval_status,
          isActive: session.profile?.is_active,
        }),
    ),
  };
}

export async function requireOwnerAccess() {
  const session = await getOwnerAccessSession();

  if (!session.user || !session.supabase) {
    redirect("/login?next=/owner/materials");
  }

  if (!session.isOwner) {
    redirect("/");
  }

  return session;
}
