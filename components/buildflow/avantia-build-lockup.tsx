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
        className={`${compact ? "w-[6.9rem] sm:w-[7.6rem]" : "w-[10rem] sm:w-[11.5rem]"} h-auto object-contain`}
      />
      {showSlogan ? (
        <span className="mt-1 block truncate text-[0.65rem] font-medium normal-case tracking-normal text-slate-500">
          Everything it takes to build
        </span>
      ) : null}
    </span>
  );
}
