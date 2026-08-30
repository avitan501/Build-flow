import { AccountSettings } from "@/components/buildflow/account-settings";
import { requireSignedInProfile } from "@/lib/auth";
import { contactEmailForDisplay } from "@/lib/auth-phone";

type AccountPageProps = {
  searchParams?: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = (await searchParams) ?? {};
  const { user, profile } = await requireSignedInProfile();

  return (
    <AccountSettings
      email={contactEmailForDisplay(user.email) || null}
      profile={profile}
      alternateEmail={typeof user.user_metadata.alternate_email === "string" ? user.user_metadata.alternate_email : null}
      alternatePhone={typeof user.user_metadata.alternate_phone === "string" ? user.user_metadata.alternate_phone : null}
      feedbackCode={params.error || params.updated || null}
      feedbackTone={params.error ? "error" : params.updated ? "success" : null}
      notificationEmail={user.user_metadata.notification_email !== false}
      notificationSms={user.user_metadata.notification_sms === true}
    />
  );
}
