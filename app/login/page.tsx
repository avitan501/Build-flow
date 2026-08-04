"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

function sanitizeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

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
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const callbackError = searchParams.get("error");
  const [form, setForm] = useState<LoginState>(initialState);
  const [mode, setMode] = useState<LoginMode>("email");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("request");
  const [error, setError] = useState<string | null>(callbackError);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectPath = sanitizeNextPath(searchParams.get("next"));

  useEffect(() => {
    let cancelled = false;

    async function redirectIfSignedIn() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled && session) {
        router.replace(redirectPath);
        router.refresh();
      }
    }

    redirectIfSignedIn();

    return () => {
      cancelled = true;
    };
  }, [redirectPath, router, supabase]);

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

      router.replace(redirectPath);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login request failed.");
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

      router.replace(redirectPath);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Phone login request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const next = redirectPath === "/" ? "" : `?next=${encodeURIComponent(redirectPath)}`;
      const redirectTo = `${window.location.origin}/auth/callback${next}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Google sign-in request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_48%,#ffffff_100%)] px-6 py-10 sm:px-8 sm:py-14">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-[32px] border border-sky-100 bg-white/95 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(2,132,199,0.25)]">
              BF
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-sky-700 uppercase">BuildFlow</p>
              <p className="text-sm text-slate-500">Premium project workflow</p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Log in to BuildFlow</h1>
            <p className="text-sm text-slate-500">Use your email or get a one-time code by phone.</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("email");
                setError(null);
                setMessage(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "email" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
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
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "phone" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            >
              Phone
            </button>
          </div>

          {mode === "email" ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  placeholder="name@company.com"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Password</span>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  placeholder="Enter your password"
                />
              </label>

              <p className="text-sm text-slate-500">Your session stays active on this device until it expires or you log out.</p>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}
              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.22)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Logging in..." : "Log in"}
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handlePhoneSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Phone number</span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  placeholder="347 567 5077"
                />
              </label>

              {phoneStep === "verify" ? (
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Code</span>
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={form.otp}
                    onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    placeholder="Enter SMS code"
                  />
                </label>
              ) : null}

              <p className="text-sm text-slate-500">
                {phoneStep === "request" ? "We will send a one-time SMS code to this phone." : "Enter the code from your text message to finish login."}
              </p>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}
              {message ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.22)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
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
                  className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Use a different number
                </button>
              ) : null}
            </form>
          )}

          <div className="mt-4">
            {mode !== "email" && error ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Opening Google..." : "Continue with Google"}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <Link href="/reset-password" className="font-medium text-sky-700 hover:text-sky-800">
              Forgot password?
            </Link>
            <Link href="/signup" className="font-medium text-slate-700 hover:text-slate-950">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
