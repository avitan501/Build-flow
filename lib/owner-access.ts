import { redirect } from "next/navigation";

import { normalizePhoneNumber } from "@/lib/auth-phone";
import { getSessionWithProfile } from "@/lib/auth";

const OWNER_EMAILS = new Set(["avitanneto@gmail.com", "info@fivetownsbuilders.com"]);
const OWNER_PHONES = new Set(["+13475675077"]);

export function isOwnerIdentity(params: { email?: string | null; phone?: string | null }) {
  const email = params.email?.trim().toLowerCase() || "";
  const phone = params.phone ? normalizePhoneNumber(params.phone) : "";

  return OWNER_EMAILS.has(email) || OWNER_PHONES.has(phone);
}

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
