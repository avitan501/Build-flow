import Image from "next/image";

type AvantiaBuildLockupProps = {
  compact?: boolean;
  header?: boolean;
  showSlogan?: boolean;
  className?: string;
  tone?: "navy" | "light";
};

export function AvantiaBuildLockup({ compact = false, header = false, showSlogan = false, className = "" }: AvantiaBuildLockupProps) {
  const widthClass = header
    ? "w-[5.75rem] min-[390px]:w-[6.5rem] sm:w-[8rem] md:w-[9.5rem]"
    : compact
      ? "w-[10rem] sm:w-[11rem]"
      : "w-[14rem] sm:w-[15.5rem]";

  return (
    <span className={`flex min-w-0 flex-col ${className}`} data-testid="avantia-build-lockup">
      <Image
        src="/images/avantia/avantia-build-rain-painter-animation.gif"
        alt="Avantia Build"
        width={1400}
        height={450}
        loading={header ? "eager" : undefined}
        unoptimized
        className={`${widthClass} h-auto select-none object-contain [image-rendering:auto]`}
      />
      {showSlogan ? (
        <span className="mt-1 block truncate text-[0.65rem] font-medium normal-case tracking-normal text-slate-500">
          Everything it takes to build
        </span>
      ) : null}
    </span>
  );
}
