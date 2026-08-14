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
  const hasAuthConfig = useAuthConfig();
  const supabase = useMemo(() => (hasAuthConfig ? createClient() : null), [hasAuthConfig]);
  const [form, setForm] = useState<FormState>(initialState);
  const [mode, setMode] = useState<SignupMode>(searchParams.get("mode") === "phone" ? "phone" : "email");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const redirectPath = sanitizeNextPath(searchParams.get("next"));
  const nextQuery = redirectPath === "/" ? "" : `?next=${encodeURIComponent(redirectPath)}`;

  const markFormReady = useCallback((formElement: HTMLFormElement | null) => {
    if (formElement) formElement.dataset.hydrated = "true";
  }, []);

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
          redirectTo: `${authRedirectOrigin()}/auth/callback${next}`,
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
    <AuthPageShell title="Create your account">
      {hasAuthConfig === false ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800">
          Authentication is temporarily unavailable.
        </div>
      ) : null}

          <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#f5f5f7] p-1">
            <button
              type="button"
              onClick={() => {
                setMode("email");
                setError(null);
                setMessage(null);
              }}
              className={`min-h-11 rounded-[11px] px-4 text-sm font-semibold transition ${mode === "email" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"}`}
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
              className={`min-h-11 rounded-[11px] px-4 text-sm font-semibold transition ${mode === "phone" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"}`}
            >
              Phone
            </button>
          </div>

          <form ref={markFormReady} className="mt-5 space-y-3" onSubmit={handleSubmit} data-testid="signup-form">
            <label className="block">
              <span className="sr-only">Name</span>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="Full name"
              />
            </label>

            <label className="block">
              <span className="sr-only">Phone number</span>
              <input
                required={mode === "phone"}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="Phone number"
              />
            </label>

            {mode === "email" ? (
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  placeholder="Email address"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="sr-only">Password</span>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
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
              className="min-h-14 w-full rounded-[14px] bg-[#0071e3] px-5 text-base font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {googleEnabled ? (
          <div className="mt-5 border-t border-[#d2d2d7] pt-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[14px] border border-[#d2d2d7] bg-white px-5 text-base font-semibold text-[#1d1d1f] transition hover:border-[#a1a1a6] hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleSignInIcon className="h-6 w-6 shrink-0" />
              <span>{isSubmitting ? "Opening Google..." : "Continue with Google"}</span>
            </button>
          </div>
          ) : null}

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <Link href={`/login${nextQuery}`} className="font-medium text-[#0066cc] hover:text-[#004f9e]">
              Sign in
            </Link>
            <Link href="/reset-password" className="font-medium text-[#0066cc] hover:text-[#004f9e]">
              Forgot password?
            </Link>
          </div>
    </AuthPageShell>
  );
}
