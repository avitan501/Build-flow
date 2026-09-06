"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  MessageCircle,
  MessageSquareText,
  Play,
  Send,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

export const PUBLIC_CONTACT_BAR_PATHS = new Set([
  "/",
  "/how-it-works",
  "/shop",
]);

export function showsPublicContactBar(pathname: string) {
  return PUBLIC_CONTACT_BAR_PATHS.has(pathname);
}

type SubmitState =
  | "idle"
  | "submitting"
  | "processing"
  | "partial"
  | "success"
  | "recent"
  | "error";
type OpenPanel = "contact" | "demo" | null;

const demoVideos = [
  {
    title: "Start with one text",
    note: "Enter your number and reply with the materials you need.",
    src: "/videos/avantia-request-material-whatsapp-en-clear-20s.mp4",
    poster:
      "/videos/avantia-request-material-whatsapp-en-clear-20s-poster.jpg",
  },
  {
    title: "Send the material list",
    note: "A list, photo, plan, product link, or supplier quote can start the request.",
    src: "/videos/avantia-story/01-contractor-request.mp4",
    poster: "/videos/avantia-story/01-contractor-request-poster.jpg",
  },
  {
    title: "Keep the crew moving",
    note: "We organize the request while your team stays focused on the job.",
    src: "/videos/avantia-story/02-contractor-crew-moving.mp4",
    poster: "/videos/avantia-story/02-contractor-crew-moving-poster.jpg",
  },
  {
    title: "Compare suppliers",
    note: "Avantia finds practical supplier options for the reviewed materials.",
    src: "/videos/avantia-story/03-supplier-partner-network.mp4",
    poster: "/videos/avantia-story/03-supplier-partner-network-poster.jpg",
  },
  {
    title: "Confirm the products",
    note: "You see the organized request before pricing or ordering moves forward.",
    src: "/videos/avantia-story/04-supplier-send-products.mp4",
    poster: "/videos/avantia-story/04-supplier-send-products-poster.jpg",
  },
  {
    title: "Coordinate delivery",
    note: "After pricing is confirmed, our team calls for payment and delivery details.",
    src: "/videos/avantia-story/05-designer-order-coordination.mp4",
    poster:
      "/videos/avantia-story/05-designer-order-coordination-poster.jpg",
  },
] as const;

function normalizePhoneInput(value: string) {
  return value.replace(/[^\d+() .-]/g, "").slice(0, 24);
}

function isValidUsPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return (
    digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))
  );
}

