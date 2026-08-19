"use client";

import Link from "next/link";
import Image from "next/image";
import { Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { MobileMenuDrawer, type MobileMenuLink } from "@/components/buildflow/mobile-menu-drawer";
import { ShopTranslationBoundary, useShopLanguage } from "@/components/buildflow/shop-language-provider";
import { placeholderImageMetadata } from "@/lib/shop-catalog";
import { SHOP_CATEGORY_NAMES, SHOP_POPULAR_SEARCHES } from "@/lib/shop";
import { shopSearchSuggestions } from "@/lib/shop-search";

type MobileClientHeaderProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  isOwner?: boolean;
  managerHref?: string;
  isPreviewAdminEnabled?: boolean;
  displayName?: string | null;
};

const HIDDEN_PATHS = new Set(["/login", "/signup", "/reset-password"]);

function shouldShowHeader(pathname: string) {
  if (HIDDEN_PATHS.has(pathname)) {
    return false;
  }

  return !pathname.startsWith("/admin") && !pathname.startsWith("/owner");
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/search" && pathname === "/shop");
}

function IconShell({ active, premium = false, children }: { active: boolean; premium?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border transition active:scale-[0.98] ${
        premium
          ? "border-fuchsia-200/80 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.28),transparent_34%),radial-gradient(circle_at_top_right,rgba(96,165,250,0.32),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,244,255,0.96))] text-slate-950 shadow-[0_12px_26px_rgba(96,165,250,0.14)]"
          : active
            ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))] text-slate-950 shadow-[0_10px_24px_rgba(148,163,184,0.14)]"
            : "border-slate-200/90 bg-white/95 text-slate-700 shadow-sm"
      }`}
    >
      {children}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function AccountIcon({ signedIn }: { signedIn: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={signedIn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
    </svg>
  );
}

export function MobileClientHeader({ isSignedIn, isAdmin, isOwner = false, managerHref = "/admin/build-map", isPreviewAdminEnabled = false, displayName = null }: MobileClientHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language, setLanguage } = useShopLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopSearchOpen, setShopSearchOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isShopPage = Boolean(pathname) && pathname.startsWith("/shop");
  const shopQuery = isShopPage ? searchParams.get("q") ?? "" : "";
  const accountLabel = isSignedIn ? displayName?.split(/\s+/)[0] || "Account" : "Log in";

  useEffect(() => {
    if (shopSearchOpen) {
      const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 60);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        window.clearTimeout(timeout);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [shopQuery, shopSearchOpen]);

  const primaryLinks = useMemo<MobileMenuLink[]>(() => [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop Materials", description: "Browse products and departments" },
    { href: "/request-quote", label: "Request Material Pricing", description: "Send a list, photo, or plan" },
    { href: "/beat-a-quote", label: "Beat My Quote", description: "Upload a supplier quote for a better price" },
  ], []);

  const moreLinks = useMemo<MobileMenuLink[]>(() => [
    { href: "/ai/renovation-estimator", label: "Renovation AI", badge: "New" },
  ], []);

  const adminLinks = useMemo<MobileMenuLink[]>(() => {
    if (!isAdmin && !isPreviewAdminEnabled) {
      return [];
    }

    return [
      ...(isAdmin
        ? [
            { href: managerHref, label: "Manager" },
            { href: "/admin/users", label: "Customers" },
            { href: "/admin/vendors", label: "Suppliers" },
            ...(isOwner ? [{ href: "/admin/ai-tools", label: "AI Tools" }, { href: "/admin/traffic", label: "Website Traffic" }] : []),
          ]
        : []),
    ];
  }, [isAdmin, isOwner, isPreviewAdminEnabled, managerHref]);

  const normalizedQuery = draftQuery.trim().toLowerCase();
  const shopSuggestions = useMemo(() => {
    return shopSearchSuggestions(normalizedQuery, SHOP_CATEGORY_NAMES);
  }, [normalizedQuery]);

  const popularSearches = useMemo(() => {
    return shopSearchSuggestions(normalizedQuery, SHOP_POPULAR_SEARCHES);
  }, [normalizedQuery]);

  if (!pathname || !shouldShowHeader(pathname)) {
    return null;
  }

  function updateShopSearch(nextQuery: string, nextCategory?: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextQuery.trim()) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    if (nextCategory && nextCategory.trim()) {
      params.set("category", nextCategory);
    } else if (nextCategory === null) {
      params.delete("category");
    }

    const queryString = params.toString();
    router.replace(queryString ? `/shop?${queryString}` : "/shop", { scroll: false });
  }

  function submitShopSearch() {
    updateShopSearch(draftQuery, undefined);
    setShopSearchOpen(false);
  }

  return (
    <ShopTranslationBoundary>
      <div data-testid="site-header" className={pathname === "/" ? "absolute inset-x-0 top-0 z-[60] bg-transparent" : "sticky top-0 z-[60] border-b border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(148,163,184,0.1)]"}>
        <div className={`mx-auto flex w-full max-w-7xl items-center ${pathname === "/" ? "justify-end px-4 pb-2 pt-4 sm:px-7 sm:pt-5" : "gap-1.5 px-2 py-2.5 min-[360px]:gap-2 min-[360px]:px-3 sm:px-5"}`}>
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setMenuOpen(true)}
            className={pathname === "/" ? "inline-flex min-h-10 items-center gap-2 rounded bg-black/20 px-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-black/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" : "inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"}
          >
            {pathname === "/" ? (
              <>
                <span>Menu</span>
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h12" />
                  <path d="M4 13h12" />
                </svg>
              </>
            ) : (
              <IconShell active={menuOpen}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </IconShell>
            )}
          </button>

          {pathname === "/" ? null : isShopPage ? (
            <>
              <Link
                href="/"
                prefetch={false}
                aria-label="Avantia Build home"
              className="flex min-h-11 shrink-0 items-center overflow-hidden rounded-lg bg-white transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
              >
                <AvantiaBuildLockup header />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDraftQuery(shopQuery);
                  setShopSearchOpen(true);
                }}
                className={`flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-2.5 py-2 text-left shadow-sm transition sm:px-3 ${shopSearchOpen || isActivePath(pathname, "/shop") ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(235,244,255,0.92))]" : "border-slate-200/90 bg-white/95"}`}
                aria-haspopup="dialog"
                aria-expanded={shopSearchOpen}
                aria-controls="shop-search-overlay"
                aria-label={shopQuery ? `Search materials: ${shopQuery}` : "Search materials"}
              >
                <SearchIcon />
                <span data-testid="shop-search-label" className="hidden min-w-0 truncate text-xs text-slate-500 min-[390px]:block min-[430px]:text-sm">
                  {shopQuery ? shopQuery : <><span className="min-[430px]:hidden">Search</span><span className="hidden min-[430px]:inline">Search materials</span></>}
                </span>
              </button>
            </>
          ) : (
            <Link href="/" prefetch={false} aria-label="Avantia Build home" className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 md:flex-none">
              <span className="flex items-center transition active:scale-[0.99]">
                <AvantiaBuildLockup compact homepageHeader={pathname === "/"} />
              </span>
            </Link>
          )}

          {!isShopPage && pathname !== "/" ? (
            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Primary navigation">
              <Link href="/" className={`rounded-lg px-3 py-2 text-sm font-semibold ${pathname === "/" ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>Home</Link>
              <Link href="/shop" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950">Shop Materials</Link>
              <Link href="/request-quote" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950">Request Material Pricing</Link>
              <Link href="/beat-a-quote" className="rounded-lg bg-[#0E2A4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a63]">Beat My Quote</Link>
              <details className="group relative">
                <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950 marker:content-none">More</summary>
                <div className="absolute right-0 top-[calc(100%+.5rem)] w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
                  <Link href="/ai/renovation-estimator" className={`flex min-h-11 items-center justify-between rounded-md px-3 text-sm font-semibold ${pathname.startsWith("/ai/renovation-estimator") ? "bg-sky-50 text-[#0066cc]" : "text-slate-700 hover:bg-slate-50"}`}><span>Renovation AI</span><span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-[.1em] text-sky-700">New</span></Link>
                </div>
              </details>
            </nav>
          ) : null}

          {pathname !== "/" && isShopPage ? (
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-2xl border border-slate-200/90 bg-white/95 px-0 text-xs font-bold text-[#0E2A4A] shadow-sm transition hover:border-sky-200 hover:bg-sky-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 min-[360px]:px-2"
              aria-label={language === "en" ? "Ver tienda en español" : "View shop in English"}
              title={language === "en" ? "Ver tienda en español" : "View shop in English"}
              data-no-shop-translation
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              <span className="hidden min-[360px]:inline">{language === "en" ? "ES" : "EN"}</span>
            </button>
          ) : null}

          {pathname !== "/" ? <Link
            href={isSignedIn ? "/account" : "/login"}
            prefetch={false}
            aria-label={isSignedIn ? `Open account for ${accountLabel}` : "Log in"}
            className={`flex min-h-11 max-w-[7.75rem] shrink-0 items-center gap-1.5 rounded-2xl border px-2 text-xs font-bold shadow-sm transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 min-[360px]:px-2.5 ${pathname === "/account" ? "border-sky-200 bg-sky-50 text-[#0E2A4A]" : "border-slate-200/90 bg-white/95 text-[#0E2A4A]"}`}
          >
            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isSignedIn ? "bg-[#0E2A4A] text-white" : "bg-slate-100 text-slate-700"}`}>
              <AccountIcon signedIn={isSignedIn} />
            </span>
            <span className={`min-w-0 truncate ${isShopPage ? "hidden sm:inline" : pathname === "/" ? "hidden min-[390px]:inline" : ""}`}>{accountLabel}</span>
          </Link> : null}

        </div>
        {!isShopPage && pathname !== "/" ? (
          <div className="border-t border-slate-200/70 px-3 py-2 md:hidden">
            <Link href="/request-quote" className="mx-auto flex min-h-9 max-w-md items-center justify-between rounded-full bg-[#0E2A4A] px-4 text-xs font-semibold text-white">
              <span>Need materials or pricing?</span>
              <span>Request Pricing →</span>
            </Link>
          </div>
        ) : null}
      </div>

      <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} primaryLinks={primaryLinks} moreLinks={moreLinks} adminLinks={adminLinks} isSignedIn={isSignedIn} />

      {shopSearchOpen ? (
        <div id="shop-search-overlay" role="dialog" aria-modal="true" className="fixed inset-0 z-[80] bg-white/96 backdrop-blur-sm">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
            <div className="mb-4 grid grid-cols-[48px_1fr_48px] items-center">
              <button
                type="button"
                onClick={() => {
                  setShopSearchOpen(false);
                }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
                aria-label="Close search"
              >
                <CloseIcon />
              </button>
              <div className="flex justify-center">
                <AvantiaBuildLockup compact />
              </div>
              <div />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <label htmlFor="shop-search-input" className="sr-only">Search materials</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <SearchIcon />
                <input
                  id="shop-search-input"
                  ref={searchInputRef}
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitShopSearch();
                    }
                  }}
                  placeholder="Search materials"
                  className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {draftQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                    aria-label="Clear search"
                  >
                    <CloseIcon />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="grid gap-4 p-2 sm:grid-cols-2">
                <div>
                  <div className="px-2 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Categories</div>
                  <div className="space-y-1">
                    {shopSuggestions.map((category) => {
                      const image = placeholderImageMetadata(category, category).imageUrl;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            updateShopSearch(category, category);
                            setShopSearchOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <Image src={image} alt="" fill sizes="48px" className="object-contain p-1.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{category}</span>
                            <span className="block truncate text-xs text-slate-500">{`Browse ${category.toLowerCase()} materials`}</span>
                          </span>
                          <span className="text-slate-400"><SearchIcon /></span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="px-2 pb-2 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Popular searches</div>
                  <div className="space-y-1">
                    {popularSearches.map((term) => {
                      const image = placeholderImageMetadata("Materials", term).imageUrl;
                      return (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            updateShopSearch(term, null);
                            setShopSearchOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <Image src={image} alt="" fill sizes="48px" className="object-contain p-1.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{term}</span>
                            <span className="block truncate text-xs text-slate-500">Search this material</span>
                          </span>
                          <span className="text-slate-400"><SearchIcon /></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftQuery("");
                  updateShopSearch("", null);
                  setShopSearchOpen(false);
                }}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={submitShopSearch}
                className="flex-1 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(2,132,199,0.25)] transition hover:bg-sky-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ShopTranslationBoundary>
  );
}
