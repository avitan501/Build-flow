"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ResetState = "loading" | "request" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<ResetState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initializeRecovery() {
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
  }, [supabase]);

  async function handleResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_48%,#ffffff_100%)] px-6 py-10 sm:px-8 sm:py-14">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-[32px] border border-sky-100 bg-white/95 p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-600 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(2,132,199,0.25)]">
              BF
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-sky-700 uppercase">BuildFlow</p>
              <p className="text-sm text-slate-500">Account recovery</p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {isRecoveryMode ? "Set new password" : "Forgot password"}
            </h1>
            <p className="text-sm text-slate-500">
              {isRecoveryMode ? "Choose a new password to finish recovery." : "Enter your email to receive a reset link."}
            </p>
          </div>

          {status === "loading" ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading...</div>
          ) : null}

          {status !== "loading" && !isRecoveryMode ? (
            <form className="mt-8 space-y-4" onSubmit={handleResetRequest}>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  placeholder="name@company.com"
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
                className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.22)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : null}

          {status !== "loading" && isRecoveryMode ? (
            <form className="mt-8 space-y-4" onSubmit={handlePasswordUpdate}>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">New password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  disabled={status !== "ready" || isSubmitting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
                  placeholder="Enter a new password"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Confirm new password</span>
                <input
                  required
                  type="password"
                  minLength={8}
                  disabled={status !== "ready" || isSubmitting}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:opacity-60"
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
                className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.22)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving..." : "Set new password"}
              </button>
            </form>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <Link href="/login" className="font-medium text-sky-700 hover:text-sky-800">
              Back to login
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
