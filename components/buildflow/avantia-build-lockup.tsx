import Image from "next/image";

type AvantiaBuildLockupProps = {
  compact?: boolean;
  showSlogan?: boolean;
  className?: string;
};

export function AvantiaBuildLockup({ compact = false, showSlogan = false, className = "" }: AvantiaBuildLockupProps) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span className={`relative shrink-0 ${compact ? "h-7 w-[6.4rem]" : "h-9 w-[8rem]"}`}>
        <Image
          src="/images/avantia/avantia-logo-horizontal.png"
          alt="Avantia"
          fill
          sizes={compact ? "102px" : "128px"}
          className="object-contain object-left"
          priority
        />
      </span>
      <span className="min-w-0 leading-none">
        <span className={`${compact ? "text-[0.68rem]" : "text-[0.72rem]"} block font-semibold uppercase tracking-[0.18em] text-[#0E2A4A]`}>
          Build
        </span>
        {showSlogan ? (
          <span className="mt-1 block truncate text-[0.65rem] font-medium normal-case tracking-normal text-slate-500">
            Everything it takes to build
          </span>
        ) : null}
      </span>
    </span>
  );
}
