import Link from "next/link";
import { Building2, CreditCard, Trash2 } from "lucide-react";

import { updateAccountName, updateAccountPhone, updateAlternateContacts } from "@/app/account/actions";
import { createPaymentMethodSetupSession, removePaymentMethod } from "@/app/account/payment-actions";
import type { ProfileRecord } from "@/lib/auth";
import type { SavedPaymentMethod } from "@/lib/stripe";
import { AccountSignOutButton } from "@/components/buildflow/account-sign-out-button";

type AccountSettingsProps = {
  email: string | null;
  profile: ProfileRecord | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  feedbackCode?: string | null;
  feedbackTone?: "success" | "error" | null;
  paymentConfigured: boolean;
  paymentMethods: SavedPaymentMethod[];
  paymentFeedback: "saved" | "removed" | "cancelled" | null;
  paymentLoadFailed: boolean;
};

const errorMessages: Record<string, string> = {
  name: "Enter a valid name.",
  phone: "Enter a valid phone number.",
  "alternate-email": "Enter a valid alternate email.",
  "alternate-phone": "Enter a valid alternate phone number.",
  contacts: "Alternate contacts could not be saved. Please try again.",
  profile: "Account details could not be saved. Please try again.",
  "payment-unavailable": "Secure payment setup is not connected yet.",
  "payment-setup": "The secure payment screen could not be opened. Please try again.",
  "payment-remove": "That payment method could not be removed. Please try again.",
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

export function AccountSettings({
  email,
  profile,
  alternateEmail,
  alternatePhone,
  feedbackCode,
  feedbackTone,
  paymentConfigured,
  paymentMethods,
  paymentFeedback,
  paymentLoadFailed,
}: AccountSettingsProps) {
  const feedbackText = feedbackCode
    ? feedbackTone === "error"
      ? errorMessages[feedbackCode] || "Account could not be updated."
      : successMessages[feedbackCode] || "Account updated."
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
            <Link href="/shop" className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white">Let&apos;s Work</Link>
          </div>
        </header>

        {feedbackText ? (
          <div className={`rounded-[20px] border px-4 py-3 text-sm font-semibold ${feedbackTone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {feedbackText}
          </div>
        ) : null}

        {paymentFeedback ? (
          <div className={`rounded-[20px] border px-4 py-3 text-sm font-semibold ${paymentFeedback === "cancelled" ? "border-slate-200 bg-white text-slate-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {paymentFeedback === "saved" ? "Payment method saved securely." : paymentFeedback === "removed" ? "Payment method removed." : "Payment setup was cancelled. Nothing was saved."}
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

          <SectionCard title="Payment methods" description="Save a card or U.S. bank account for future approved payments.">
            <div className="grid gap-3">
              {paymentLoadFailed ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">Saved payment methods could not be loaded. Please try again.</p>
              ) : paymentMethods.length ? paymentMethods.map((method) => (
                <div key={method.id} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-800 shadow-sm">
                    {method.type === "card" ? <CreditCard size={19} aria-hidden="true" /> : <Building2 size={19} aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">{method.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{method.detail}</p>
                  </div>
                  <form action={removePaymentMethod}>
                    <input type="hidden" name="paymentMethodId" value={method.id} />
                    <button type="submit" title="Remove payment method" aria-label={`Remove ${method.title}`} className="flex size-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-700">
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </form>
                </div>
              )) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">No payment method saved.</p>
              )}

              <form action={createPaymentMethodSetupSession}>
                <button type="submit" disabled={!paymentConfigured} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white transition hover:bg-[#0068d1] disabled:cursor-not-allowed disabled:bg-slate-300">
                  <CreditCard size={18} aria-hidden="true" />
                  Add payment method
                </button>
              </form>
              <p className="text-xs leading-5 text-slate-500">
                {paymentConfigured
                  ? "Stripe securely stores the payment details. Avantia Build only sees masked account information, and saving a method does not charge it."
                  : "Secure payment setup is being connected. No payment information can be entered until it is active."}
              </p>
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
