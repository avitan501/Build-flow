export const MANAGER_EMAIL = "avitanneto@gmail.com";

export function isManagerIdentity(params: { email?: string | null }) {
  return params.email?.trim().toLowerCase() === MANAGER_EMAIL;
}

export function isOwnerIdentity(params: { email?: string | null; phone?: string | null }) {
  return isManagerIdentity({ email: params.email });
}
