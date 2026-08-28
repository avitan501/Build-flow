"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type AvantiaBuildClientShellProps = {
  children: ReactNode;
};

export function AvantiaBuildClientShell({ children }: AvantiaBuildClientShellProps) {
  const pathname = usePathname();
  const useAppShell = Boolean(pathname) && !pathname.startsWith("/admin");
  const isHome = pathname === "/";
  const isCinematicStory = pathname === "/how-it-works";
  const isAccount = pathname === "/account";
  const isShopLanding = pathname === "/shop";
  const isShopFlow = Boolean(pathname?.startsWith("/shop/"));
  const isProjectFlow = Boolean(pathname?.startsWith("/projects"));
  const isQuoteRequest = pathname === "/request-quote" || pathname === "/beat-a-quote";
  const isAiFlow = Boolean(pathname?.startsWith("/ai"));
  const isOwnerWorkspace = Boolean(pathname?.startsWith("/owner"));
  const isManagerPreview = Boolean(pathname?.startsWith("/preview-admin"));
  const isQuoteComparisonPreview = Boolean(pathname?.startsWith("/preview/quote-comparison"));
  const isAuthFlow = pathname === "/login" || pathname === "/signup" || pathname === "/reset-password";

  if (!useAppShell) {
    return <>{children}</>;
  }

  if (isAuthFlow) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className={isShopLanding || isHome || isCinematicStory ? `min-h-screen ${isCinematicStory ? "bg-[#071126]" : "bg-white"}` : "min-h-screen bg-[radial-gradient(circle_at_top,#d9e7fb_0%,#f4f8fd_34%,#dbe8f9_100%)] lg:px-3 lg:py-3"}>
      <div
        className={`mx-auto flex min-h-screen w-full flex-col ${isShopLanding ? "max-w-none bg-black" : isHome ? "max-w-none bg-white" : isCinematicStory ? "max-w-none bg-[#071126]" : "bg-[linear-gradient(180deg,#f9fcff_0%,#f2f7ff_42%,#ffffff_100%)] lg:min-h-[calc(100vh-3rem)] lg:rounded-[34px] lg:border lg:border-white/70 lg:shadow-[0_28px_80px_rgba(15,23,42,0.16)]"} ${
          isShopLanding || isHome || isCinematicStory
            ? "max-w-none"
            : isOwnerWorkspace
            ? "max-w-[96rem] lg:overflow-visible"
            : isManagerPreview
              ? "max-w-[96rem] lg:overflow-visible"
            : isAccount || isShopFlow || isProjectFlow || isQuoteRequest || isAiFlow || isQuoteComparisonPreview
              ? "max-w-[96rem] lg:overflow-visible"
              : "max-w-[31rem] lg:overflow-hidden"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
