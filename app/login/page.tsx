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
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white sm:px-10">
      <section className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow Supply
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Log in</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Sign in with your BuildFlow email and password.
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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

        <Link href="/signup" className="text-sm text-slate-300 underline underline-offset-4">
          Create an account
        </Link>
      </section>
    </main>
  );
}
