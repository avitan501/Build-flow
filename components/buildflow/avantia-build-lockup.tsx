import { HardHat } from "lucide-react";

type AvantiaBuildLockupProps = {
  compact?: boolean;
  showSlogan?: boolean;
  className?: string;
  tone?: "navy" | "light";
};

export function AvantiaBuildLockup({ compact = false, showSlogan = false, className = "", tone = "navy" }: AvantiaBuildLockupProps) {
  const foreground = tone === "light" ? "text-white" : "text-[#2b1409]";

  return (
    <span className={`flex min-w-0 flex-col ${className}`} data-testid="avantia-build-lockup">
      <span
        className={`flex min-w-0 items-end whitespace-nowrap font-extrabold leading-none tracking-normal ${foreground}`}
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
        aria-label="Avantia Build"
        translate="no"
      >
        <span className={`inline-flex ${compact ? "text-[1.08rem] sm:text-[1.18rem]" : "text-[1.6rem] sm:text-[1.85rem]"}`} aria-hidden="true">
          av<span className="text-[#ff5b00]">a</span>ntia
        </span>
        <span className={`relative ${compact ? "ml-1 text-[0.72rem] sm:text-[0.78rem]" : "ml-1.5 text-[0.94rem] sm:text-[1.05rem]"} pb-[0.04em] font-bold`} aria-hidden="true">
          buil<span className="relative inline-block">d<HardHat className={`absolute left-1/2 -translate-x-1/2 scale-x-125 fill-[#ff6a00] text-[#9a3412] ${compact ? "-top-[0.68rem] h-3 w-3.5" : "-top-[0.92rem] h-4 w-5"}`} strokeWidth={2.1} /></span>
        </span>
      </span>
      {showSlogan ? (
        <span className={`mt-1 block truncate text-[0.65rem] font-medium normal-case tracking-normal ${tone === "light" ? "text-white/70" : "text-slate-500"}`}>
          Everything it takes to build
        </span>
      ) : null}
    </span>
  );
}
