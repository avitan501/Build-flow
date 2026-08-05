"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { normalizePhoneNumber, phoneLoginEmailForPhone } from "@/lib/auth-phone";
import { friendlyAuthError, isGoogleAuthEnabled } from "@/lib/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
};

type SignupMode = "email" | "phone";

function sanitizeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAuthConfig = hasSupabasePublicEnv();
  const supabase = useMemo(() => (hasAuthConfig ? createClient() : null), [hasAuthConfig]);
  const [form, setForm] = useState<FormState>(initialState);
  const [mode, setMode] = useState<SignupMode>(searchParams.get("mode") === "phone" ? "phone" : "email");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const redirectPath = sanitizeNextPath(searchParams.get("next"));
  const nextQuery = redirectPath === "/" ? "" : `?next=${encodeURIComponent(redirectPath)}`;

  useEffect(() => {
    if (!supabase) return;
    void isGoogleAuthEnabled().then(setGoogleEnabled);
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    if (!supabase) {
      setError("Signup is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      setIsSubmitting(false);
      return;
    }

    try {
      const phone = normalizePhoneNumber(form.phone);
      const email = mode === "phone" ? phoneLoginEmailForPhone(phone) : form.email.trim();

      if (!email) {
        setError(mode === "phone" ? "Enter a valid phone number." : "Enter a valid email.");
        return;
      }

      if (mode === "phone") {
        const response = await fetch("/api/auth/phone-password/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.fullName,
            phone,
            password: form.password,
          }),
        });
        const result = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          setError(result?.error || "Phone account creation failed.");
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });

        if (signInError) {
          setMessage("Phone login created. Go back to login and sign in with your phone number.");
          return;
        }

        router.push(redirectPath);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            company_name: form.fullName,
            phone,
            login_type: mode,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user?.id) {
        setError("Signup succeeded but no auth user was returned.");
        return;
      }

      const profileResponse = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.user.id,
          email,
          fullName: form.fullName,
          companyName: form.fullName,
          phone,
        }),
      });
      const profileResult = (await profileResponse.json().catch(() => null)) as { error?: string } | null;

      if (!profileResponse.ok) {
        setError(profileResult?.error || "Account was created, but profile setup failed.");
        return;
      }

      if (data.session) {
        router.push(redirectPath);
        router.refresh();
        return;
      }

      setMessage("Account created. Check your email if Supabase asks you to confirm it, then log in.");
    } catch (signupRequestError) {
      setError(signupRequestError instanceof Error ? signupRequestError.message : "Signup request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    if (!supabase) {
      setError("Google sign-in is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      setIsSubmitting(false);
      return;
    }

    try {
      const next = redirectPath === "/" ? "" : `?next=${encodeURIComponent(redirectPath)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${next}`,
        },
      });

      if (oauthError) {
        setError(friendlyAuthError(oauthError.message));
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
            <AvantiaBuildLockup showSlogan />
          </div>

          <div className="mt-8 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create account</h1>
            <p className="text-sm text-slate-500">Create an email account or a free phone-number password login.</p>
          </div>

          {!hasAuthConfig ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800">
              Auth is not connected on this preview yet. The page is visible, but signup needs the public Supabase URL and anon key.
            </div>
          ) : null}

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

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Name</span>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                placeholder="John Builder"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Phone number</span>
              <input
                required={mode === "phone"}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                placeholder="347 567 5077"
              />
            </label>

            {mode === "email" ? (
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
            ) : null}

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Password</span>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                placeholder="Create a password"
              />
            </label>

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
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {googleEnabled ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Opening Google..." : "Continue with Google"}
            </button>
          </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <Link href={`/login${nextQuery}`} className="font-medium text-sky-700 hover:text-sky-800">
              Back to login
            </Link>
            <Link href="/reset-password" className="font-medium text-slate-700 hover:text-slate-950">
              Forgot password?
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
