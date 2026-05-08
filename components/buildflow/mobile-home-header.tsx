import type { ReactNode } from "react";
import Link from "next/link";

type MobileHomeHeaderProps = {
  uploadHref: string;
  aiHref: string;
};

function ActionOrb({ href, label, tone, children, disabled }: { href: string; label: string; tone: "upload" | "ai"; children: ReactNode; disabled?: boolean }) {
  const shellClass =
    tone === "upload"
      ? "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(228,240,252,0.8))] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_16px_28px_rgba(148,163,184,0.2)]"
      : "border-white/50 bg-[radial-gradient(circle_at_28%_22%,rgba(244,114,182,0.9),transparent_32%),radial-gradient(circle_at_78%_20%,rgba(96,165,250,0.92),transparent_28%),radial-gradient(circle_at_78%_78%,rgba(52,211,153,0.82),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.68),rgba(219,234,254,0.34))] shadow-[0_16px_30px_rgba(96,165,250,0.2)]";

  return (
    <Link
      href={href}
      aria-label={label}
      aria-disabled={disabled}
      className={`group inline-flex flex-col items-center gap-1.5 text-slate-900 ${disabled ? "cursor-default" : ""}`}
    >
      <span className={`relative flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full border p-[1.25px] transition duration-200 ease-out active:scale-[0.94] active:translate-y-[1px] ${shellClass}`}>
        <span className="absolute inset-[2px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.04))]" />
        <span className={`relative flex h-full w-full items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-8px_16px_rgba(148,163,184,0.08)] ${tone === "upload" ? "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] text-slate-700" : "border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.78))] text-slate-900"}`}>
          {children}
        </span>
      </span>
      <span className="text-[10px] font-medium tracking-[-0.01em] text-slate-700">{label}</span>
    </Link>
  );
}

export function MobileHomeHeader({ uploadHref, aiHref }: MobileHomeHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-sky-100/90 bg-[linear-gradient(180deg,#eef7ff_0%,#dcecff_45%,#f8fbff_100%)] text-slate-900 shadow-[0_30px_80px_rgba(148,163,184,0.22)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.38),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(191,219,254,0.34),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.4),transparent)]" />
      <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(90deg,rgba(239,247,255,0.98)_0%,rgba(232,242,255,0.94)_38%,rgba(219,234,254,0.62)_58%,rgba(255,255,255,0.28)_100%)]" />
      <div
        className="absolute inset-y-0 right-0 w-[58%] bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://source.unsplash.com/featured/1200x900/?building-materials,lumber-yard,warehouse')",
        }}
      />
      <div className="absolute inset-y-0 right-0 w-[58%] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(148,163,184,0.14))]" />
      <div className="absolute left-0 top-[4.75rem] h-[14.5rem] w-[62%] bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.7),rgba(219,234,254,0.22)_72%,transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(226,238,252,0.7))]" />

      <div className="relative px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e4b85f]/25 bg-[linear-gradient(180deg,rgba(228,184,95,0.22),rgba(228,184,95,0.08))] text-[#f4d184] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 4h8l4 4v12H7z" />
                <path d="M11 4 7 8l4 4" />
              </svg>
            </div>
            <div>
              <p className="text-[1.75rem] font-semibold tracking-tight text-slate-900">Build<span className="text-sky-600">Flow</span></p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ActionOrb href={uploadHref} label="Upload" tone="upload">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 16V5" />
                <path d="m7 10 5-5 5 5" />
                <path d="M5 19h14" />
              </svg>
            </ActionOrb>
            <ActionOrb href={aiHref} label="AI Assistant" tone="ai" disabled>
              <div className="relative flex items-center text-slate-900">
                <span className="text-[1.35rem] font-semibold tracking-[-0.04em]">AI</span>
                <span className="absolute -right-2 -top-1.5 text-[0.7rem]">✦</span>
              </div>
            </ActionOrb>
          </div>
        </div>

        <div className="relative mt-5 max-w-[52%] rounded-[26px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(239,246,255,0.56))] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur-[4px] sm:mt-6 sm:px-4 sm:py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700/80">Residential project flow</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-[2.35rem]">
            Build with clarity from the first plan
          </h1>
          <p className="mt-2.5 max-w-[14rem] text-[0.92rem] leading-6 text-slate-600">
            One clean place to upload, review, and approve your home project.
          </p>

          <div className="mt-4 space-y-3">
            <Link href="/start-project" className="inline-flex min-h-14 w-full max-w-[17rem] items-center justify-between gap-3 rounded-[18px] border border-[#e8c26b]/30 bg-[linear-gradient(180deg,#f1ca70_0%,#dca945_100%)] px-4 py-3 text-base font-semibold text-slate-950 shadow-[0_16px_40px_rgba(228,184,95,0.26)] transition active:scale-[0.98]">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/12">
                  <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="4" /><path d="M10 7v6" /><path d="M8 9.5 10 7l2 2.5" /></svg>
                </span>
                <span>Log in to Start Project</span>
              </span>
              <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h12" /><path d="m10 4 6 6-6 6" /></svg>
            </Link>

            <Link href="/signup" className="inline-flex min-h-12 w-full max-w-[17rem] items-center gap-3 rounded-[18px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.92))] px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.16)] transition active:scale-[0.98]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-100 bg-white">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4v12" /><path d="M4 10h12" /></svg>
              </span>
              <span>Create Account</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
