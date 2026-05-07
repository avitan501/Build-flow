import type { ReactNode } from "react";
import Link from "next/link";

type MobileHomeHeaderProps = {
  uploadHref: string;
  aiHref: string;
};

function IconButton({ href, label, disabled, tone, children }: { href: string; label: string; disabled?: boolean; tone: "upload" | "ai"; children: ReactNode }) {
  const toneClass =
    tone === "upload"
      ? "border-white/16 bg-[linear-gradient(145deg,rgba(94,234,212,0.24),rgba(56,189,248,0.18),rgba(255,255,255,0.08))] text-white shadow-[0_12px_30px_rgba(34,211,238,0.14)]"
      : "border-fuchsia-200/30 bg-[linear-gradient(145deg,rgba(192,132,252,0.38),rgba(96,165,250,0.28),rgba(244,114,182,0.2))] text-white shadow-[0_14px_34px_rgba(168,85,247,0.26)] ring-1 ring-white/12";

  return (
    <Link
      href={href}
      aria-label={label}
      aria-disabled={disabled}
      className={`relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border backdrop-blur-md transition duration-150 active:scale-[0.97] ${toneClass} ${
        disabled ? "cursor-default opacity-90" : "hover:brightness-110"
      }`}
    >
      {tone === "ai" ? <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.28),transparent_34%),radial-gradient(circle_at_72%_78%,rgba(255,255,255,0.18),transparent_28%)]" /> : null}
      <span className="relative">{children}</span>
    </Link>
  );
}

function MiniPill({ label }: { label: string }) {
  return <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">{label}</span>;
}

function BlueprintVisual() {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.05))] shadow-[0_16px_34px_rgba(8,23,47,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-40 sm:w-44 sm:shrink-0">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:18px_18px] opacity-40" />
      <div className="absolute left-4 top-4 right-4 bottom-4 rounded-[22px] border border-sky-200/25" />
      <div className="absolute left-6 top-7 h-11 w-16 rounded-xl border border-white/28" />
      <div className="absolute right-6 top-8 h-7 w-12 rounded-lg border border-white/22" />
      <div className="absolute left-7 bottom-8 h-12 w-24 rounded-2xl border border-white/24" />
      <div className="absolute right-7 bottom-7 flex h-13 w-13 items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,rgba(94,234,212,0.24),rgba(59,130,246,0.22))] text-white shadow-[0_12px_28px_rgba(45,212,191,0.18)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19h16" />
          <path d="M7 19v-6h10v6" />
          <path d="m6 10 6-4 6 4" />
        </svg>
      </div>
      <div className="absolute left-1/2 top-[52%] h-px w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-200/70 to-transparent" />
      <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-medium text-slate-200">Plans</div>
      <div className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-medium text-slate-200">Approve</div>
    </div>
  );
}

export function MobileHomeHeader({ uploadHref, aiHref }: MobileHomeHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(155deg,#0b1f3b_0%,#102b4b_42%,#17355c_100%)] px-5 py-5 text-white shadow-[0_26px_70px_rgba(15,23,42,0.28)] sm:px-6 sm:py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.18),_transparent_28%),radial-gradient(circle_at_86%_16%,_rgba(196,181,253,0.18),_transparent_22%),radial-gradient(circle_at_70%_78%,_rgba(45,212,191,0.16),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute right-2 top-14 h-32 w-32 rounded-full bg-[#60a5fa]/12 blur-3xl" />
      <div className="absolute right-16 top-8 h-12 w-12 rounded-full bg-fuchsia-400/12 blur-2xl" />
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
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5l1.65 4.41 4.72.34-3.68 2.98 1.18 4.58L12 12.25 8.13 14.8l1.18-4.58-3.68-2.98 4.72-.34L12 2.5Z" />
            </svg>
          </IconButton>
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.07))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_18px_40px_rgba(8,23,47,0.16)] backdrop-blur-md sm:p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <div className="absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md sm:pr-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Start here</p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-[1.04] tracking-tight text-white">Start your project with confidence</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Upload plans, organize materials, review quotes, and track orders in one simple workflow.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MiniPill label="Plans → Quote" />
              <MiniPill label="Approval first" />
              <MiniPill label="Client-ready flow" />
            </div>
          </div>
          <BlueprintVisual />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[22px] bg-[linear-gradient(180deg,rgba(8,23,47,0.52),rgba(8,23,47,0.34))] p-2 text-center text-[11px] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] px-2 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="font-semibold text-white">Upload</p>
            <p className="mt-1 text-[10px] text-slate-300">Plans & photos</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] px-2 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="font-semibold text-white">Review</p>
            <p className="mt-1 text-[10px] text-slate-300">Materials & quote</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] px-2 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="font-semibold text-white">Approve</p>
            <p className="mt-1 text-[10px] text-slate-300">Only when ready</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/start-project" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_28px_rgba(255,255,255,0.14)] transition active:scale-[0.99] hover:bg-slate-100">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="4" /><path d="M10 6v8" /><path d="M7 9.5 10 6l3 3.5" /></svg>
            <span>Log in to Start Project</span>
          </Link>
          <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-white/15">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4v12" /><path d="M4 10h12" /></svg>
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
