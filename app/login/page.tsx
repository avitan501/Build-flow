"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type LoginState = {
  email: string;
  password: string;
};

const initialState: LoginState = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<LoginState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <section className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Log in</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            Sign in with your BuildFlow email and password to continue into the approval-first workflow.
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Log in"}
          </button>
        </form>

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
