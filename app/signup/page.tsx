"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

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

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            company_name: form.fullName,
            phone: form.phone,
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

      router.push("/");
      router.refresh();
    } catch (signupRequestError) {
      setError(signupRequestError instanceof Error ? signupRequestError.message : "Signup request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
              <p className="text-sm text-slate-500">Premium project workflow</p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create account</h1>
            <p className="text-sm text-slate-500">Phone-only signup is not currently supported by existing auth.</p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
                required
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                placeholder="+1 555 123 4567"
              />
            </label>

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.22)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-400"
            >
              Continue with Google
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">Google sign-in coming soon</p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <Link href="/login" className="font-medium text-sky-700 hover:text-sky-800">
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
