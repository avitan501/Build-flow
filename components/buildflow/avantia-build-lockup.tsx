import Image from "next/image";

type AvantiaBuildLockupProps = {
  compact?: boolean;
  showSlogan?: boolean;
  className?: string;
};

export function AvantiaBuildLockup({ compact = false, showSlogan = false, className = "" }: AvantiaBuildLockupProps) {
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <span className={`relative shrink-0 overflow-hidden rounded-[10px] ${compact ? "h-8 w-8" : "h-10 w-10"}`}>
        <Image
          src="/images/avantia/avantia-app-icon-512.png"
          alt=""
          fill
          sizes={compact ? "32px" : "40px"}
          className="object-cover"
          priority
        />
      </span>
      <span className="min-w-0 leading-none">
        <span className={`${compact ? "text-[1rem]" : "text-[1.12rem]"} block font-bold lowercase tracking-normal text-[#0E2A4A]`}>
          avantia
        </span>
        <span className={`${compact ? "text-[0.58rem]" : "text-[0.64rem]"} mt-0.5 block font-semibold uppercase tracking-[0.18em] text-[#0E2A4A]`}>
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
