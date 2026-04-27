"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type FormState = {
  fullName: string;
  companyName: string;
  phone: string;
  email: string;
  password: string;
};

const initialState: FormState = {
  fullName: "",
  companyName: "",
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
            company_name: form.companyName,
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

      try {
        const profileResponse = await fetch("/api/auth/create-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: data.user.id,
            fullName: form.fullName,
            companyName: form.companyName,
            phone: form.phone,
          }),
        });

        if (!profileResponse.ok) {
          const responseText = await profileResponse.text();
          let message = "Account created, but profile setup failed.";

          try {
            const payload = JSON.parse(responseText) as { error?: string };
            if (payload.error) {
              message = payload.error;
            }
          } catch {
            if (responseText.trim()) {
              message = responseText.trim();
            }
          }

          setError(message);
          return;
        }
      } catch (profileRequestError) {
        setError(
          profileRequestError instanceof Error
            ? profileRequestError.message
            : "Profile setup request failed.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (signupRequestError) {
      setError(
        signupRequestError instanceof Error
          ? signupRequestError.message
          : "Signup request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:px-10">
      <section className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            BuildFlow Supply
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Create account</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
            New accounts start as pending until Admin review is complete. This keeps supplier actions and future messaging safe.
          </p>

          <div className="mt-6 grid gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">Client and admin roles stay separated.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">Approval status appears clearly after signup.</div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">No live ordering or sending is unlocked automatically.</div>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Account setup
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Create your BuildFlow access</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Fill in the core details below. Your dashboard opens after account and profile setup finish.
            </p>
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Full name
            <input
              required
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
              placeholder="John Builder"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Company name
            <input
              required
              value={form.companyName}
              onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
              placeholder="BuildFlow Projects LLC"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Phone
            <input
              required
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
              placeholder="+1 555 123 4567"
            />
          </label>

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
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
              placeholder="Create a password"
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
            <Link href="/login" className="underline underline-offset-4">
              Go to login
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
