"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { normalizePhoneNumber, phoneLoginEmailForPhone } from "@/lib/auth-phone";
import { friendlyAuthError, isGoogleAuthEnabled } from "@/lib/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseBuildEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";
import { authRedirectOrigin } from "@/lib/site-url";

type LoginState = {
  email: string;
  password: string;
  phone: string;
  phonePassword: string;
};

const initialState: LoginState = {
  email: "",
  password: "",
  phone: "",
  phonePassword: "",
};

type LoginMode = "email" | "phone";

function sanitizeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function subscribeToAuthConfig() {
  return () => undefined;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAuthConfig = useSyncExternalStore(subscribeToAuthConfig, hasSupabasePublicEnv, hasSupabaseBuildEnv);
  const supabase = useMemo(() => (hasAuthConfig ? createClient() : null), [hasAuthConfig]);
  const callbackError = searchParams.get("error");
  const [form, setForm] = useState<LoginState>(initialState);
  const [mode, setMode] = useState<LoginMode>("email");
  const [error, setError] = useState<string | null>(callbackError ? friendlyAuthError(callbackError) : null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const redirectPath = sanitizeNextPath(searchParams.get("next"));
  const nextQuery = redirectPath === "/" ? "" : `?next=${encodeURIComponent(redirectPath)}`;
  const phoneSignupQuery = redirectPath === "/" ? "?mode=phone" : `?mode=phone&next=${encodeURIComponent(redirectPath)}`;

  useEffect(() => {
    let cancelled = false;

    async function redirectIfSignedIn() {
      if (!supabase) {
        return;
      }

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

  const markFormReady = useCallback((formElement: HTMLFormElement | null) => {
    if (formElement) formElement.dataset.hydrated = "true"
  }, [])

  useEffect(() => {
    if (!supabase) return
    void isGoogleAuthEnabled().then(setGoogleEnabled)
  }, [supabase])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    if (!supabase) {
      setError("Login is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      setIsSubmitting(false);
      return;
    }

    try {
      const enteredCredential = form.email.trim()
      const enteredPhone = normalizePhoneNumber(enteredCredential)
      const phoneEmail = !enteredCredential.includes("@") && enteredPhone.length >= 8
        ? phoneLoginEmailForPhone(enteredPhone)
        : null

      if (!enteredCredential.includes("@") && !phoneEmail) {
        setError("Enter a valid email address or phone number.")
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail || enteredCredential,
        password: form.password,
      });

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
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

  async function handleMagicLink() {
    setError(null);
    setMessage(null);

    const email = form.email.trim();

    if (!email) {
      setError("Enter your email first.");
      return;
    }

    if (!supabase) {
      setError("Login is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      return;
    }

    setIsSubmitting(true);

    try {
      const next = redirectPath === "/" ? "" : `?next=${encodeURIComponent(redirectPath)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${authRedirectOrigin()}/auth/callback${next}`,
        },
      });

      if (otpError) {
        setError(friendlyAuthError(otpError.message));
        return;
      }

      setMessage("Login link sent. Check your email to continue.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the login link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    if (!supabase) {
      setError("Login is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      setIsSubmitting(false);
      return;
    }

    const phone = normalizePhoneNumber(form.phone);
    const email = phoneLoginEmailForPhone(phone);

    if (!phone || !email || phone.length < 8) {
      setError("Enter a valid phone number.");
      setIsSubmitting(false);
      return;
    }

    if (!form.phonePassword) {
      setError("Enter your password.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.phonePassword,
      });

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        return;
      }

      router.replace(redirectPath);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Phone password login failed.");
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
      const redirectTo = `${authRedirectOrigin()}/auth/callback${next}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
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
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Log in to Avantia Build</h1>
            <p className="text-sm text-slate-500">Use your email or phone number with a password.</p>
          </div>

          {!hasAuthConfig ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800">
              Auth is not connected on this preview yet. The page is visible, but login needs the public Supabase URL and anon key.
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

          {mode === "email" ? (
            <form ref={markFormReady} className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="login-form">
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Email</span>
                <input
                  required
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={(event) => {
                    setError(null)
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  placeholder="Email or phone number"
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

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={isSubmitting}
                className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Sending..." : "Email me a login link"}
              </button>
            </form>
          ) : (
            <form ref={markFormReady} className="mt-6 space-y-4" onSubmit={handlePhoneSubmit} data-testid="login-form">
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

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Password</span>
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={form.phonePassword}
                  onChange={(event) => setForm((current) => ({ ...current, phonePassword: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  placeholder="Enter your password"
                />
              </label>

              <p className="text-sm text-slate-500">No SMS provider needed. This uses your phone number and password.</p>

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
                {isSubmitting ? "Logging in..." : "Log in with phone"}
              </button>

              <Link href={`/signup${phoneSignupQuery}`} className="block text-center text-sm font-medium text-sky-700 hover:text-sky-800">
                Create a phone login
              </Link>
            </form>
          )}

          {googleEnabled ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Opening Gmail..." : "Continue with Gmail"}
            </button>
          </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <Link href="/reset-password" className="font-medium text-sky-700 hover:text-sky-800">
              Forgot password?
            </Link>
            <Link href={`/signup${nextQuery}`} className="font-medium text-slate-700 hover:text-slate-950">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
