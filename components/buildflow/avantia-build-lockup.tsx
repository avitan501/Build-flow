type AvantiaBuildLockupProps = {
  compact?: boolean;
  showSlogan?: boolean;
  showHardHat?: boolean;
  className?: string;
  tone?: "navy" | "light";
};

export function AvantiaBuildLockup({ compact = false, showSlogan = false, showHardHat = false, className = "", tone = "navy" }: AvantiaBuildLockupProps) {
  const foreground = tone === "light" ? "text-white" : "text-[#0E2A4A]";

  return (
    <span className={`flex min-w-0 flex-col ${className}`} data-testid="avantia-build-lockup">
      <span
        className={`flex min-w-0 items-baseline whitespace-nowrap font-extrabold leading-none tracking-normal ${showHardHat ? "pt-3" : ""} ${foreground}`}
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
        aria-label="Avantia Build"
        translate="no"
      >
        <span className={compact ? "text-[1.08rem] sm:text-[1.15rem]" : "text-[1.55rem] sm:text-[1.75rem]"} aria-hidden="true">
          av<span className="relative inline-block"><span className="bg-[linear-gradient(135deg,#1E9BFF_0%,#1FC9C6_24%,#2BD98A_42%,#7E5BEA_68%,#F0419E_86%,#FF5BC2_100%)] bg-clip-text text-transparent">a</span>{showHardHat ? (
            <span aria-hidden="true" className="absolute -top-[0.84em] left-1/2 h-[0.65em] w-[1.42em] -translate-x-1/2 -rotate-[4deg] drop-shadow-[0_1px_0_rgba(126,91,234,0.2)]">
              <span className="absolute bottom-[0.11em] left-[0.22em] right-[0.25em] h-[0.5em] rounded-t-full bg-[#7E5BEA]" />
              <span className="absolute bottom-[0.1em] left-[0.54em] h-[0.46em] w-[0.08em] rounded-full bg-[#6141C7]" />
              <span className="absolute bottom-[0.1em] right-[0.52em] h-[0.42em] w-[0.07em] rounded-full bg-[#6141C7]" />
              <span className="absolute -left-[0.02em] right-0 bottom-0 h-[0.16em] rounded-full bg-[#6141C7]" />
            </span>
          ) : null}</span>ntia
        </span>
        <span className={`${compact ? "ml-2 text-[0.78rem] sm:text-[0.82rem]" : "ml-3 text-[1.02rem] sm:text-[1.15rem]"} font-bold`} aria-hidden="true">
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
