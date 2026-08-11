type AvantiaBuildLockupProps = {
  compact?: boolean;
  showSlogan?: boolean;
  className?: string;
  tone?: "navy" | "light";
};

export function AvantiaBuildLockup({ compact = false, showSlogan = false, className = "", tone = "navy" }: AvantiaBuildLockupProps) {
  const foreground = tone === "light" ? "text-white" : "text-[#0E2A4A]";

  return (
    <span className={`flex min-w-0 flex-col ${className}`} data-testid="avantia-build-lockup">
      <span
        className={`flex min-w-0 items-baseline whitespace-nowrap font-extrabold leading-none tracking-normal ${foreground}`}
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
        aria-label="Avantia Build"
        translate="no"
      >
        <span className={`inline-flex ${compact ? "text-[1.08rem] sm:text-[1.15rem]" : "text-[1.55rem] sm:text-[1.75rem]"}`} aria-hidden="true">
          av<span className="bg-[linear-gradient(135deg,#1E9BFF_0%,#1FC9C6_24%,#2BD98A_42%,#7E5BEA_68%,#F0419E_86%,#FF5BC2_100%)] bg-clip-text text-transparent">a</span>n<span className="relative inline-flex"><HardHat className={`absolute left-1/2 -translate-x-1/2 text-[#D99A16] ${compact ? "-top-2 h-3 w-3" : "-top-3 h-4 w-4"}`} strokeWidth={2.4} />t</span>ia
        </span>
        <span className={`${compact ? "ml-1 text-[0.78rem] sm:text-[0.82rem]" : "ml-1.5 text-[1.02rem] sm:text-[1.15rem]"} font-bold`} aria-hidden="true">
          Build
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
import { HardHat } from "lucide-react";
