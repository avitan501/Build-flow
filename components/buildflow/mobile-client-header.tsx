"use client";

import Link from "next/link";
import Image from "next/image";
import { Languages, Menu } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { MobileMenuDrawer, type MobileMenuLink } from "@/components/buildflow/mobile-menu-drawer";
import { AvantiaBuildLockup } from "@/components/buildflow/avantia-build-lockup";
import { ShopTranslationBoundary, useShopLanguage } from "@/components/buildflow/shop-language-provider";
import { placeholderImageMetadata } from "@/lib/shop-catalog";
import { SHOP_CATEGORY_NAMES, SHOP_POPULAR_SEARCHES } from "@/lib/shop";
import { SHOP_COMING_SOON_LINKS, SHOP_MENU_MATERIAL_LINKS, SHOP_SERVICE_LINKS } from "@/lib/shop-navigation";
import { shopSearchSuggestions } from "@/lib/shop-search";

type MobileClientHeaderProps = {
  isSignedIn: boolean;
  isAdmin: boolean;
  isOwner?: boolean;
  managerHref?: string;
  isPreviewAdminEnabled?: boolean;
  displayName?: string | null;
};

const HIDDEN_PATHS = new Set(["/login", "/signup", "/reset-password", "/homepage-preview"]);

function shouldShowHeader(pathname: string) {
  if (HIDDEN_PATHS.has(pathname)) {
    return false;
  }

  return !pathname.startsWith("/admin") && !pathname.startsWith("/owner");
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`) || (href === "/search" && pathname === "/shop");
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

export function MobileClientHeader({ isSignedIn, isAdmin, managerHref = "/admin/build-map", isPreviewAdminEnabled = false, displayName = null }: MobileClientHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language, setLanguage } = useShopLanguage();
  const [homeLanguage, setHomeLanguage] = useState<"en" | "es">("en");
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopDirectoryOpen, setShopDirectoryOpen] = useState(false);
  const [shopSearchOpen, setShopSearchOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isShopPage = Boolean(pathname) && pathname.startsWith("/shop");
  const isHome = pathname === "/";
  const isRequestQuotePage = pathname === "/request-quote";
  const shopQuery = isShopPage ? searchParams.get("q") ?? "" : "";
  const accountLabel = isSignedIn ? displayName?.split(/\s+/)[0] || "Account" : "Account";

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

  const shopLinks = useMemo<MobileMenuLink[]>(() => [
    ...SHOP_MENU_MATERIAL_LINKS.map((item) => ({ href: item.href, label: item.label, description: item.description, section: "Materials" as const, imageUrl: item.imageUrl })),
    ...SHOP_SERVICE_LINKS.map((item) => ({ href: item.href, label: item.label, description: item.description, section: "Services" as const, imageUrl: item.imageUrl })),
    ...SHOP_COMING_SOON_LINKS.map((item) => ({ href: item.href, label: item.label, description: item.description, section: "Coming Soon" as const, imageUrl: item.imageUrl, badge: item.badge, disabled: item.disabled })),
  ], []);

  const adminLinks = useMemo<MobileMenuLink[]>(() => {
    if (!isAdmin && !isPreviewAdminEnabled) {
      return [];
    }

    return isAdmin
      ? [{ href: managerHref, label: "Manager", description: "Customers, suppliers, communications, and business tools" }]
      : [];
  }, [isAdmin, isPreviewAdminEnabled, managerHref]);

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
      <div
        data-testid="site-header"
        className={
          isHome
            ? "fixed inset-x-0 top-0 z-[60] bg-transparent px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 sm:pt-3"
            : "sticky top-0 z-[60] border-b border-[#d2d2d7] bg-white/95 backdrop-blur-md"
        }
      >
        <div className={`mx-auto flex w-full max-w-[92rem] items-center ${isHome ? "justify-end gap-2 px-3 py-2 sm:px-5" : "gap-2 px-3 py-2 sm:px-5 lg:px-8"}`}>
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => {
              setShopDirectoryOpen(false);
              setMenuOpen(true);
            }}
            className={
              isHome
                ? "inline-flex min-h-10 items-center rounded-md bg-[#1d1d1f]/55 px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition hover:bg-[#1d1d1f]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
                : "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
            }
          >
            {isHome ? (
              <span>Menu</span>
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
            )}
          </button>

          {isHome ? null : isShopPage ? (
            <>
            <Link
              href="/"
              prefetch={false}
              aria-label="Avantia Build home"
              className="hidden min-h-10 shrink-0 items-center overflow-hidden transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 min-[360px]:flex"
            >
              <span className="text-[13px] font-semibold tracking-tight text-[#1d1d1f]">Avantia</span>
            </Link>
              <button
                type="button"
                onClick={() => {
                  setDraftQuery(shopQuery);
                  setShopSearchOpen(true);
                }}
                className={`flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-[#d2d2d7] px-2.5 py-2 text-left shadow-sm transition sm:px-3 ${shopSearchOpen || isActivePath(pathname, "/shop") ? "bg-[#f5f5f7]" : "bg-white"}`}
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
          ) : isRequestQuotePage ? (
            <Link href="/" prefetch={false} aria-label="Avantia Build home" className="flex min-h-11 min-w-0 flex-1 items-center justify-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 md:flex-none">
              <AvantiaBuildLockup compact />
            </Link>
          ) : (
            <Link href="/" prefetch={false} aria-label="Avantia Build home" className="flex min-h-11 min-w-0 items-center px-1 text-[13px] font-semibold tracking-tight text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 md:flex-none">
              Avantia
            </Link>
          )}

          {!isShopPage && !isHome ? (
            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-label="Primary navigation">
              <Link
                href="/"
                className={`rounded-full px-3 py-2 text-[13px] leading-none font-medium transition ${pathname === "/" ? "bg-[#f2f5f7] text-[#1d1d1f]" : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"}`}
              >
                Home
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShopDirectoryOpen(true);
                  setMenuOpen(true);
                }}
                className={`rounded-full px-3 py-2 text-[13px] leading-none font-medium transition ${pathname === "/shop" ? "bg-[#f2f5f7] text-[#1d1d1f]" : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"}`}
              >
                Shop Materials
              </button>
              <Link
                href="/request-quote"
                className={`rounded-full px-3 py-2 text-[13px] leading-none font-medium transition ${pathname === "/request-quote" ? "bg-[#f2f5f7] text-[#1d1d1f]" : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"}`}
              >
                Request Pricing
              </Link>
              <Link
                href="/beat-a-quote"
                className={`rounded-full px-3 py-2 text-[13px] leading-none font-medium transition ${pathname === "/beat-a-quote" ? "bg-[#f2f5f7] text-[#1d1d1f]" : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"}`}
              >
                Beat My Quote
              </Link>
              <details className="group relative">
                <summary className="cursor-pointer list-none rounded-full px-3 py-2 text-[13px] leading-none font-medium text-[#6e6e73] marker:content-none transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]">
                  More
                </summary>
                <div className="absolute right-0 top-[calc(100%+.5rem)] w-56 rounded-2xl border border-[#e7e7ea] bg-white p-2 shadow-[0_12px_48px_rgba(15,23,42,0.18)]">
                  <Link href="/ai/renovation-estimator" className={`flex min-h-11 items-center justify-between rounded-md px-3 text-sm font-semibold ${pathname.startsWith("/ai/renovation-estimator") ? "bg-sky-50 text-[#0066cc]" : "text-slate-700 hover:bg-slate-50"}`}><span>Renovation AI</span><span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] uppercase tracking-[.1em] text-sky-700">New</span></Link>
                </div>
              </details>
            </nav>
          ) : null}

          {pathname !== "/" && isShopPage ? (
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              className="inline-flex h-10 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full border border-slate-200/90 px-0 text-xs font-bold text-[#0E2A4A] transition hover:border-sky-200 hover:bg-sky-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 min-[360px]:px-2"
              aria-label={language === "en" ? "Ver tienda en español" : "View shop in English"}
              title={language === "en" ? "Ver tienda en español" : "View shop in English"}
              data-no-shop-translation
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              <span className="hidden min-[360px]:inline">{language === "en" ? "ES" : "EN"}</span>
            </button>
          ) : null}

          {!isHome ? <Link
            href={isSignedIn ? "/requests" : "/login"}
            prefetch={false}
            aria-label={isSignedIn ? `Open account for ${accountLabel}` : "Account"}
            className={`hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium leading-none transition active:scale-[0.98] md:inline-flex ${pathname === "/account" || pathname === "/requests" ? "bg-[#f2f5f7] text-[#0071e3]" : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"}`}
          >
            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isSignedIn ? "bg-[#0071e3] text-white" : "bg-slate-100 text-slate-600"}`}>
              <AccountIcon signedIn={isSignedIn} />
            </span>
            <span className={`min-w-0 truncate ${isShopPage ? "hidden sm:inline" : ""}`}>{accountLabel}</span>
          </Link> : null}

        </div>
        {!isShopPage && pathname !== "/" && !isRequestQuotePage ? (
          <div className="border-t border-slate-200/70 px-3 py-2 md:hidden">
            <Link href="/request-quote" className="mx-auto flex min-h-9 max-w-md items-center justify-between rounded-full bg-[#0E2A4A] px-4 text-xs font-semibold text-white">
              <span>Need materials or pricing?</span>
              <span>Request Pricing →</span>
            </Link>
          </div>
        ) : null}
      </div>

      <MobileMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        primaryLinks={isHome ? primaryLinks.filter((link) => link.href !== "/") : primaryLinks}
        shopLinks={shopLinks}
        shopOpen={shopDirectoryOpen}
        onShopOpenChange={setShopDirectoryOpen}
        adminLinks={adminLinks}
        isSignedIn={isSignedIn}
        homeLanguage={isHome ? homeLanguage : undefined}
        onHomeLanguageChange={isHome ? () => {
          const nextLanguage = homeLanguage === "en" ? "es" : "en";
          setHomeLanguage(nextLanguage);
          document.documentElement.lang = nextLanguage;
          window.dispatchEvent(new CustomEvent("avantia-home-language", { detail: nextLanguage }));
          setMenuOpen(false);
        } : undefined}
      />

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
                <Link href="/" prefetch={false} className="text-sm font-semibold text-slate-700" aria-label="Avantia Build home">
                  Avantia
                </Link>
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
