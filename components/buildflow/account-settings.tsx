import { Bell, KeyRound, LogOut, Mail, UserRound } from "lucide-react";

import { setAccountPassword, updateAccountName, updateAccountPhone, updateAlternateContacts, updateNotificationPreferences } from "@/app/account/actions";
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
  password: "Use at least 8 characters for your password.",
  "password-match": "The two passwords do not match.",
  "password-save": "The password could not be saved.",
};

const successMessages: Record<string, string> = {
  name: "Name saved.",
  phone: "Phone number saved.",
  contacts: "Contact details saved.",
  notifications: "Notification preferences saved.",
  password: "Password saved.",
};

const inputClass = "min-h-11 w-full rounded-lg border border-[#071126]/15 bg-white/90 px-3 text-sm text-[#071126] outline-none transition placeholder:text-slate-400 hover:border-[#071126]/25 focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/15";
const primaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#071126] px-4 text-sm font-semibold text-white transition hover:bg-[#1677ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf8]";

function SectionCard({ icon: Icon, title, description, children, className = "" }: { icon: typeof UserRound; title: string; description: string; children: React.ReactNode; className?: string }) {
  return <section className={`overflow-hidden rounded-xl border border-[#071126]/10 bg-[#fffdf8]/95 shadow-[0_16px_45px_rgba(7,17,38,.06)] ${className}`}>
    <header className="flex items-start gap-3 border-b border-[#071126]/8 bg-white/45 px-4 py-3.5 sm:px-5">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#071126] text-white shadow-sm"><Icon className="h-4 w-4" /></span>
      <div><h2 className="font-semibold tracking-[-0.015em] text-[#071126]">{title}</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div>
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

  return <main className="min-h-screen bg-[#f4efe6] bg-[radial-gradient(circle_at_82%_7%,rgba(22,119,255,.08),transparent_24%),linear-gradient(180deg,#f8f4ec_0%,#f1ece2_100%)] px-4 py-6 text-[#071126] sm:px-6 sm:py-9">
    <div className="mx-auto w-full max-w-5xl">
      <header className="rounded-xl border border-white/10 bg-[#071126] px-5 py-5 text-white shadow-[0_22px_60px_rgba(7,17,38,.14)] sm:px-6 sm:py-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#78b7ff]">Personal settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">My Account</h1>
        <p className="mt-2 text-sm text-white/65">Profile, security, and notification preferences.</p>
      </header>

      {feedbackText ? <div role="status" className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm ${feedbackTone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedbackText}</div> : null}

      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <SectionCard icon={UserRound} title="Profile information" description="Your name and primary phone number.">
          <div className="grid gap-4">
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
          <div className="rounded-lg border border-[#071126]/8 bg-white/65 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">Login email</p><p className="mt-1 break-words text-sm font-semibold text-[#071126]">{email || profile?.email || "Not available"}</p></div>
          <form action={updateAlternateContacts} className="mt-3 grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold">Alternate email<input name="alternateEmail" type="email" defaultValue={alternateEmail || ""} placeholder="alternate@example.com" autoComplete="email" className={inputClass} /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Alternate phone<input name="alternatePhone" type="tel" defaultValue={alternatePhone || ""} placeholder="+1 555 123 4567" autoComplete="tel" className={inputClass} /></label>
            <button type="submit" className={primaryButtonClass}>Save contact details</button>
          </form>
        </SectionCard>

        <SectionCard icon={KeyRound} title="Password & security" description="After secure sign-in, you may set a password for later use.">
          <form action={setAccountPassword} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold">New password<input name="password" type="password" minLength={8} required autoComplete="new-password" className={inputClass} /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Confirm password<input name="passwordConfirmation" type="password" minLength={8} required autoComplete="new-password" className={inputClass} /></label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#071126] px-4 text-sm font-semibold text-white transition hover:bg-[#1677ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677ff] focus-visible:ring-offset-2">Save password</button>
          </form>
        </SectionCard>

        <SectionCard icon={Bell} title="Notifications" description="Choose how Avantia Build contacts you.">
          <form action={updateNotificationPreferences} className="grid gap-3">
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#071126]/8 bg-white/65 px-3 text-sm font-semibold"><input name="notificationEmail" type="checkbox" defaultChecked={notificationEmail} className="h-5 w-5 accent-[#1677ff]" />Email notifications</label>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#071126]/8 bg-white/65 px-3 text-sm font-semibold"><input name="notificationSms" type="checkbox" defaultChecked={notificationSms} className="h-5 w-5 accent-[#1677ff]" />Text message notifications</label>
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
