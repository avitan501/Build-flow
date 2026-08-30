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
  const consentId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
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
    if (openPanel === "demo") {
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
          consent,
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
        <div className="pointer-events-auto mx-auto flex min-h-14 w-full max-w-[34rem] items-center gap-2 rounded-[1.15rem] border border-slate-200/90 bg-white/95 p-1.5 text-[#171a20] shadow-[0_10px_34px_rgba(23,26,32,0.16)] backdrop-blur-xl">
          <button type="button" onClick={() => openSheet("contact")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.72rem] border border-slate-200 bg-[#f4f4f4] text-[#171a20] transition hover:bg-[#e9e9e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1]" aria-label="Open chat options">
            <MessageCircle className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openSheet("contact")}
            className="group flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[0.72rem] border border-slate-200 bg-white px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3e6ae1]"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            Start a material request <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
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
            className="relative z-10 flex h-[min(78svh,40rem)] w-full flex-col overflow-hidden rounded-t-[1.35rem] border border-slate-200 bg-[#f7f7f7] text-[#171a20] shadow-[0_-18px_50px_rgba(23,26,32,0.22)] sm:max-w-[31rem] sm:rounded-[1.35rem]"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
            <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Avantia Build</p>
                <h2 id={titleId} className="mt-1 text-[1.5rem] font-semibold leading-tight tracking-[-0.035em]">{openPanel === "demo" ? "See how it works." : "Start with one message."}</h2>
                <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-600">{openPanel === "demo" ? "A 20-second walkthrough—from your first text to a live material request." : "Send a list, photo, plan, link, or quote. We’ll ask only for the details still needed."}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpenPanel(null)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                aria-label="Close contact options"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
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
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-6">

              {submitState === "success" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="mt-3 text-base font-bold">Check your texts</h3>
                  <p className="mt-1 text-xs leading-5 text-emerald-900">Avantia will send one starter message. Reply with what you need to begin.</p>
                  <button type="button" onClick={() => { setPhone(""); setConsent(false); setSubmitState("idle"); }} className="mt-3 text-xs font-bold text-emerald-800 underline underline-offset-4">Use another number</button>
                </div>
              ) : (
                <form onSubmit={submitStartByText} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <label htmlFor={phoneId} className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                    <MessageSquareText className="h-4 w-4 text-[#d45708]" aria-hidden="true" /> Mobile number
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
                      className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-[#fafbfc] px-3 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#ff7a1a] focus:ring-4 focus:ring-orange-100"
                    />
                    <button
                      type="submit"
                      disabled={!phone.trim() || !consent || submitState === "submitting"}
                      className="inline-flex min-h-12 min-w-24 items-center justify-center gap-1.5 rounded-xl bg-[#071126] px-3 text-xs font-extrabold text-white transition hover:bg-[#10233f] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {submitState === "submitting" ? "Sending…" : <>Text me <Send className="h-3.5 w-3.5" aria-hidden="true" /></>}
                    </button>
                  </div>

                  <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor={`${phoneId}-website`}>Website</label>
                    <input id={`${phoneId}-website`} name="website" tabIndex={-1} autoComplete="off" />
                  </div>

                  <label htmlFor={consentId} className="mt-3 flex cursor-pointer items-start gap-2.5 text-[10px] leading-4 text-slate-600">
                    <input
                      id={consentId}
                      name="consent"
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff6a00]"
                    />
                    <span>
                      I agree to receive texts from Avantia Build about my material request. Message and data rates may apply. Reply STOP to opt out. See our <Link href="/terms" className="font-bold text-slate-800 underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="font-bold text-slate-800 underline underline-offset-2">Privacy Policy</Link>.
                    </span>
                  </label>

                  {submitState === "error" ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{errorMessage}</p> : null}
                </form>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setOpenPanel("demo")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800"><Play className="h-4 w-4" aria-hidden="true" /> 20-sec demo</button>
                <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800" aria-label="Open chat on WhatsApp"><WhatsAppIcon className="h-4 w-4 text-[#128c7e]" /> WhatsApp</a>
              </div>
            </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
