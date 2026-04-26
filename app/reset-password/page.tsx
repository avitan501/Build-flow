"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ResetState = "loading" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
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

        if (!session) {
          if (!cancelled) {
            setStatus("error");
            setMessage("Recovery link is invalid or expired.");
          }
          return;
        }

        if (!cancelled) {
          setStatus("ready");
          setMessage(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow Supply
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Set new password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Finish your password recovery by choosing a new password.
          </p>
        </div>

        {status === "loading" ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Loading recovery session...
          </div>
        ) : null}

        {status !== "loading" ? (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              New password
              <input
                required
                type="password"
                minLength={8}
                disabled={status !== "ready" || isSubmitting}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500 disabled:opacity-60"
                placeholder="Enter a new password"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Confirm new password
              <input
                required
                type="password"
                minLength={8}
                disabled={status !== "ready" || isSubmitting}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500 disabled:opacity-60"
                placeholder="Repeat the new password"
              />
            </label>

            {message ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  status === "success"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-100"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={status !== "ready" || isSubmitting}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : "Set new password"}
            </button>
          </form>
        ) : null}

        <Link href="/login" className="text-sm text-slate-300 underline underline-offset-4">
          Back to login
        </Link>
      </section>
    </main>
  );
}