export function PublicContactBar() {
  const pathname = usePathname();
  const titleId = useId();
  const phoneId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const demoVideoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const startTextAttemptKeyRef = useRef<string | null>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [phone, setPhone] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [demoIndex, setDemoIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const open = openPanel !== null;
  const phoneIsValid = isValidUsPhone(phone);

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
    if (openPanel === "demo") {
      demoVideoRefs.current.forEach((video, index) => {
        if (!video) return;
        if (
          index === demoIndex &&
          videoPlaying &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
      return;
    }
    demoVideoRefs.current.forEach((video) => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    });
  }, [demoIndex, openPanel, videoPlaying]);

  if (!pathname || !showsPublicContactBar(pathname)) return null;

  function openSheet(panel: Exclude<OpenPanel, null> = "contact") {
    setSubmitState("idle");
    setErrorMessage("");
    setDemoIndex(0);
    startTextAttemptKeyRef.current = null;
    setVideoPlaying(
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setOpenPanel(panel);
  }

  async function requestStartByText(website = "") {
    if (submitState === "submitting") return;
    setSubmitState("submitting");
    setErrorMessage("");
    const idempotencyKey =
      startTextAttemptKeyRef.current || crypto.randomUUID();
    startTextAttemptKeyRef.current = idempotencyKey;
    try {
      const response = await fetch("/api/public/start-by-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          consent: true,
          website,
          idempotencyKey,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        delivery?: "sent" | "already_sent" | "processing" | "partial";
      } | null;
      if (!response.ok)
        throw new Error(
          result?.error || "We couldn’t start the text. Please try again.",
        );
      setSubmitState(
        result?.delivery === "already_sent"
          ? "recent"
          : result?.delivery === "sent"
            ? "success"
            : result?.delivery === "partial"
              ? "partial"
              : "processing",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t start the text. Please try again.",
      );
      setSubmitState("error");
    }
  }

  async function submitStartByText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await requestStartByText(String(form.get("website") || ""));
  }

  return (
    <>
      <div
        data-testid="public-contact-bar"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-4 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] sm:px-5 sm:pb-4"
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-[36rem] items-center gap-2 rounded-lg border border-[#d2d2d7] bg-white/95 p-2 text-[#1d1d1f] shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => openSheet("contact")}
            className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-md bg-[#34373d] text-white shadow-sm transition hover:bg-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
            aria-label="Open chat"
          >
            <MessageCircle
              className="h-[1.1rem] w-[1.1rem]"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => openSheet("contact")}
            className="group flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-[#c7c7cc] bg-[#f7f7f8] px-3 text-sm font-semibold text-[#34373d] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <MessageSquareText className="h-4 w-4 text-[#2878ff]" aria-hidden="true" /> Start
            by Text
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-5"
          role="presentation"
        >
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
            <div
              className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden"
              aria-hidden="true"
            />
            <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#0f766e]">
                  Avantia materials desk
                </p>
                <h2
                  id={titleId}
                  className="mt-1 text-[1.35rem] font-bold leading-tight tracking-[-0.035em]"
                >
                  {openPanel === "demo"
                    ? "See the full flow."
                    : "Send us your material list."}
                </h2>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
                  {openPanel === "demo"
                    ? "From your first message to a trackable material request."
                    : "We’ll text you immediately. Reply with a list, photo, plan, or quote."}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
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
              <div className="flex min-h-0 flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                <div
                  data-testid="demo-video-carousel"
                  className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onScroll={(event) => {
                    const track = event.currentTarget;
                    const cards = Array.from(
                      track.querySelectorAll<HTMLElement>(
                        "[data-demo-video-card]",
                      ),
                    );
                    const trackLeft = track.getBoundingClientRect().left;
                    const closest = cards.reduce(
                      (best, card, index) => {
                        const distance = Math.abs(
                          card.getBoundingClientRect().left - trackLeft - 20,
                        );
                        return distance < best.distance
                          ? { index, distance }
                          : best;
                      },
                      { index: 0, distance: Number.POSITIVE_INFINITY },
                    );
                    setDemoIndex(closest.index);
                  }}
                >
                  {demoVideos.map((video, index) => (
                    <article
                      key={video.src}
                      data-demo-video-card
                      className="relative h-full min-h-[28rem] w-[82vw] max-w-[29rem] shrink-0 snap-center overflow-hidden rounded-xl bg-[#171a20] shadow-[0_14px_36px_rgba(0,0,0,0.2)] sm:w-[27rem]"
                    >
                      <video
                        ref={(element) => {
                          demoVideoRefs.current[index] = element;
                        }}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        preload={index === 0 ? "auto" : "metadata"}
                        poster={video.poster}
                        aria-label={`${index + 1} of ${demoVideos.length}: ${video.title}`}
                      >
                        <source src={video.src} type="video/mp4" />
                      </video>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/20" />
                      <span className="absolute right-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-bold text-[#171a20] shadow-sm">
                        {index + 1}/{demoVideos.length}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <p className="text-2xl font-semibold tracking-[-0.03em]">
                          {video.title}
                        </p>
                        <p className="mt-1.5 max-w-sm text-xs font-medium leading-5 text-white/82">
                          {video.note}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5 py-2" aria-label="Video position">
                  {demoVideos.map((video, index) => (
                    <span
                      key={video.src}
                      className={`h-2 w-2 rounded-full transition ${index === demoIndex ? "bg-[#171a20]" : "bg-[#c7c7cc]"}`}
                    />
                  ))}
                </div>
                <div className="mx-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenPanel("contact")}
                    className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-md bg-[#34373d] text-white"
                    aria-label="Open text request"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenPanel("contact")}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-[#34373d] px-4 text-sm font-semibold text-white"
                  >
                    Start my request
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] sm:px-5 sm:pb-4">
                {submitState === "submitting" ? (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-[#b8d2ff] bg-[linear-gradient(135deg,#eef5ff_0%,#edfffb_100%)] p-4"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2878ff] text-white shadow-sm">
                      <Send
                        className="h-4 w-4 animate-pulse"
                        aria-hidden="true"
                      />
                    </span>
                    <div>
                      <h3 className="text-base font-bold">Starting your text…</h3>
                      <p className="mt-0.5 text-xs leading-5 text-slate-700">
                        Check Messages in a moment.
                      </p>
                    </div>
                  </div>
                ) : submitState === "success" ||
                  submitState === "recent" ||
                  submitState === "processing" ||
                  submitState === "partial" ? (
                  <div className="rounded-2xl border border-emerald-200 bg-[#f3fcf8] p-4 shadow-sm" role="status">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-white">
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold">
                          {submitState === "recent"
                            ? "Text already requested."
                            : submitState === "processing"
                              ? "Text request received."
                              : submitState === "partial"
                                ? "Welcome text sent."
                                : "Text sent."}
                        </h3>
                        <p className="mt-0.5 text-xs text-emerald-900">
                          {submitState === "recent"
                            ? "Check your existing Avantia conversation."
                            : submitState === "processing"
                              ? "We’re still sending it. Check Messages shortly."
                              : submitState === "partial"
                                ? "The welcome text was sent. Open Messages and reply with your list."
                                : "Check Messages, then reply with your material list."}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a href="sms:" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#0d9488] px-4 text-xs font-extrabold text-white shadow-sm">
                        Open Messages
                      </a>
                      {submitState === "partial" ? (
                        <button type="button" onClick={() => void requestStartByText()} className="inline-flex min-h-10 items-center rounded-xl border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-900">
                          Check status
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setPhone("");
                          startTextAttemptKeyRef.current = null;
                          setSubmitState("idle");
                        }}
                        className="inline-flex min-h-10 items-center px-2 text-xs font-bold text-[#0f766e] underline underline-offset-4"
                      >
                        Use another number
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={submitStartByText}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
                  >
                    <label
                      htmlFor={phoneId}
                      className="flex items-center gap-2 text-xs font-extrabold text-slate-800"
                    >
                      <MessageSquareText
                        className="h-4 w-4 text-[#0f766e]"
                        aria-hidden="true"
                      />{" "}
                      Mobile number
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
                        onChange={(event) => {
                          startTextAttemptKeyRef.current = null;
                          setPhone(normalizePhoneInput(event.target.value));
                        }}
                        aria-invalid={phone.length > 0 && !phoneIsValid}
                        placeholder="(516) 555-0123"
                        className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-[#fafbfc] px-3 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#2878ff] focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="submit"
                        disabled={!phoneIsValid}
                        className="inline-flex min-h-12 min-w-24 items-center justify-center gap-1.5 rounded-xl bg-[#2878ff] px-3 text-xs font-extrabold text-white shadow-[0_8px_18px_rgba(40,120,255,0.24)] transition hover:bg-[#1766ed] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                      >
                        Text me{" "}
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    {phone.length > 0 && !phoneIsValid ? (
                      <p className="mt-1.5 text-[10px] font-semibold text-rose-600">
                        Enter a 10-digit U.S. phone number.
                      </p>
                    ) : null}

                    <div
                      className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
                      aria-hidden="true"
                    >
                      <label htmlFor={`${phoneId}-website`}>Website</label>
                      <input
                        id={`${phoneId}-website`}
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </div>

                    {submitState === "error" ? (
                      <p
                        className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        role="alert"
                      >
                        {errorMessage}
                      </p>
                    ) : null}
                  </form>
                )}
                <button
                  type="button"
                  onClick={() => setOpenPanel("demo")}
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-[#071126] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2878ff]"
                >
                  <span className="inline-flex items-center gap-2"><Play className="h-3.5 w-3.5 text-[#2878ff]" aria-hidden="true" />Watch how it works</span>
                  <span className="text-[10px] font-semibold text-slate-500">20 sec</span>
                </button>
                <p className="mt-1.5 text-center text-[8px] leading-3 text-slate-500">
                  By sending, you agree to request texts. Msg rates may apply.
                  STOP to opt out.{" "}
                  <Link href="/terms" className="underline">
                    Terms
                  </Link>{" "}
                  ·{" "}
                  <Link href="/privacy" className="underline">
                    Privacy
                  </Link>
                </p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
