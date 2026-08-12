export const MANAGER_EMAIL = "avitanneto@gmail.com";
export const STAFF_EMAILS = [
  "carbugatti03@gmail.com",
  "info@fivetownsbuilders.com",
] as const;

export type StaffCapability = "customers" | "suppliers";

type ManagerIdentity = {
  email?: string | null;
  role?: string | null;
  approvalStatus?: string | null;
  isActive?: boolean | null;
};

export function isManagerIdentity(params: Pick<ManagerIdentity, "email">) {
  return params.email?.trim().toLowerCase() === MANAGER_EMAIL;
}

export function isApprovedManagerIdentity(params: ManagerIdentity) {
  return (
    isManagerIdentity(params) &&
    params.role === "admin" &&
    params.approvalStatus === "approved" &&
    params.isActive === true
  );
}

export function isOwnerIdentity(params: { email?: string | null; phone?: string | null }) {
  return isManagerIdentity({ email: params.email });
}

export function isApprovedStaffIdentity(params: ManagerIdentity, capability?: StaffCapability) {
  const email = params.email?.trim().toLowerCase();
  const isStaffEmail = STAFF_EMAILS.some((staffEmail) => staffEmail === email);
  const hasCapability = !capability ||
    (isStaffEmail && ["customers", "suppliers"].includes(capability));

  return (
    isStaffEmail &&
    params.role === "staff" &&
    params.approvalStatus === "approved" &&
    params.isActive === true &&
    hasCapability
  );
}

export function managerCapabilities(params: ManagerIdentity) {
  const owner = isApprovedManagerIdentity(params);
  return {
    owner,
    customers: owner || isApprovedStaffIdentity(params, "customers"),
    suppliers: owner || isApprovedStaffIdentity(params, "suppliers"),
  };
}
