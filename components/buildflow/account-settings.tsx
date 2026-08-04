import Link from "next/link";

import { updateAccountName, updateAccountPhone } from "@/app/account/actions";
import type { ProfileRecord } from "@/lib/auth";
import { AccountSignOutButton } from "@/components/buildflow/account-sign-out-button";

type AccountSettingsProps = {
  email: string | null;
  profile: ProfileRecord | null;
  feedbackCode?: string | null;
  feedbackTone?: "success" | "error" | null;
};

const errorMessages: Record<string, string> = {
  name: "Enter a valid name.",
  phone: "Enter a valid phone number.",
  profile: "Account details could not be saved. Please try again.",
};

const successMessages: Record<string, string> = {
  name: "Name saved.",
  phone: "Phone number saved.",
};

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldRow({ label, value, note, actionLabel, children }: { label: string; value: string; note?: string; actionLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
          <div className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</div>
          {note ? <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div> : null}
        </div>
        {children ? (
          <details className="group shrink-0 text-right">
            <summary className="list-none rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 [&::-webkit-details-marker]:hidden">
              {actionLabel || "Change"}
            </summary>
            <div className="mt-3 w-[min(18rem,calc(100vw-4rem))] rounded-[22px] border border-sky-100 bg-white p-3 text-left shadow-[0_18px_42px_rgba(15,23,42,0.1)]">
              {children}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function LockedRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
      </div>
      <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400">Locked</span>
    </div>
  );
}

function PendingAddRow({ label, value, note, actionLabel }: { label: string; value: string; note: string; actionLabel: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[22px] border border-dashed border-sky-200 bg-sky-50/50 px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600/75">{label}</div>
        <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
      </div>
      <button type="button" disabled className="shrink-0 rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400 shadow-sm">
        {actionLabel}
      </button>
    </div>
  );
}

function ToggleRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </div>
      <span className="inline-flex h-7 w-12 items-center rounded-full bg-slate-200 p-1">
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </span>
    </div>
  );
}

function PaymentMethodOption({ title, description, details, icon }: { title: string; description: string; details: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{details}</p>
        </div>
      </div>
      <button type="button" disabled className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-400 shadow-sm">
        Secure setup pending
      </button>
    </div>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10h16" />
      <path d="M6 10v8" />
      <path d="M10 10v8" />
      <path d="M14 10v8" />
      <path d="M18 10v8" />
      <path d="M3 18h18" />
      <path d="M12 4 4 8h16l-8-4Z" />
    </svg>
  );
}

export function AccountSettings({ email, profile, feedbackCode, feedbackTone }: AccountSettingsProps) {
  const displayName = profile?.full_name || "BuildFlow client";
  const phone = profile?.phone || "Not added yet";
  const emailValue = email || profile?.email || "Not available";
  const feedbackText = feedbackCode
    ? feedbackTone === "error"
      ? errorMessages[feedbackCode] || "Account could not be updated."
      : successMessages[feedbackCode] || "Account updated."
    : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_48%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-5">
        <section className="rounded-[32px] border border-sky-100 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Account</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Account & Settings</h1>
              <p className="mt-2 text-sm text-slate-500">Manage your profile, preferences, and secure account actions from one place.</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,#0ea5e9,#2563eb)] text-lg font-semibold text-white shadow-[0_16px_36px_rgba(37,99,235,0.24)]">
              BF
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link href="/projects" className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white">Projects</Link>
            <Link href="/shop" className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white">Shop</Link>
            <Link href="/orders" className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white">Orders</Link>
          </div>
        </section>

        {feedbackText ? (
          <div className={`rounded-[24px] border px-4 py-3 text-sm font-semibold ${feedbackTone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {feedbackText}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Account Profile" description="Your basic account details. Change only the rows that need attention.">
            <div className="space-y-3">
              <FieldRow label="Name" value={displayName} actionLabel="Change">
                <form action={updateAccountName} className="space-y-3">
                  <label htmlFor="fullName" className="text-sm font-semibold text-slate-900">Name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    defaultValue={profile?.full_name || ""}
                    placeholder="Full name"
                    autoComplete="name"
                    className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.18)] transition hover:bg-sky-700">
                    Save name
                  </button>
                </form>
              </FieldRow>

              <FieldRow label="Phone number" value={phone} note="Used for project and delivery coordination." actionLabel="Change">
                <form action={updateAccountPhone} className="space-y-3">
                  <label htmlFor="phone" className="text-sm font-semibold text-slate-900">Phone number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={profile?.phone || ""}
                    placeholder="+1 555 123 4567"
                    autoComplete="tel"
                    className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                  <p className="text-xs leading-5 text-slate-500">Numbers are normalized before saving.</p>
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.18)] transition hover:bg-sky-700">
                    Save phone
                  </button>
                </form>
              </FieldRow>

              <LockedRow label="Login email" value={emailValue} note="This is the email used to sign in. It cannot be changed here." />
              <PendingAddRow label="Alternate email" value="Not added" note="Ready for a second contact email once profile contact storage is connected." actionLabel="Add" />
              <PendingAddRow label="Second phone" value="Not added" note="Ready for a backup phone once profile contact storage is connected." actionLabel="Add" />
            </div>
          </SectionCard>

          <SectionCard title="Addresses" description="Add jobsite, billing, or delivery addresses for faster project setup.">
            <div className="space-y-3">
              <div className="rounded-[22px] border border-dashed border-sky-200 bg-sky-50/50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">No saved addresses yet</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">Addresses will appear here as separate rows for project, billing, and delivery use.</p>
              </div>
              <button type="button" disabled className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-400 shadow-sm">
                Add address
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Security" description="Use the existing password recovery flow safely.">
            <div className="space-y-3">
              <Link href="/reset-password" className="inline-flex w-full items-center justify-center rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.18)] transition hover:bg-sky-700">
                Change password
              </Link>
              <p className="text-xs text-slate-500">Password changes continue through the existing reset-password route.</p>
            </div>
          </SectionCard>

          <SectionCard title="Communication Settings" description="Preference controls only. No sending or automation is active here.">
            <div className="space-y-3">
              <ToggleRow label="Email updates" description="Project and account emails" />
              <ToggleRow label="SMS notifications" description="Shown as a preference only" />
              <ToggleRow label="WhatsApp preferences" description="Visual preference only — no WhatsApp actions here" />
            </div>
          </SectionCard>

          <SectionCard title="Payment Methods / Wallet" description="Choose how this account should set up secure payments.">
            <div className="space-y-3">
              <PaymentMethodOption
                title="Credit card"
                description="Add a card for material orders and approved project charges."
                details="Card entry must happen in a secure provider form. BuildFlow should only save the provider token and last 4 digits."
                icon={<CardIcon />}
              />
              <PaymentMethodOption
                title="ACH bank account"
                description="Add a bank account option for larger orders or account billing."
                details="Bank details must be verified through a provider flow. BuildFlow should not store full account or routing numbers."
                icon={<BankIcon />}
              />
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                Payment setup is visible now, but secure entry is disabled until Stripe SetupIntents or another approved payment provider is connected.
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Purchase History" description="Future orders and requests will appear here.">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-5 text-sm text-slate-600">
              No purchase history yet.
            </div>
          </SectionCard>

          <SectionCard title="Sign Out" description="End this session safely on this device.">
            <AccountSignOutButton />
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
