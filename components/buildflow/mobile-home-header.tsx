import type { ReactNode } from "react";
import Link from "next/link";

type MobileHomeHeaderProps = {
  uploadHref: string;
  aiHref: string;
};

function ActionOrb({ href, label, tone, children, disabled }: { href: string; label: string; tone: "upload" | "ai"; children: ReactNode; disabled?: boolean }) {
  const toneClass =
    tone === "upload"
      ? "border-white/28 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.1),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(2,8,23,0.26)]"
      : "border-transparent bg-[radial-gradient(circle_at_25%_20%,rgba(244,114,182,0.95),transparent_34%),radial-gradient(circle_at_78%_22%,rgba(96,165,250,0.95),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(52,211,153,0.9),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] shadow-[0_14px_32px_rgba(168,85,247,0.2)]";

  return (
    <Link
      href={href}
      aria-label={label}
      aria-disabled={disabled}
      className={`group inline-flex flex-col items-center gap-1.5 text-white ${disabled ? "cursor-default" : ""}`}
    >
      <span className={`relative flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full p-[1.25px] transition duration-150 active:scale-[0.96] ${tone === "ai" ? "shadow-[0_0_18px_rgba(96,165,250,0.16)]" : ""}`}>
        <span className={`absolute inset-0 rounded-full ${toneClass}`} />
        <span className={`relative flex h-full w-full items-center justify-center rounded-full ${tone === "upload" ? "border border-white/22 bg-[linear-gradient(180deg,rgba(8,21,43,0.92),rgba(8,21,43,0.82))]" : "bg-[linear-gradient(180deg,rgba(8,21,43,0.9),rgba(8,21,43,0.76))]"}`}>
          {children}
        </span>
      </span>
      <span className="text-[10px] font-medium tracking-[-0.01em] text-white/92 drop-shadow-[0_2px_8px_rgba(2,8,23,0.5)]">{label}</span>
    </Link>
  );
}

function WorkflowPill({ number, title, subtitle, icon }: { number: string; title: string; subtitle: string; icon: ReactNode }) {
  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(15,23,42,0.38))] px-3 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-slate-100">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold leading-none text-white">{number}. {title}</p>
        <p className="mt-1 truncate text-[11px] leading-none text-slate-300">{subtitle}</p>
      </div>
    </div>
  );
}

export function MobileHomeHeader({ uploadHref, aiHref }: MobileHomeHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[#1c3760] bg-[linear-gradient(180deg,#07162d_0%,#0b1d39_40%,#0d2140_100%)] text-white shadow-[0_30px_80px_rgba(2,8,23,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(244,114,182,0.16),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
      <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(90deg,rgba(7,22,45,0.96)_0%,rgba(7,22,45,0.88)_34%,rgba(7,22,45,0.34)_64%,rgba(7,22,45,0.15)_100%)]" />
      <div
        className="absolute inset-y-0 right-0 w-[58%] bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80')",
        }}
      />
      <div className="absolute inset-y-0 right-0 w-[58%] bg-[linear-gradient(180deg,rgba(7,22,45,0.05),rgba(7,22,45,0.28))]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(7,22,45,0.55))]" />

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
              <p className="text-[1.75rem] font-semibold tracking-tight text-white">Build<span className="text-sky-400">Flow</span></p>
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
              <div className="relative flex items-center text-white">
                <span className="text-[1.35rem] font-semibold tracking-[-0.04em]">AI</span>
                <span className="absolute -right-2 -top-1.5 text-[0.7rem]">✦</span>
              </div>
            </ActionOrb>
          </div>
        </div>

        <div className="relative mt-6 max-w-[58%] pr-2">
          <h1 className="text-[2.25rem] font-semibold leading-[0.98] tracking-tight text-white sm:text-[2.6rem]">
            Start your project with confidence
          </h1>
          <p className="mt-3 max-w-xs text-[1rem] leading-7 text-slate-200">
            Upload plans, organize materials, review quotes, and track orders in one simple workflow.
          </p>

          <div className="mt-5 space-y-3">
            <Link href="/start-project" className="inline-flex min-h-14 w-full max-w-[17rem] items-center justify-between gap-3 rounded-[18px] border border-[#e8c26b]/30 bg-[linear-gradient(180deg,#f1ca70_0%,#dca945_100%)] px-4 py-3 text-base font-semibold text-slate-950 shadow-[0_16px_40px_rgba(228,184,95,0.26)] transition active:scale-[0.98]">
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/12">
                  <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="4" /><path d="M10 7v6" /><path d="M8 9.5 10 7l2 2.5" /></svg>
                </span>
                <span>Log in to Start Project</span>
              </span>
              <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10h12" /><path d="m10 4 6 6-6 6" /></svg>
            </Link>

            <Link href="/signup" className="inline-flex min-h-12 w-full max-w-[17rem] items-center gap-3 rounded-[18px] border border-white/18 bg-[linear-gradient(180deg,rgba(17,30,57,0.8),rgba(10,22,43,0.65))] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(2,8,23,0.28)] transition active:scale-[0.98]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/5">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4v12" /><path d="M4 10h12" /></svg>
              </span>
              <span>Create Account</span>
            </Link>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <WorkflowPill
            number="1"
            title="Upload"
            subtitle="Plans & documents"
            icon={<svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V5" /><path d="m7 10 5-5 5 5" /><path d="M5 19h14" /></svg>}
          />
          <WorkflowPill
            number="2"
            title="Review"
            subtitle="Materials & quotes"
            icon={<svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>}
          />
          <WorkflowPill
            number="3"
            title="Approve"
            subtitle="Orders with confidence"
            icon={<svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 12 2 2 4-4" /><path d="M12 3 5 6v6c0 5 3.5 7.5 7 9 3.5-1.5 7-4 7-9V6l-7-3Z" /></svg>}
          />
        </div>
      </div>
    </section>
  );
}
