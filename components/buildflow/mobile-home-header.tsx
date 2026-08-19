import type { ReactNode } from "react";
import Link from "next/link";
import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";

type MobileHomeHeaderProps = {
  uploadHref: string;
  aiHref: string;
};

function ActionButton({ href, label, tone, disabled, children }: { href: string; label: string; tone: "upload" | "ai"; disabled?: boolean; children: ReactNode }) {
  const shellClass =
    tone === "upload"
      ? "border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,244,255,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(148,163,184,0.16)]"
      : "border-white/80 bg-[radial-gradient(circle_at_24%_22%,rgba(244,114,182,0.45),transparent_30%),radial-gradient(circle_at_78%_22%,rgba(96,165,250,0.48),transparent_28%),radial-gradient(circle_at_78%_78%,rgba(52,211,153,0.34),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,244,255,0.9))] shadow-[0_12px_24px_rgba(96,165,250,0.16)]";

  return (
    <Link
      href={href}
      aria-label={label}
      aria-disabled={disabled}
      className={`group inline-flex flex-col items-center gap-1.5 ${disabled ? "cursor-default" : ""}`}
    >
      <span className={`relative flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-full border p-[1.25px] text-slate-800 transition duration-200 ease-out active:translate-y-[1px] active:scale-[0.95] ${shellClass}`}>
        <span className="absolute inset-[2px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.06))]" />
        <span className="relative flex h-full w-full items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          {children}
        </span>
      </span>
      <span className="text-[10px] font-medium tracking-[-0.01em] text-slate-700">{label}</span>
    </Link>
  );
}

export function MobileHomeHeader({ uploadHref, aiHref }: MobileHomeHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-sky-100/90 bg-[linear-gradient(180deg,#fafdff_0%,#eef6ff_46%,#f7fbff_100%)] px-4 py-4 text-slate-900 shadow-[0_24px_60px_rgba(148,163,184,0.16)] sm:px-6 sm:py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.3),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(191,219,254,0.26),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="absolute right-0 top-10 h-28 w-28 rounded-full bg-sky-100/70 blur-3xl" />
      <div className="absolute left-0 bottom-0 h-24 w-24 rounded-full bg-blue-50 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AvantiaBuildLockup compact homepageHeader />
        </div>

        <div className="flex items-start gap-2.5">
          <ActionButton href={uploadHref} label="Upload" tone="upload">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 16V5" />
              <path d="m7 10 5-5 5 5" />
              <path d="M5 19h14" />
            </svg>
          </ActionButton>
          <ActionButton href={aiHref} label="AI" tone="ai" disabled>
            <div className="relative flex items-center text-slate-900">
              <span className="text-[1.15rem] font-semibold tracking-[-0.04em]">AI</span>
              <span className="absolute -right-1.5 -top-1 text-[0.65rem] text-fuchsia-500">✦</span>
            </div>
          </ActionButton>
        </div>
      </div>

      <div className="relative mt-4 rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(239,246,255,0.7))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-sm sm:mt-5 sm:px-5 sm:py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700/75">Start here</p>
        <h1 className="mt-2 max-w-[14rem] text-[2rem] font-semibold leading-[0.98] tracking-tight text-slate-950 sm:max-w-md sm:text-[2.3rem]">
          Start your project with confidence
        </h1>
        <p className="mt-2.5 max-w-[16rem] text-sm leading-6 text-slate-600 sm:max-w-md">
          Upload plans, organize materials, review quotes, and approve orders in one clean workflow.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/start-project" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_32px_rgba(220,168,69,0.24)] transition active:scale-[0.99]">
            Log in to Start Project
          </Link>
          <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.94))] px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_rgba(148,163,184,0.12)] transition active:scale-[0.99]">
            Create Account
          </Link>
        </div>
      </div>
    </section>
  );
}
