import Image from "next/image";

type AvantiaBuildLockupProps = {
  compact?: boolean;
  showSlogan?: boolean;
  className?: string;
  tone?: "navy" | "light";
};

export function AvantiaBuildLockup({ compact = false, showSlogan = false, className = "" }: AvantiaBuildLockupProps) {
  return (
    <span className={`flex min-w-0 flex-col ${className}`} data-testid="avantia-build-lockup">
      <Image
        src="/images/avantia/avantia-build-rain-painter-animation.gif"
        alt="Avantia Build"
        width={1400}
        height={450}
        unoptimized
        className={`${compact ? "w-[8.75rem] sm:w-[9.5rem]" : "w-[12rem] sm:w-[13.5rem]"} h-auto select-none object-contain [image-rendering:auto]`}
      />
      {showSlogan ? (
        <span className="mt-1 block truncate text-[0.65rem] font-medium normal-case tracking-normal text-slate-500">
          Everything it takes to build
        </span>
      ) : null}
    </span>
  );
}
