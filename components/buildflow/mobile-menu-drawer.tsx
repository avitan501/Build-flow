"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";

export type MobileMenuLink = {
  href: string;
  label: string;
  gated?: boolean;
};

type MobileMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
  primaryLinks: MobileMenuLink[];
  adminLinks?: MobileMenuLink[];
  isSignedIn: boolean;
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/search" && pathname === "/shop");
}

export function MobileMenuDrawer({ open, onClose, primaryLinks, adminLinks = [], isSignedIn }: MobileMenuDrawerProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-[70] bg-slate-950/36 transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[71] w-[88vw] max-w-[22rem] overflow-y-auto border-r border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-4 pb-8 pt-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/" onClick={onClose} aria-label="Avantia Build home" className="flex min-w-0 items-center gap-3">
            <AvantiaBuildLockup showSlogan />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-5 rounded-[26px] border border-sky-100 bg-white/90 p-3 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</p>
          <nav className="mt-2 grid gap-1.5" aria-label="Mobile full navigation">
            {primaryLinks.map((link) => {
              const active = Boolean(pathname) && isActivePath(pathname, link.href);
              return (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition active:scale-[0.99] ${
                    active
                      ? "bg-[linear-gradient(180deg,rgba(14,35,65,0.08),rgba(14,35,65,0.03))] text-slate-950"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.gated && !isSignedIn ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">Login</span> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {adminLinks.length > 0 ? (
          <div className="mt-4 rounded-[26px] border border-amber-100 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,247,220,0.9))] p-3 shadow-[0_12px_28px_rgba(220,168,69,0.12)]">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Admin</p>
            <nav className="mt-2 grid gap-1.5" aria-label="Admin navigation">
              {adminLinks.map((link) => {
                const active = Boolean(pathname) && isActivePath(pathname, link.href);
                return (
                  <Link
                    key={`${link.label}-${link.href}`}
                    href={link.href}
                    onClick={onClose}
                    className={`rounded-2xl px-3 py-3 text-sm font-medium transition active:scale-[0.99] ${active ? "bg-white/85 text-slate-950" : "text-slate-700 hover:bg-white/65"}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </aside>
    </>
  );
}
