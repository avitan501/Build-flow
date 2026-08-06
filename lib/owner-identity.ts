export const MANAGER_EMAIL = "avitanneto@gmail.com";

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
