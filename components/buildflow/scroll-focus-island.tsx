"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type ScrollFocusIslandProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

export function ScrollFocusIsland({ children, className = "", testId }: ScrollFocusIslandProps) {
  const islandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const island = islandRef.current;
    if (!island || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = island.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const islandCenter = rect.top + rect.height / 2;
      const travel = viewportCenter + rect.height / 2;
      const focus = Math.max(0, 1 - Math.abs(islandCenter - viewportCenter) / travel);
      const easedFocus = 1 - Math.pow(1 - focus, 2);

      island.style.setProperty("--island-scale", String(0.94 + easedFocus * 0.06));
      island.style.setProperty("--island-opacity", String(0.58 + easedFocus * 0.42));
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={islandRef}
      data-testid={testId}
      className={`origin-center opacity-[var(--island-opacity)] [transform:scale(var(--island-scale))] [will-change:transform,opacity] motion-reduce:transform-none motion-reduce:opacity-100 ${className}`}
      style={{ "--island-scale": 0.94, "--island-opacity": 0.58 } as CSSProperties}
    >
      {children}
    </div>
  );
}
