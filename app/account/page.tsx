import { AccountSettings } from "@/components/buildflow/account-settings";
import { requireSignedInProfile } from "@/lib/auth";
import {
  isStripeConfigured,
  listSavedPaymentMethods,
  verifyPaymentSetupSession,
  type SavedPaymentMethod,
} from "@/lib/stripe";

type AccountPageProps = {
  searchParams?: Promise<{
    error?: string;
    updated?: string;
    payment?: string;
    session_id?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = (await searchParams) ?? {};
  const { user, profile } = await requireSignedInProfile();
  const paymentConfigured = isStripeConfigured();
  let paymentMethods: SavedPaymentMethod[] = [];
  let paymentFeedback: "saved" | "removed" | "cancelled" | null = null;
  let paymentLoadFailed = false;

  try {
    paymentMethods = await listSavedPaymentMethods(user.id);
    if (params.payment === "success" && typeof params.session_id === "string") {
      paymentFeedback = await verifyPaymentSetupSession(user.id, params.session_id) ? "saved" : null;
    } else if (params.payment === "removed") {
      paymentFeedback = "removed";
    } else if (params.payment === "cancelled") {
      paymentFeedback = "cancelled";
    }
  } catch {
    paymentMethods = [];
    paymentLoadFailed = true;
  }

  return (
    <AccountSettings
      email={user.email ?? null}
      profile={profile}
      alternateEmail={typeof user.user_metadata.alternate_email === "string" ? user.user_metadata.alternate_email : null}
      alternatePhone={typeof user.user_metadata.alternate_phone === "string" ? user.user_metadata.alternate_phone : null}
      feedbackCode={params.error || params.updated || null}
      feedbackTone={params.error ? "error" : params.updated ? "success" : null}
      paymentConfigured={paymentConfigured}
      paymentMethods={paymentMethods}
      paymentFeedback={paymentFeedback}
      paymentLoadFailed={paymentLoadFailed}
    />
  );
}
