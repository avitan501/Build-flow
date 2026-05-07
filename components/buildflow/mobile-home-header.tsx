import type { ReactNode } from "react";
import Link from "next/link";

type MobileHomeHeaderProps = {
  uploadHref: string;
  aiHref: string;
};

function IconButton({ href, label, disabled, children }: { href: string; label: string; disabled?: boolean; children: ReactNode }) {
  const className = `inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white shadow-sm backdrop-blur transition active:scale-[0.97] ${
    disabled ? "cursor-default opacity-70" : "hover:bg-white/15"
  }`;

  return (
    <Link href={href} aria-label={label} aria-disabled={disabled} className={className}>
      {children}
    </Link>
  );
}

export function MobileHomeHeader({ uploadHref, aiHref }: MobileHomeHeaderProps) {
  return (
    <section className="rounded-[30px] bg-[#0e2341] px-5 py-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-lg font-semibold tracking-tight">BF</div>
          <div>
            <p className="text-lg font-semibold tracking-tight">BuildFlow</p>
            <p className="text-xs text-slate-300">Construction materials + project flow</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton href={uploadHref} label="Upload plans or photo">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V5" />
              <path d="m7 10 5-5 5 5" />
              <path d="M5 19h14" />
            </svg>
          </IconButton>
          <IconButton href={aiHref} label="Ask BuildFlow AI" disabled>
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Start your project with confidence</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-200">
          Upload plans, organize materials, review quotes, and track orders in one simple workflow.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/start-project" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition active:scale-[0.99] hover:bg-slate-100">
            Log in to Start Project
          </Link>
          <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-white/15">
            Create Account
          </Link>
        </div>
      </div>
    </section>
  );
}
