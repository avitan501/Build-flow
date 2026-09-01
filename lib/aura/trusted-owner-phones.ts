import "server-only";

export const TRUSTED_OWNER_SMS_PHONES = [
  "+13475675077",
  "+15169398484",
] as const;

export function isTrustedOwnerSmsPhone(value: string | null | undefined) {
  return Boolean(value && TRUSTED_OWNER_SMS_PHONES.includes(value as (typeof TRUSTED_OWNER_SMS_PHONES)[number]));
}
