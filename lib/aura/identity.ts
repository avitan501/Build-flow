export function normalizeAuraPhone(value: unknown) {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (input.startsWith("+")) {
    // Repair the legacy bug that stored a New York 347 number as an invalid +34 destination.
    if (digits.length === 10 && digits.startsWith("347")) return `+1${digits}`;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function normalizeAuraEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export type AuraCustomerIdentity = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
};

export function customersForIdentity(customers: AuraCustomerIdentity[], phoneValue: unknown, emailValue: unknown) {
  const phone = normalizeAuraPhone(phoneValue);
  const email = normalizeAuraEmail(emailValue);
  return customers.filter((customer) =>
    Boolean((phone && normalizeAuraPhone(customer.phone) === phone) || (email && normalizeAuraEmail(customer.email) === email)),
  );
}
