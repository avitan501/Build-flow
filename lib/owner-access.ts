import { redirect } from "next/navigation";

import { getSessionWithProfile } from "@/lib/auth";
import { isOwnerIdentity } from "@/lib/owner-identity";

export { isOwnerIdentity } from "@/lib/owner-identity";

export async function getOwnerAccessSession() {
  const session = await getSessionWithProfile();
  const email = session.user?.email || session.profile?.email || null;
  const phone = session.user?.phone || session.profile?.phone || null;

  return {
    ...session,
    isOwner: Boolean(session.user && isOwnerIdentity({ email, phone })),
  };
}

export async function requireOwnerAccess() {
  const session = await getOwnerAccessSession();

  if (!session.user) {
    redirect("/login?next=/owner/materials");
  }

  if (!session.isOwner) {
    redirect("/");
  }

  return session;
}
