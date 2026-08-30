"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, ClipboardList, MessageCircle, MessageSquareText, PackageCheck, Send, ShieldCheck, X } from "lucide-react";
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

type SubmitState = "idle" | "submitting" | "success" | "recent" | "error";
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
    if (!pathname || showsPublicContactBar(pathname)) return;
    const frame = window.requestAnimationFrame(() => setOpenPanel(null));
    return () => window.cancelAnimationFrame(frame);
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
      const result = (await response.json().catch(() => null)) as { error?: string; delivery?: "sent" | "already_sent" | "processing" } | null;
      if (!response.ok) throw new Error(result?.error || "We couldn’t start the text. Please try again.");
      setSubmitState(result?.delivery === "already_sent" ? "recent" : "success");
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
        <div className="pointer-events-auto relative mx-auto flex w-full max-w-[36rem] items-center gap-1.5 overflow-hidden rounded-[1.15rem] border border-white/70 bg-[#071126]/95 p-1.5 text-white shadow-[0_16px_46px_rgba(7,17,38,0.32)] ring-1 ring-[#1d4ed8]/20 backdrop-blur-xl">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#13b8a6] via-[#35d0c2] to-[#2878ff]" aria-hidden="true" />
          <button type="button" onClick={() => openSheet("contact")} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.72rem] border border-white/15 bg-[#0d9488] text-white shadow-[0_7px_18px_rgba(13,148,136,0.32)] transition hover:bg-[#0f766e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Open chat">
            <MessageCircle className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
          </button>
          <span className="hidden min-w-0 pl-2 text-left sm:block">
            <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#67e8d5]">Avantia materials desk</span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-white/90">Send a list. Start the request.</span>
          </span>
          <button
            type="button"
            onClick={() => openSheet("contact")}
            className="group flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[0.72rem] bg-[#2878ff] px-3 text-xs font-extrabold text-white shadow-[0_8px_22px_rgba(40,120,255,0.35)] transition hover:bg-[#1766ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eead4] sm:flex-none sm:px-6 sm:text-sm"
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
            className="relative z-10 flex max-h-[94svh] w-full flex-col overflow-hidden rounded-t-[1.6rem] border border-white/80 bg-[#f5f7fa] text-[#071126] shadow-[0_-22px_64px_rgba(7,17,38,0.3)] sm:max-w-[38rem] sm:rounded-[1.6rem]"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
            <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#0f766e]">Avantia materials desk</p>
                <h2 id={titleId} className="mt-1 text-[1.35rem] font-bold leading-tight tracking-[-0.035em]">{openPanel === "demo" ? "See the full flow." : "Start with one text."}</h2>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">{openPanel === "demo" ? "From your first message to a trackable material request." : "Enter your number. We’ll text you now."}</p>
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
                <div className="rounded-2xl border border-[#b8d2ff] bg-[linear-gradient(135deg,#eef5ff_0%,#edfffb_100%)] p-4" role="status" aria-live="polite">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2878ff] text-white shadow-sm">
                    <Send className="h-4 w-4 animate-pulse" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-base font-bold">Sending your text now…</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-700">You can reply as soon as it arrives.</p>
                </div>
              ) : submitState === "success" || submitState === "recent" ? (
                <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm" role="status">
                  <div className="flex items-center gap-3 bg-[#e9fbf5] p-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-white"><Check className="h-5 w-5" aria-hidden="true" /></span>
                    <div><h3 className="text-base font-bold">{submitState === "recent" ? "Text already sent." : "Text sent."}</h3><p className="mt-0.5 text-xs text-emerald-900">{submitState === "recent" ? "Check your existing Avantia conversation." : "Open Messages and reply with your material list."}</p></div>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-slate-500">Example reply</p>
                    <p className="mt-1.5 rounded-xl bg-[#071126] px-3 py-2.5 text-xs font-semibold leading-5 text-white">50 sheets 5/8 regular Sheetrock<br />45 pcs 2x4x8</p>
                    <ol className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[9px] font-bold leading-3 text-slate-600">
                      <li className="rounded-lg bg-slate-50 px-1 py-2"><Check className="mx-auto mb-1 h-3.5 w-3.5 text-[#0d9488]" />Text sent</li>
                      <li className="rounded-lg bg-slate-50 px-1 py-2"><MessageSquareText className="mx-auto mb-1 h-3.5 w-3.5 text-[#2878ff]" />Reply with list</li>
                      <li className="rounded-lg bg-slate-50 px-1 py-2"><PackageCheck className="mx-auto mb-1 h-3.5 w-3.5 text-[#2878ff]" />Track request</li>
                    </ol>
                    <button type="button" onClick={() => { setPhone(""); setSubmitState("idle"); }} className="mt-3 text-xs font-bold text-[#0f766e] underline underline-offset-4">Use another number</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitStartByText} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <label htmlFor={phoneId} className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                    <MessageSquareText className="h-4 w-4 text-[#0f766e]" aria-hidden="true" /> Where should we text you?
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
                      className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-[#fafbfc] px-3 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#2878ff] focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="submit"
                      disabled={!phone.trim()}
                      className="inline-flex min-h-12 min-w-24 items-center justify-center gap-1.5 rounded-xl bg-[#2878ff] px-3 text-xs font-extrabold text-white shadow-[0_8px_18px_rgba(40,120,255,0.24)] transition hover:bg-[#1766ed] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      Send text <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-[#0d9488]" aria-hidden="true" />No password. No app. Just reply to the text.</div>

                  <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                    <label htmlFor={`${phoneId}-website`}>Website</label>
                    <input id={`${phoneId}-website`} name="website" tabIndex={-1} autoComplete="off" />
                  </div>

                  {submitState === "error" ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">{errorMessage}</p> : null}
                </form>
              )}
              <div data-testid="contact-sheet-video-stage" className="relative mt-2 aspect-[4/5] w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#071126] shadow-[0_14px_32px_rgba(7,17,38,0.2)] sm:aspect-[5/4]">
                <video ref={videoRef} data-testid="contact-sheet-video" className="h-full w-full object-cover object-top" autoPlay muted loop playsInline preload="auto" poster="/videos/avantia-request-material-whatsapp-en-clear-20s-poster.jpg" aria-label="How to start an Avantia material request by text">
                  <source src="/videos/avantia-request-material-whatsapp-en-clear-20s.mp4" type="video/mp4" />
                </video>
                <span className="pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#071126]/80 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur"><ClipboardList className="h-3 w-3 text-[#5eead4]" />20-sec walkthrough</span>
              </div>
              <p className="mt-1.5 text-center text-[8px] leading-3 text-slate-500">By sending, you agree to request texts. Msg rates may apply. STOP to opt out. <Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link></p>
            </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
