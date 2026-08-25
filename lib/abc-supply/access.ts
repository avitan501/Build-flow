import type { ProfileRecord } from "@/lib/auth";

export function canUseAbcSupply(profile: ProfileRecord | null) {
  return Boolean(profile?.is_active && profile.approval_status === "approved");
}
