import { normalizePhoneNumber } from "@/lib/auth-phone";

const OWNER_EMAILS = new Set(["avitanneto@gmail.com", "info@fivetownsbuilders.com"]);
const OWNER_PHONES = new Set(["+13475675077"]);
export const MANAGER_EMAIL = "avitanneto@gmail.com";

export function isManagerIdentity(params: { email?: string | null }) {
  return params.email?.trim().toLowerCase() === MANAGER_EMAIL;
}

export function isOwnerIdentity(params: { email?: string | null; phone?: string | null }) {
  const email = params.email?.trim().toLowerCase() || "";
  const phone = params.phone ? normalizePhoneNumber(params.phone) : "";

  return OWNER_EMAILS.has(email) || OWNER_PHONES.has(phone);
}
