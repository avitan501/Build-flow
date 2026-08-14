"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { GoogleSignInIcon } from "@/components/buildflow/google-sign-in-icon";
import { normalizePhoneNumber, phoneLoginEmailForPhone } from "@/lib/auth-phone";
import { friendlyAuthError, isGoogleAuthEnabled } from "@/lib/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { authRedirectOrigin } from "@/lib/site-url";

type LoginState = {
  credential: string;
  password: string;
};

const initialState: LoginState = {
  credential: "",
  password: "",
};

type AuthConfigState = boolean | null;

function sanitizeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function subscribeToAuthConfig() {
  return () => undefined;
}

function getBrowserAuthConfig(): AuthConfigState {
  return hasSupabasePublicEnv();
}

function getServerAuthConfig(): AuthConfigState {
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAuthConfig = useSyncExternalStore(subscribeToAuthConfig, getBrowserAuthConfig, getServerAuthConfig);
  const supabase = useMemo(() => (hasAuthConfig ? createClient() : null), [hasAuthConfig]);
  const callbackError = searchParams.get("error");
  const [form, setForm] = useState<LoginState>(initialState);
  const [error, setError] = useState<string | null>(callbackError ? friendlyAuthError(callbackError) : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const redirectPath = sanitizeNextPath(searchParams.get("next"));
  const nextQuery = redirectPath === "/" ? "" : `?next=${encodeURIComponent(redirectPath)}`;

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
    setIsSubmitting(true);

    if (!supabase) {
      setError("Login is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      setIsSubmitting(false);
      return;
    }

    try {
      const enteredCredential = form.credential.trim()
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

  async function handleGoogleSignIn() {
    setError(null);
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_48%,#ffffff_100%)] px-5 py-6 sm:px-8 sm:py-10">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-7">
          <div className="flex items-center gap-3">
            <AvantiaBuildLockup />
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-slate-950">Log in</h1>

          {hasAuthConfig === false ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800">
              Auth is not connected on this preview yet. The page is visible, but login needs the public Supabase URL and anon key.
            </div>
          ) : null}

          {googleEnabled ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <GoogleSignInIcon className="h-5 w-5 shrink-0" />
              <span>{isSubmitting ? "Opening Google..." : "Continue with Google"}</span>
            </button>
          ) : null}

          {googleEnabled ? (
            <div className="my-4 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          ) : null}

          <form ref={markFormReady} className={`${googleEnabled ? "" : "mt-5"} space-y-3`} onSubmit={handleSubmit} data-testid="login-form">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">Email or phone number</span>
              <input
                required
                type="text"
                inputMode="text"
                autoComplete="username"
                value={form.credential}
                onChange={(event) => {
                  setError(null)
                  setForm((current) => ({ ...current, credential: event.target.value }))
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                placeholder="Email or phone number"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                placeholder="Password"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.22)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-4 text-sm">
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
