const PHONE_LOGIN_EMAIL_DOMAIN = "phone-login.buildflow.local";

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : "";
}

export function phoneLoginEmailForPhone(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const digits = normalizedPhone.replace(/\D/g, "");

  if (!digits) return null;

  return `phone-${digits}@${PHONE_LOGIN_EMAIL_DOMAIN}`;
}
