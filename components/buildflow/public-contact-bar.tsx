"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, MessageCircle, MessageSquareText, Play, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { WhatsAppIcon } from "@/components/buildflow/whatsapp-icon";

const BUSINESS_WHATSAPP_URL = "https://wa.me/15169088319?text=Hi%20Avantia%20Build%2C%20I%20need%20help%20with%20construction%20materials.";

export const PUBLIC_CONTACT_BAR_PATHS = new Set([
  "/",
  "/how-it-works",
  "/shop",
]);

export function showsPublicContactBar(pathname: string) {
  return PUBLIC_CONTACT_BAR_PATHS.has(pathname);
}

type SubmitState = "idle" | "submitting" | "success" | "error";
type OpenPanel = "contact" | "demo" | null;

function normalizePhoneInput(value: string) {
  return value.replace(/[^\d+() .-]/g, "").slice(0, 24);
}

export function PublicContactBar() {
  const pathname = usePathname();
  const titleId = useId();
  const phoneId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [phone, setPhone] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const open = openPanel !== null;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    function openDemo() {
      if (pathname && showsPublicContactBar(pathname)) setOpenPanel("demo");
    }
    window.addEventListener("avantia:open-demo", openDemo);
    return () => window.removeEventListener("avantia:open-demo", openDemo);
  }, [pathname]);

  useEffect(() => {
    if (pathname && !showsPublicContactBar(pathname)) setOpenPanel(null);
  }, [pathname]);

  useEffect(() => {
    if (openPanel) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      videoRef.current?.play().catch(() => undefined);
      return;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [openPanel]);

  if (!pathname || !showsPublicContactBar(pathname)) return null;

  function openSheet(panel: Exclude<OpenPanel, null> = "contact") {
    setSubmitState("idle");
    setErrorMessage("");
    setOpenPanel(panel);
  }

  async function submitStartByText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "submitting") return;
    setSubmitState("submitting");
    setErrorMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/public/start-by-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          consent: true,
          website: String(form.get("website") || ""),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "We couldn’t start the text. Please try again.");
      setSubmitState("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We couldn’t start the text. Please try again.");
      setSubmitState("error");
    }
  }

  return (
    <>
      <div
        data-testid="public-contact-bar"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] sm:px-4 sm:pb-4"
      >
        <div className="pointer-events-auto relative mx-auto flex w-full max-w-[36rem] items-center gap-1.5 overflow-hidden rounded-[1.15rem] border border-slate-200/90 bg-white/95 p-1.5 text-[#171a20] shadow-[0_14px_40px_rgba(23,26,32,0.2)] backdrop-blur-xl">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f766e] via-[#0ea5a4] to-[#3e6ae1]" aria-hidden="true" />
          <button type="button" onClick={() => openSheet("contact")} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.72rem] bg-[#0f766e] text-white shadow-[0_7px_16px_rgba(15,118,110,0.25)] transition hover:bg-[#0b5f59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1]" aria-label="Open chat">
            <MessageCircle className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openSheet("contact")}
            className="group flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[0.72rem] bg-[#2563eb] px-3 text-xs font-extrabold text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)] transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] sm:px-5 sm:text-sm"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            Text me to start <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-5" role="presentation">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-[#020817]/58 backdrop-blur-[2px]"
            onClick={() => setOpenPanel(null)}
            aria-label="Close contact options"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[94svh] w-full flex-col overflow-hidden rounded-t-[1.35rem] border border-slate-200 bg-[#f7f7f7] text-[#171a20] shadow-[0_-18px_50px_rgba(23,26,32,0.22)] sm:max-w-[31rem] sm:rounded-[1.35rem]"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
            <header className="flex items-start justify-between gap-3 px-4 pb-1 pt-3 sm:px-5 sm:pt-4">
              <div>
                <h2 id={titleId} className="text-[1.15rem] font-semibold leading-tight tracking-[-0.03em]">{openPanel === "demo" ? "See how it works" : "Text me to start"}</h2>
                {openPanel === "demo" ? <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-600">A 20-second walkthrough—from your first text to a live material request.</p> : null}
              </div>
              <div className="flex items-center gap-1.5">
                {openPanel === "contact" ? <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-[#128c7e]" aria-label="Open chat on WhatsApp" title="WhatsApp"><WhatsAppIcon className="h-4 w-4" /></a> : null}
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpenPanel(null)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                  aria-label="Close contact options"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            {openPanel === "demo" ? (
              <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-6">
                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#171a20]">
                  <video ref={videoRef} className="h-full w-full object-contain" muted playsInline controls preload="metadata" poster="/videos/avantia-request-material-whatsapp-en-clear-20s-poster.jpg" aria-label="How to start an Avantia material request by text">
                    <source src="/videos/avantia-request-material-whatsapp-en-clear-20s.mp4" type="video/mp4" />
                  </video>
                </div>
                <button type="button" onClick={() => setOpenPanel("contact")} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#171a20] px-4 text-sm font-semibold text-white">Start my request</button>
              </div>
            ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] sm:px-5 sm:pb-4">
              {submitState === "submitting" ? (
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-teal-50 p-4" role="status" aria-live="polite">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#3e6ae1] text-white shadow-sm">
                    <Send className="h-4 w-4 animate-pulse" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-base font-bold">Got it — starting your text.</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-700">Your request was captured. Keep this window open for just a moment.</p>
                </div>
              ) : submitState === "success" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="mt-3 text-base font-bold">Check your texts</h3>
                  <p className="mt-1 text-xs leading-5 text-emerald-900">Avantia will send one starter message. Reply with what you need to begin.</p>
                  <button type="button" onClick={() => { setPhone(""); setSubmitState("idle"); }} className="mt-3 text-xs font-bold text-emerald-800 underline underline-offset-4">Use another number</button>
                </div>
              ) : (
                <form onSubmit={submitStartByText} className="rounded-xl border border-slate-200 bg-white p-3">
                  <label htmlFor={phoneId} className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                    <MessageSquareText className="h-4 w-4 text-[#0f766e]" aria-hidden="true" /> Text this number
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id={phoneId}
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phone}
                      onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
                      placeholder="(516) 555-0123"
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-[#fafbfc] px-3 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="submit"
                      disabled={!phone.trim()}
                      className="inline-flex min-h-11 min-w-24 items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] px-3 text-xs font-extrabold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Text me <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor={`${phoneId}-website`}>Website</label>
                    <input id={`${phoneId}-website`} name="website" tabIndex={-1} autoComplete="off" />
                  </div>

                  {submitState === "error" ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{errorMessage}</p> : null}
                </form>
              )}
              <div className="mt-1.5 h-[52svh] min-h-80 max-h-[30rem] overflow-hidden rounded-xl bg-[#071126]">
                <video ref={videoRef} data-testid="contact-sheet-video" className="h-full w-full object-contain" autoPlay muted loop playsInline preload="auto" poster="/videos/avantia-request-material-whatsapp-en-clear-20s-poster.jpg" aria-label="How to start an Avantia material request by text">
                  <source src="/videos/avantia-request-material-whatsapp-en-clear-20s.mp4" type="video/mp4" />
                </video>
              </div>
              <p className="mt-1 text-[8px] leading-3 text-slate-500">Text me = consent to request texts. Msg rates may apply. STOP to opt out. <Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link></p>
            </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
