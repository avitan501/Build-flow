"use client";

import { useEffect, useRef, type RefObject } from "react";
import { advanceCircles, circleLayout, type TaskCircle } from "@/lib/dashboard-circle-motion";

export function useTaskCircleMotion(arenaRef: RefObject<HTMLDivElement | null>, itemsKey: string, enabled: boolean, suspended: boolean) {
  const control = useRef<{ update: (on: boolean, blocked: boolean) => void } | null>(null);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const elements = Array.from(arena.querySelectorAll<HTMLButtonElement>("[data-task-circle]"));
    let circles: TaskCircle[] = [];
    let width = 0, height = 0, frame = 0, last = 0;
    let on = false, blocked = false, hovered = false, pressed = false, keyboard = false, visible = true;
    let keyboardInput = true;
    let disposed = false;
    const allowed = () => !disposed && on && !blocked && !hovered && !pressed && !keyboard && visible && !document.hidden && circles.length > 0;
    const paint = () => circles.forEach((circle, i) => {
      elements[i].style.transform = `translate3d(${circle.x.toFixed(2)}px,${circle.y.toFixed(2)}px,0)`;
    });
    const tick = (time: number) => {
      frame = 0;
      if (!allowed()) { last = 0; return; }
      if (last) advanceCircles(circles, width, height, (time - last) / 1000);
      last = time;
      paint();
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (allowed() && !frame) { last = 0; frame = requestAnimationFrame(tick); }
      if (!allowed() && frame) { cancelAnimationFrame(frame); frame = 0; last = 0; }
    };
    const resize = () => {
      if (!arena.clientWidth || disposed) return;
      const size = elements[0]?.offsetWidth || 120;
      if (width === arena.clientWidth && circles[0]?.size === size) return;
      width = arena.clientWidth;
      const layout = circleLayout(elements.length, width, size);
      circles = layout.circles; height = layout.height;
      arena.style.height = `${height}px`;
      arena.dataset.ready = "true";
      paint(); wake();
    };
    const taskTarget = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest("[data-task-circle]"));
    const pointerOver = (event: PointerEvent) => { if (event.pointerType === "mouse" && taskTarget(event.target)) { hovered = true; wake(); } };
    const pointerOut = (event: PointerEvent) => { if (event.pointerType === "mouse" && !taskTarget(event.relatedTarget)) { hovered = false; wake(); } };
    const pointerDown = () => { pressed = true; keyboard = false; wake(); };
    const pointerUp = () => { pressed = false; wake(); };
    // Safari restores :focus-visible to the trigger even after a touch closes
    // a dialog. Only keyboard-origin focus should hold the circles still.
    const pointerInput = () => { keyboardInput = false; keyboard = false; wake(); };
    const keyInput = () => { keyboardInput = true; if (taskTarget(document.activeElement)) { keyboard = true; wake(); } };
    const focusIn = (event: FocusEvent) => { if (keyboardInput && event.target instanceof Element && event.target.matches(":focus-visible")) { keyboard = true; wake(); } };
    const focusOut = () => { keyboard = false; wake(); };
    const windowBlur = () => { pressed = false; hovered = false; wake(); };
    arena.addEventListener("pointerover", pointerOver);
    arena.addEventListener("pointerout", pointerOut);
    arena.addEventListener("pointerdown", pointerDown);
    arena.addEventListener("focusin", focusIn);
    arena.addEventListener("focusout", focusOut);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointerdown", pointerInput, true);
    window.addEventListener("keydown", keyInput, true);
    window.addEventListener("pointercancel", pointerUp);
    window.addEventListener("blur", windowBlur);
    document.addEventListener("visibilitychange", wake);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(arena);
    const intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); });
    intersectionObserver.observe(arena);
    control.current = { update(next, modalOpen) {
      if (blocked && !modalOpen) { pressed = false; hovered = false; keyboard = false; }
      on = next; blocked = modalOpen; wake();
    } };
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect(); intersectionObserver.disconnect();
      arena.removeEventListener("pointerover", pointerOver);
      arena.removeEventListener("pointerout", pointerOut);
      arena.removeEventListener("pointerdown", pointerDown);
      arena.removeEventListener("focusin", focusIn);
      arena.removeEventListener("focusout", focusOut);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointerdown", pointerInput, true);
      window.removeEventListener("keydown", keyInput, true);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("blur", windowBlur);
      document.removeEventListener("visibilitychange", wake);
      delete arena.dataset.ready;
      elements.forEach((element) => { element.style.transform = ""; });
      control.current = null;
    };
  }, [arenaRef, itemsKey]);

  useEffect(() => { control.current?.update(enabled, suspended); }, [enabled, suspended, itemsKey]);
}
