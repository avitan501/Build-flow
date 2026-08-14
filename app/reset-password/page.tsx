"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AuthPageShell } from "@/components/buildflow/auth-page-shell";
import { createClient } from "@/lib/supabase/client";
import { authRedirectOrigin } from "@/lib/site-url";
import { useAuthConfig } from "@/lib/use-auth-config";

type ResetState = "loading" | "request" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const hasAuthConfig = useAuthConfig();
  const supabase = useMemo(() => (hasAuthConfig ? createClient() : null), [hasAuthConfig]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<ResetState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initializeRecovery() {
      if (hasAuthConfig === null) return;

      if (!supabase) {
        if (!cancelled) {
          setStatus("request");
          setMessage("Password reset is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
        }
        return;
      }

      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const type = params.get("type");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (type === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            if (!cancelled) {
              setStatus("error");
              setMessage(error.message);
            }
            return;
          }

          window.history.replaceState({}, document.title, "/reset-password");

          if (!cancelled) {
            setStatus("ready");
            setMessage(null);
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled) {
          if (session) {
            setStatus("ready");
            setMessage(null);
          } else {
            setStatus("request");
            setMessage(null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Failed to load recovery session.");
        }
      }
    }

    initializeRecovery();

    return () => {
      cancelled = true;
    };
  }, [hasAuthConfig, supabase]);

  async function handleResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!supabase) {
      setStatus("error");
      setMessage("Password reset is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${authRedirectOrigin()}/reset-password`,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("success");
      setMessage("Password reset link sent. Check your email to continue.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to send reset link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    if (!supabase) {
      setStatus("error");
      setMessage("Password reset is not connected on this preview yet. Add the public Supabase URL and anon key to enable authentication.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
        setStatus("error");
        return;
      }

      await supabase.auth.signOut();
      setStatus("success");
      setMessage("Password updated. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1200);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRecoveryMode = status === "ready" || (status === "success" && message?.includes("Redirecting"));

  return (
    <AuthPageShell title={isRecoveryMode ? "Set a new password" : "Reset your password"}>
          <p className="mb-6 text-center text-sm text-[#6e6e73]">
            {isRecoveryMode ? "Choose a new password." : "Enter your email to receive a reset link."}
          </p>

          {status === "loading" ? (
            <div className="rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-3 text-sm text-[#6e6e73]">Loading...</div>
          ) : null}

          {status !== "loading" && !isRecoveryMode ? (
            <form className="space-y-3" onSubmit={handleResetRequest}>
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  placeholder="Email address"
                />
              </label>

              {message ? (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    status === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-14 w-full rounded-[14px] bg-[#0071e3] px-5 text-base font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : null}

          {status !== "loading" && isRecoveryMode ? (
            <form className="space-y-3" onSubmit={handlePasswordUpdate}>
              <label className="block">
                <span className="sr-only">New password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  disabled={status !== "ready" || isSubmitting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 disabled:opacity-60"
                  placeholder="Enter a new password"
                />
              </label>

              <label className="block">
                <span className="sr-only">Confirm new password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  disabled={status !== "ready" || isSubmitting}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="min-h-14 w-full rounded-[14px] border border-[#d2d2d7] bg-white px-4 text-base text-[#1d1d1f] outline-none transition placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 disabled:opacity-60"
                  placeholder="Repeat the new password"
                />
              </label>

              {message ? (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    status === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={status !== "ready" || isSubmitting}
                className="min-h-14 w-full rounded-[14px] bg-[#0071e3] px-5 text-base font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Set new password"}
              </button>
            </form>
          ) : null}

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <Link href="/login" className="font-medium text-[#0066cc] hover:text-[#004f9e]">
              Sign in
            </Link>
            <Link href="/signup" className="font-medium text-[#0066cc] hover:text-[#004f9e]">
              Create account
            </Link>
          </div>
    </AuthPageShell>
  );
}
