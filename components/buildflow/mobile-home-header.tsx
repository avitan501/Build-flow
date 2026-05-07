import type { ReactNode } from "react";
import Link from "next/link";

type MobileHomeHeaderProps = {
  uploadHref: string;
  aiHref: string;
};

function IconButton({ href, label, disabled, tone, children }: { href: string; label: string; disabled?: boolean; tone: "upload" | "ai"; children: ReactNode }) {
  const toneClass =
    tone === "upload"
      ? "border-white/20 bg-gradient-to-br from-[#5eead4]/25 via-[#38bdf8]/18 to-white/10 text-white shadow-[0_10px_24px_rgba(45,212,191,0.18)]"
      : "border-white/20 bg-gradient-to-br from-[#818cf8]/28 via-[#60a5fa]/18 to-white/10 text-white shadow-[0_10px_24px_rgba(99,102,241,0.18)]";

  return (
    <Link
      href={href}
      aria-label={label}
      aria-disabled={disabled}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border backdrop-blur-md transition duration-150 active:scale-[0.97] ${toneClass} ${
        disabled ? "cursor-default opacity-80" : "hover:brightness-110"
      }`}
    >
      {children}
    </Link>
  );
}

function MiniPill({ label }: { label: string }) {
  return <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-sm">{label}</span>;
}

export function MobileHomeHeader({ uploadHref, aiHref }: MobileHomeHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[#0e2341] px-5 py-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)] sm:px-6 sm:py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.16),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(129,140,248,0.18),_transparent_24%),radial-gradient(circle_at_70%_78%,_rgba(45,212,191,0.14),_transparent_30%)]" />
      <div className="absolute right-4 top-20 h-28 w-28 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-[#34d399]/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">BF</div>
          <div>
            <p className="text-lg font-semibold tracking-tight">BuildFlow</p>
            <p className="text-xs text-slate-300">Construction materials + project flow</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton href={uploadHref} label="Upload plans or photo" tone="upload">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V5" />
              <path d="m7 10 5-5 5 5" />
              <path d="M5 19h14" />
            </svg>
          </IconButton>
          <IconButton href={aiHref} label="Ask BuildFlow AI" disabled tone="ai">
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

      <div className="relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Start here</p>
            <h1 className="mt-2 max-w-md text-2xl font-semibold tracking-tight text-white">Start your project with confidence</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-200">
              Upload plans, organize materials, review quotes, and track orders in one simple workflow.
            </p>
          </div>
          <div className="hidden min-[420px]:flex min-[420px]:flex-col min-[420px]:items-end min-[420px]:gap-2">
            <MiniPill label="Plans → Quote" />
            <MiniPill label="Approval first" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#08172f]/45 p-2 text-center text-[11px] text-slate-200">
          <div className="rounded-2xl bg-white/6 px-2 py-2">
            <p className="font-semibold text-white">Upload</p>
            <p className="mt-1 text-[10px] text-slate-300">Plans & photos</p>
          </div>
          <div className="rounded-2xl bg-white/6 px-2 py-2">
            <p className="font-semibold text-white">Review</p>
            <p className="mt-1 text-[10px] text-slate-300">Materials & quote</p>
          </div>
          <div className="rounded-2xl bg-white/6 px-2 py-2">
            <p className="font-semibold text-white">Approve</p>
            <p className="mt-1 text-[10px] text-slate-300">Only when ready</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/start-project" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.12)] transition active:scale-[0.99] hover:bg-slate-100">
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
