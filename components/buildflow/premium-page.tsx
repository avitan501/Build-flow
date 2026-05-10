import type { ReactNode } from "react";
import Link from "next/link";

type PremiumPageShellProps = {
  children: ReactNode;
  maxWidth?: string;
};

export function PremiumPageShell({ children, maxWidth = "max-w-7xl" }: PremiumPageShellProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef6ff_45%,#ffffff_100%)] px-4 py-5 pb-28 text-slate-900 sm:px-8 sm:pb-10 lg:px-10 lg:pb-12">
      <section className={`mx-auto flex flex-col gap-5 ${maxWidth}`}>{children}</section>
    </main>
  );
}

export function PremiumHero({ eyebrow, title, description, badges, aside }: { eyebrow: string; title: string; description: string; badges?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-[30px] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,246,255,0.9))] p-5 shadow-[0_18px_42px_rgba(148,163,184,0.12)] sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
          {badges ? <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]">{badges}</div> : null}
        </div>
        {aside ? <div className="lg:min-w-[18rem]">{aside}</div> : null}
      </div>
    </section>
  );
}

export function PremiumSection({ title, description, children, action, className = "" }: { title: string; description?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[26px] border border-sky-100/90 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.1)] ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PremiumInfoCard({ label, value, spanTwo = false }: { label: string; value: ReactNode; spanTwo?: boolean }) {
  return (
    <div className={`rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,247,255,0.86))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] ${spanTwo ? "sm:col-span-2" : ""}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function PremiumBadge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "sky" | "emerald" | "amber" }) {
  const toneClass =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-white text-slate-600";

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${toneClass}`}>{children}</span>;
}

export function PremiumIconBadge({ children, tone = "sky" }: { children: ReactNode; tone?: "sky" | "emerald" | "amber" | "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "slate"
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : "border-sky-200 bg-sky-50 text-sky-700";

  return <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>{children}</span>;
}

export function PremiumBackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.92))] px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(148,163,184,0.1)] transition active:scale-[0.99]">
      {children}
    </Link>
  );
}

export function PremiumPrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_30px_rgba(220,168,69,0.22)] transition active:scale-[0.99]">
      {children}
    </Link>
  );
}

export function PremiumActionTile({ href, title, detail, badge, icon }: { href: string; title: string; detail?: string; badge?: ReactNode; icon?: ReactNode }) {
  return (
    <Link href={href} className="block rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,247,255,0.88))] p-4 shadow-[0_10px_24px_rgba(148,163,184,0.08)] transition active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon}
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {detail ? <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p> : null}
          </div>
        </div>
        {badge}
      </div>
    </Link>
  );
}

export function PremiumMutedPanel({ children, tone = "sky" }: { children: ReactNode; tone?: "sky" | "emerald" | "amber" | "rose" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : "border-sky-100 bg-sky-50/70 text-slate-700";

  return <div className={`rounded-[22px] border p-4 text-sm ${toneClass}`}>{children}</div>;
}
