"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type LoginState = {
  email: string;
  password: string;
  phone: string;
  otp: string;
};

const initialState: LoginState = {
  email: "",
  password: "",
  phone: "",
  otp: "",
};

type LoginMode = "email" | "phone";
type PhoneStep = "request" | "verify";

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : "";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<LoginState>(initialState);
  const [mode, setMode] = useState<LoginMode>("email");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("request");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Login request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const phone = normalizePhoneNumber(form.phone);

    if (!phone || phone.length < 8) {
      setError("Enter a valid phone number.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (phoneStep === "request") {
        const response = await fetch("/api/auth/phone/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const result = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          setError(result?.error || "Could not send the SMS code.");
          return;
        }

        setForm((current) => ({ ...current, phone }));
        setPhoneStep("verify");
        setMessage(`Code sent to ${phone}.`);
        return;
      }

      const token = form.otp.trim();

      if (token.length < 4) {
        setError("Enter the code sent to your phone.");
        return;
      }

      const response = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, token }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(result?.error || "Could not verify the SMS code.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Phone login request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <section className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Log in</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            Sign in with your BuildFlow email and password, or get a one-time code by phone.
          </p>

          <div className="mt-6 grid gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">Who this page is for: approved clients and admins.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">Supplier actions stay controlled through approval flows.</div>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              BuildFlow account access
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use your BuildFlow account credentials below.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-slate-900/70 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("email");
                setError(null);
                setMessage(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "email" ? "bg-white text-slate-950" : "text-slate-300"}`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("phone");
                setError(null);
                setMessage(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "phone" ? "bg-white text-slate-950" : "text-slate-300"}`}
            >
              Phone
            </button>
          </div>

          {mode === "email" ? (
            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
                  placeholder="name@company.com"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Password
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
                  placeholder="Enter your password"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
              {message ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Signing in..." : "Log in"}
              </button>
            </form>
          ) : (
            <form className="mt-6 flex flex-col gap-4" onSubmit={handlePhoneSubmit}>
              <label className="flex flex-col gap-2 text-sm text-slate-200">
                Phone number
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
                  placeholder="347 567 5077"
                />
              </label>

              {phoneStep === "verify" ? (
                <label className="flex flex-col gap-2 text-sm text-slate-200">
                  Code
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={form.otp}
                    onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
                    placeholder="Enter SMS code"
                  />
                </label>
              ) : null}

              <p className="text-sm leading-6 text-slate-300">
                {phoneStep === "request" ? "We will send a one-time SMS code to this phone." : "Enter the code from your text message to finish login."}
              </p>

              {error ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
              {message ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Working..." : phoneStep === "request" ? "Send code" : "Verify and log in"}
              </button>

              {phoneStep === "verify" ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhoneStep("request");
                    setForm((current) => ({ ...current, otp: "" }));
                    setError(null);
                    setMessage(null);
                  }}
                  className="rounded-full border border-white/10 bg-slate-900/70 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Use a different number
                </button>
              ) : null}
            </form>
          )}

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
            <Link href="/signup" className="underline underline-offset-4">
              Create an account
            </Link>
            <Link href="/reset-password" className="underline underline-offset-4">
              Reset password
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
