import { AccountSettings } from "@/components/buildflow/account-settings";
import { requireSignedInProfile } from "@/lib/auth";

type AccountPageProps = {
  searchParams?: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = (await searchParams) ?? {};
  const { user, profile } = await requireSignedInProfile();

  return <AccountSettings email={user.email ?? null} profile={profile} feedbackCode={params.error || params.updated || null} feedbackTone={params.error ? "error" : params.updated ? "success" : null} />;
}
