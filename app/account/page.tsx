import { AccountSettings } from "@/components/buildflow/account-settings";
import { requireSignedInProfile } from "@/lib/auth";

export default async function AccountPage() {
  const { user, profile } = await requireSignedInProfile();

  return <AccountSettings email={user.email ?? null} profile={profile} />;
}
