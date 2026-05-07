import type { ReactNode } from "react";
import Link from "next/link";

type MobileBottomDockProps = {
  accountHref: string;
};

function DockItem({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="flex min-w-[56px] flex-1 flex-col items-center justify-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">{children}</span>
      <span className="mt-1 text-[11px] font-medium text-slate-600">{label}</span>
    </Link>
  );
}

export function MobileBottomDock({ accountHref }: MobileBottomDockProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4 sm:hidden">
      <nav aria-label="Mobile homepage" className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-[0_20px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <DockItem href="/" label="Home">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
          </svg>
        </DockItem>
        <DockItem href="/projects" label="Projects">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="7" height="7" rx="1.5" />
            <rect x="14" y="4" width="7" height="7" rx="1.5" />
            <rect x="3" y="13" width="7" height="7" rx="1.5" />
            <rect x="14" y="13" width="7" height="7" rx="1.5" />
          </svg>
        </DockItem>
        <DockItem href="/upload" label="Upload">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V5" />
            <path d="m7 10 5-5 5 5" />
            <path d="M5 19h14" />
          </svg>
        </DockItem>
        <DockItem href={accountHref} label="Account">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4" />
          </svg>
        </DockItem>
        <DockItem href="/search" label="Search">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </DockItem>
      </nav>
    </div>
  );
}
