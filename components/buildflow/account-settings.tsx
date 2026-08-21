import { Bell, KeyRound, LogOut, Mail, UserRound } from "lucide-react";
import Link from "next/link";

import { updateAccountName, updateAccountPhone, updateAlternateContacts, updateNotificationPreferences } from "@/app/account/actions";
import { AccountSignOutButton } from "@/components/buildflow/account-sign-out-button";
import type { ProfileRecord } from "@/lib/auth";

type AccountSettingsProps = {
  email: string | null;
  profile: ProfileRecord | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  notificationEmail: boolean;
  notificationSms: boolean;
  feedbackCode?: string | null;
  feedbackTone?: "success" | "error" | null;
};

const errorMessages: Record<string, string> = {
  name: "Enter a valid name.",
  phone: "Enter a valid phone number.",
  "alternate-email": "Enter a valid alternate email.",
  "alternate-phone": "Enter a valid alternate phone number.",
  contacts: "Contact details could not be saved.",
  profile: "Profile information could not be saved.",
  notifications: "Notification preferences could not be saved.",
};

const successMessages: Record<string, string> = {
  name: "Name saved.",
  phone: "Phone number saved.",
  contacts: "Contact details saved.",
  notifications: "Notification preferences saved.",
};

const inputClass = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0071e3] focus:ring-2 focus:ring-sky-100";
const primaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white transition hover:bg-[#0066cc]";

function SectionCard({ icon: Icon, title, description, children, className = "" }: { icon: typeof UserRound; title: string; description: string; children: React.ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
    <header className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></span>
      <div><h2 className="font-semibold text-slate-950">{title}</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div>
    </header>
    <div className="p-4 sm:p-5">{children}</div>
  </section>;
}

export function AccountSettings({ email, profile, alternateEmail, alternatePhone, notificationEmail, notificationSms, feedbackCode, feedbackTone }: AccountSettingsProps) {
  const feedbackText = feedbackCode
    ? feedbackTone === "error"
      ? errorMessages[feedbackCode] || "Account could not be updated."
      : successMessages[feedbackCode] || "Account updated."
    : null;

  return <main className="min-h-screen bg-[#f5f5f7] px-4 py-7 text-slate-950 sm:px-6 sm:py-10">
    <div className="mx-auto w-full max-w-5xl">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">Personal settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My Account</h1>
        <p className="mt-2 text-sm text-slate-500">Profile, security, and notification preferences.</p>
      </header>

      {feedbackText ? <div role="status" className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${feedbackTone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedbackText}</div> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard icon={UserRound} title="Profile information" description="Your name and primary phone number.">
          <div className="grid gap-5">
            <form action={updateAccountName} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <label htmlFor="fullName" className="grid gap-1.5 text-sm font-semibold">Name<input id="fullName" name="fullName" type="text" defaultValue={profile?.full_name || ""} placeholder="Full name" autoComplete="name" className={inputClass} /></label>
              <button type="submit" className={primaryButtonClass}>Save</button>
            </form>
            <form action={updateAccountPhone} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <label htmlFor="phone" className="grid gap-1.5 text-sm font-semibold">Primary phone<input id="phone" name="phone" type="tel" defaultValue={profile?.phone || ""} placeholder="+1 555 123 4567" autoComplete="tel" className={inputClass} /></label>
              <button type="submit" className={primaryButtonClass}>Save</button>
            </form>
          </div>
        </SectionCard>

        <SectionCard icon={Mail} title="Email & contact" description="Login email and alternate contact details.">
          <div className="border-b border-slate-100 pb-4"><p className="text-xs font-semibold text-slate-500">Login email</p><p className="mt-1 break-words text-sm font-semibold">{email || profile?.email || "Not available"}</p></div>
          <form action={updateAlternateContacts} className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold">Alternate email<input name="alternateEmail" type="email" defaultValue={alternateEmail || ""} placeholder="alternate@example.com" autoComplete="email" className={inputClass} /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Alternate phone<input name="alternatePhone" type="tel" defaultValue={alternatePhone || ""} placeholder="+1 555 123 4567" autoComplete="tel" className={inputClass} /></label>
            <button type="submit" className={primaryButtonClass}>Save contact details</button>
          </form>
        </SectionCard>

        <SectionCard icon={KeyRound} title="Password & security" description="Update your password through the secure recovery flow.">
          <Link href="/reset-password" className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">Change password</Link>
        </SectionCard>

        <SectionCard icon={Bell} title="Notifications" description="Choose how Avantia Build contacts you.">
          <form action={updateNotificationPreferences} className="grid gap-4">
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input name="notificationEmail" type="checkbox" defaultChecked={notificationEmail} className="h-5 w-5 accent-[#0071e3]" />Email notifications</label>
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input name="notificationSms" type="checkbox" defaultChecked={notificationSms} className="h-5 w-5 accent-[#0071e3]" />Text message notifications</label>
            <button type="submit" className={primaryButtonClass}>Save preferences</button>
          </form>
        </SectionCard>

        <SectionCard icon={LogOut} title="Sign out" description="End your session on this device." className="lg:col-span-2">
          <AccountSignOutButton />
        </SectionCard>
      </div>
    </div>
  </main>;
}
