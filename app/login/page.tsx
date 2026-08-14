"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AuthPageShell } from "@/components/buildflow/auth-page-shell";
import { GoogleSignInIcon } from "@/components/buildflow/google-sign-in-icon";
import { normalizePhoneNumber, phoneLoginEmailForPhone } from "@/lib/auth-phone";
import { friendlyAuthError, isGoogleAuthEnabled } from "@/lib/auth-ui";
import { createClient } from "@/lib/supabase/client";
import { authRedirectOrigin } from "@/lib/site-url";
import { useAuthConfig } from "@/lib/use-auth-config";

type LoginState = {
  credential: string;
  password: string;
};

const initialState: LoginState = {
  credential: "",
  password: "",
};

function sanitizeNextPath(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAuthConfig = useAuthConfig();
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
    <AuthPageShell title="Sign in to Avantia Build">
      {hasAuthConfig === false ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800">
          Authentication is temporarily unavailable.
        </div>
      ) : null}

      {googleEnabled ? (
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-[0.95rem] font-semibold text-[#1d1d1f] transition hover:border-[#a1a1a6] hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleSignInIcon className="h-5 w-5 shrink-0" />
          <span>{isSubmitting ? "Opening Google..." : "Continue with Google"}</span>
        </button>
      ) : null}

      {googleEnabled ? (
        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-[#d2d2d7]" />
          <span className="text-xs font-medium text-[#86868b]">or</span>
          <span className="h-px flex-1 bg-[#d2d2d7]" />
        </div>
      ) : null}

      <form ref={markFormReady} className={`${googleEnabled ? "" : "mt-1"} space-y-3`} onSubmit={handleSubmit} data-testid="login-form">
            <label className="block">
              <span className="sr-only">Email or phone number</span>
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
                className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="Email or phone number"
              />
            </label>

            <label className="block">
              <span className="sr-only">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="Password"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-14 w-full rounded-[14px] bg-[#0071e3] px-5 text-base font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <Link href="/reset-password" className="font-medium text-[#0066cc] hover:text-[#004f9e]">
          Forgot password?
        </Link>
        <Link href={`/signup${nextQuery}`} className="font-medium text-[#0066cc] hover:text-[#004f9e]">
          Create account
        </Link>
      </div>
    </AuthPageShell>
  );
}
