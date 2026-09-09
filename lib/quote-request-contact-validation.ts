export type ContactField = "fullName" | "email" | "phone";

export function validateQuoteRequestContact(input: { fullName: string; email: string; phone: string }) {
  const name = input.fullName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const errors: Partial<Record<ContactField, string>> = {};
  if (!name && (!email || !phone)) {
    errors.fullName = "Enter a name, or enter both email and phone.";
    if (!email) errors.email = "Email is needed when no name is provided.";
    if (!phone) errors.phone = "Phone is needed when no name is provided.";
  } else if (name && !email && !phone) {
    errors.email = "Enter an email address or phone number.";
    errors.phone = "Enter a phone number or email address.";
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email address.";
  if (phone && phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
  return errors;
}
