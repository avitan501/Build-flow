import type { ReactNode } from "react";
import Link from "next/link";

type MobileHomeHeaderProps = {
  accountHref: string;
};

function IconButton({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const className = "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur transition hover:bg-white/15";

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

export function MobileHomeHeader({ accountHref }: MobileHomeHeaderProps) {
  return (
    <section className="rounded-[30px] bg-[#0e2341] px-5 py-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-lg font-semibold tracking-tight">BF</div>
            <div>
              <p className="text-lg font-semibold tracking-tight">BuildFlow</p>
              <p className="text-xs text-slate-300">Construction materials + project flow</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton href="/upload" label="Upload plans or photo">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V5" />
              <path d="m7 10 5-5 5 5" />
              <path d="M5 19h14" />
            </svg>
          </IconButton>
          <IconButton href="/ai" label="Ask BuildFlow AI">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v3" />
              <path d="M12 18v3" />
              <path d="M4.93 4.93l2.12 2.12" />
              <path d="M16.95 16.95l2.12 2.12" />
              <path d="M3 12h3" />
              <path d="M18 12h3" />
              <path d="M4.93 19.07l2.12-2.12" />
              <path d="M16.95 7.05l2.12-2.12" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </IconButton>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] bg-white/8 p-4 backdrop-blur-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Start here</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">A clean mobile home for projects, plans, materials, quotes, and orders</h1>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          Log in first, then move through your BuildFlow project journey with one clear next step at a time.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
            Log in to Start Project
          </Link>
          <Link href="/signup" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
            Create Account
          </Link>
          <Link href={accountHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-transparent px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
            {accountHref === "/dashboard" ? "Open Dashboard" : "Client Account"}
          </Link>
        </div>
      </div>
    </section>
  );
}
