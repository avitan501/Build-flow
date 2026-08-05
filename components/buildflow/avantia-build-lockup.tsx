import Image from "next/image";

type AvantiaBuildLockupProps = {
  compact?: boolean;
  showSlogan?: boolean;
  className?: string;
};

export function AvantiaBuildLockup({ compact = false, showSlogan = false, className = "" }: AvantiaBuildLockupProps) {
  return (
    <span className={`flex min-w-0 flex-col ${className}`}>
      <span className="flex min-w-0 items-center gap-2.5" translate="no">
        <span className={`relative block shrink-0 overflow-hidden ${compact ? "h-7 w-[94px]" : "h-9 w-[122px]"}`}>
          <Image
            src="/images/avantia/avantia-logo-horizontal.png"
            alt="Avantia"
            width={3541}
            height={506}
            sizes={compact ? "196px" : "252px"}
            className="absolute left-0 top-0 h-full w-auto max-w-none"
            priority
          />
        </span>
        <span className={`${compact ? "text-[1rem]" : "text-[1.25rem]"} font-medium leading-none tracking-normal text-[#173A63]`}>
          Build
        </span>
      </span>
      {showSlogan ? (
        <span className="mt-1 block truncate text-[0.65rem] font-medium normal-case tracking-normal text-slate-500">
          Everything it takes to build
        </span>
      ) : null}
    </span>
  );
}
