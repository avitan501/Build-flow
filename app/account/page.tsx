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
  const { user, profile, supabase } = await requireSignedInProfile();
  const contacts = await supabase.from("account_contact_settings").select("alternate_email,alternate_phone,revision").eq("user_id", user.id).maybeSingle();

  return (
    <AccountSettings
      email={contactEmailForDisplay(user.email) || null}
      profile={profile}
      alternateEmail={contacts.data?.alternate_email ?? null}
      alternatePhone={contacts.data?.alternate_phone ?? null}
      contactRevision={Number(contacts.data?.revision ?? 0)}
      contactsUnavailable={Boolean(contacts.error)}
      feedbackCode={params.error || params.updated || null}
      feedbackTone={params.error ? "error" : params.updated ? "success" : null}
      notificationEmail={user.user_metadata.notification_email !== false}
      notificationSms={user.user_metadata.notification_sms === true}
    />
  );
}
