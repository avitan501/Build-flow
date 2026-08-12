import Link from "next/link";

import { updateAccountName, updateAccountPhone, updateAlternateContacts } from "@/app/account/actions";
import type { ProfileRecord } from "@/lib/auth";
import { AccountSignOutButton } from "@/components/buildflow/account-sign-out-button";

type AccountSettingsProps = {
  email: string | null;
  profile: ProfileRecord | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  feedbackCode?: string | null;
  feedbackTone?: "success" | "error" | null;
  paymentStatus?: string | null;
  hasSavedPaymentProfile?: boolean;
};

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/5kQaEWb6q64N6FybJl97G00";

const errorMessages: Record<string, string> = {
  name: "Enter a valid name.",
  phone: "Enter a valid phone number.",
  "alternate-email": "Enter a valid alternate email.",
  "alternate-phone": "Enter a valid alternate phone number.",
  contacts: "Alternate contacts could not be saved. Please try again.",
  profile: "Account details could not be saved. Please try again.",
};

const successMessages: Record<string, string> = {
  name: "Name saved.",
  phone: "Phone number saved.",
  contacts: "Alternate contacts saved.",
};

const inputClass = "min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-sky-100 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AccountSettings({ email, profile, alternateEmail, alternatePhone, feedbackCode, feedbackTone, paymentStatus, hasSavedPaymentProfile = false }: AccountSettingsProps) {
  const feedbackText = feedbackCode
    ? feedbackTone === "error"
      ? errorMessages[feedbackCode] || "Account could not be updated."
      : successMessages[feedbackCode] || "Account updated."
    : null;
  const paymentFeedback = paymentStatus === "saved"
    ? { tone: "success", text: "Payment method saved securely with Stripe." }
    : paymentStatus === "canceled"
      ? { tone: "neutral", text: "Payment setup was canceled. Nothing was saved." }
      : paymentStatus === "setup-unavailable"
        ? { tone: "error", text: "Secure payment setup is not connected yet. You can still use the payment link below." }
        : paymentStatus === "no-payment-profile"
          ? { tone: "neutral", text: "Save a payment method first, then you can manage it here." }
          : paymentStatus === "portal-error"
            ? { tone: "error", text: "Stripe could not open payment settings. Please try again." }
            : paymentStatus === "setup-error"
              ? { tone: "error", text: "Stripe could not save that payment method. Please try again." }
              : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_48%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-5">
        <header className="rounded-[28px] border border-sky-100 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase text-sky-700">Account</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Account & Settings</h1>
          <p className="mt-2 text-sm text-slate-500">Manage the contact details used for your projects and requests.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/projects" className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white">My Projects</Link>
            <Link href="/shop" className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white">Order Materials</Link>
          </div>
        </header>

        {feedbackText ? (
          <div className={`rounded-[20px] border px-4 py-3 text-sm font-semibold ${feedbackTone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {feedbackText}
          </div>
        ) : null}

        {paymentFeedback ? (
          <div className={`rounded-[20px] border px-4 py-3 text-sm font-semibold ${paymentFeedback.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : paymentFeedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}>
            {paymentFeedback.text}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Primary profile" description="Your main name, email, and phone number.">
            <div className="grid gap-5">
              <form action={updateAccountName} className="grid gap-2">
                <label htmlFor="fullName" className="text-sm font-semibold text-slate-900">Name</label>
                <input id="fullName" name="fullName" type="text" defaultValue={profile?.full_name || ""} placeholder="Full name" autoComplete="name" className={inputClass} />
                <button type="submit" className="min-h-11 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white">Save name</button>
              </form>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Login email</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950">{email || profile?.email || "Not available"}</p>
              </div>

              <form action={updateAccountPhone} className="grid gap-2">
                <label htmlFor="phone" className="text-sm font-semibold text-slate-900">Primary phone</label>
                <input id="phone" name="phone" type="tel" defaultValue={profile?.phone || ""} placeholder="+1 555 123 4567" autoComplete="tel" className={inputClass} />
                <button type="submit" className="min-h-11 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white">Save phone</button>
              </form>
            </div>
          </SectionCard>

          <SectionCard title="Alternate contacts" description="Add a second email or phone for project coordination. Leave either field blank to remove it.">
            <form action={updateAlternateContacts} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                Alternate email
                <input name="alternateEmail" type="email" defaultValue={alternateEmail || ""} placeholder="alternate@example.com" autoComplete="email" className={inputClass} />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-900">
                Alternate phone
                <input name="alternatePhone" type="tel" defaultValue={alternatePhone || ""} placeholder="+1 555 123 4567" autoComplete="tel" className={inputClass} />
              </label>
              <button type="submit" className="min-h-12 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white">Save alternate contacts</button>
            </form>
          </SectionCard>

          <SectionCard title="Security" description="Change your password through the secure account recovery flow.">
            <Link href="/reset-password" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Change password</Link>
          </SectionCard>

          <SectionCard title="Payments" description="Pay or securely save a card or U.S. bank account with Stripe.">
            <div className="grid gap-3">
              <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white">
                Pay securely
              </a>
              <form action="/api/stripe/setup" method="post">
                <button type="submit" className="min-h-12 w-full rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-950">
                  Save card or bank account
                </button>
              </form>
              {hasSavedPaymentProfile ? (
                <form action="/api/stripe/portal" method="post">
                  <button type="submit" className="min-h-12 w-full rounded-full border border-slate-300 bg-slate-50 px-5 text-sm font-semibold text-slate-950">
                    Manage saved payment methods
                  </button>
                </form>
              ) : null}
              <p className="text-xs leading-5 text-slate-500">Card and bank details are handled and stored by Stripe. Avantia Build does not receive or store full account numbers.</p>
            </div>
          </SectionCard>

          <SectionCard title="Sign out" description="End this session on the current device.">
            <AccountSignOutButton />
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
