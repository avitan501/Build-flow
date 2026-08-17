"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";

export type MobileMenuLink = {
  href: string;
  label: string;
  gated?: boolean;
  external?: boolean;
  badge?: string;
};

type MobileMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
  primaryLinks: MobileMenuLink[];
  requestLinks?: MobileMenuLink[];
  moreLinks?: MobileMenuLink[];
  adminLinks?: MobileMenuLink[];
  isSignedIn: boolean;
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/search" && pathname === "/shop");
}

export function MobileMenuDrawer({ open, onClose, primaryLinks, requestLinks = [], moreLinks = [], adminLinks = [], isSignedIn }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = drawerRef.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = drawer ? Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    focusable[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !drawer) return;
      const currentFocusable = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector));
      const first = currentFocusable[0];
      const last = currentFocusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  return (
    <>
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-[70] bg-slate-950/36 transition ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        id="mobile-navigation-drawer"
        aria-label="Site navigation"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 left-0 z-[71] w-[82vw] max-w-[18rem] overflow-y-auto border-r border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] px-3 pb-7 pt-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/" prefetch={false} onClick={onClose} aria-label="Avantia Build home" className="flex min-w-0 items-center gap-3">
            <AvantiaBuildLockup showSlogan />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 rounded-[20px] border border-sky-100 bg-white/90 p-2.5 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</p>
          <nav className="mt-2 grid gap-1.5" aria-label="Mobile full navigation">
            {primaryLinks.map((link) => {
              const active = !link.external && Boolean(pathname) && isActivePath(pathname, link.href);
              return (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  prefetch={false}
                  onClick={onClose}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition active:scale-[0.99] ${
                    active
                      ? "bg-[linear-gradient(180deg,rgba(14,35,65,0.08),rgba(14,35,65,0.03))] text-slate-950"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.badge ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-sky-700">{link.badge}</span> : null}
                  {!link.badge && link.gated && !isSignedIn ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">Login</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-2 border-t border-slate-200 pt-2">
            <Link
              href={isSignedIn ? "/account" : "/login"}
              prefetch={false}
              onClick={onClose}
              className="flex min-h-11 items-center justify-between rounded-2xl bg-[#0E2A4A] px-3 text-sm font-semibold text-white transition hover:bg-[#163a63] active:scale-[0.99]"
            >
              <span>{isSignedIn ? "Account" : "Log in"}</span>
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>

        {requestLinks.length ? <div className="mt-3 rounded-[20px] border border-sky-100 bg-white/90 p-2.5 shadow-[0_12px_30px_rgba(148,163,184,0.12)]">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0066cc]">Requests</p>
          <nav className="mt-2 grid gap-1.5" aria-label="Request navigation">
            {requestLinks.map((link) => <Link key={`${link.label}-${link.href}`} href={link.href} prefetch={false} onClick={onClose} className={`flex min-h-12 items-center justify-between rounded-2xl px-3 text-sm font-semibold ${Boolean(pathname) && isActivePath(pathname, link.href) ? "bg-[#0E2A4A] text-white" : "text-slate-700 hover:bg-slate-50"}`}><span>{link.label}</span><span aria-hidden="true">›</span></Link>)}
          </nav>
        </div> : null}

        {moreLinks.length ? <details className="group mt-3 rounded-[20px] border border-slate-200 bg-white/90 p-2.5 shadow-[0_12px_30px_rgba(148,163,184,0.1)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl px-2 text-sm font-bold text-slate-800 marker:content-none"><span>More</span><span className="text-lg transition group-open:rotate-90" aria-hidden="true">›</span></summary>
          <nav className="mt-1 grid gap-1" aria-label="More navigation">
            {moreLinks.map((link) => <Link key={`${link.label}-${link.href}`} href={link.href} prefetch={false} onClick={onClose} className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold ${Boolean(pathname) && isActivePath(pathname, link.href) ? "bg-sky-50 text-[#0066cc]" : "text-slate-600 hover:bg-slate-50"}`}><span>{link.label}</span>{link.badge ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-[.1em] text-sky-700">{link.badge}</span> : null}</Link>)}
          </nav>
        </details> : null}

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
                    prefetch={false}
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
