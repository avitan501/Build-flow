"use client";

import Link from "next/link";
import { ArrowRight, Check, PackageCheck, Pause, Play, Search, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CoverageScrollSection } from "@/components/buildflow/coverage-scroll-section";
import { ScrollFocusIsland } from "@/components/buildflow/scroll-focus-island";
import { ShopBrandShowcase } from "@/components/buildflow/shop-brand-showcase";
import { HomepageShopPicker } from "@/components/buildflow/homepage-shop-picker";
import { SHOP_TOOL_CATEGORIES } from "@/lib/shop-tools";

type Language = "en" | "es";

const copy = {
  en: {
    heroEyebrow: "Avantia Construction Concierge",
    headline: "Construction Materials, Priced and Delivered.",
    subline: "Send us your plans or material list. We compare suppliers, organize your order, and coordinate jobsite delivery.",
    order: "Start a Material Request",
    learn: "See How It Works",
    serviceEyebrow: "Full-service materials desk",
    serviceTitle: "One place for material pricing and delivery.",
    serviceBody: "Send a plan, list, photo, or product link. We organize the materials, compare supplier options, and prepare the order for your approval.",
    servicePoints: ["AI-assisted takeoff", "Human verification", "Supplier comparison", "Jobsite coordination"],
    problemEyebrow: "Built for the way contractors work",
    problemTitle: "Less purchasing work. More building.",
    problems: [
      { title: "Keep the crew moving", body: "Reduce material downtime and repeated supplier calls." },
      { title: "Buy with better information", body: "Compare price, availability, and practical alternatives." },
      { title: "Control the final order", body: "Review the list and approve before anything is ordered." },
    ],
    stepsEyebrow: "One coordinated workflow",
    stepsTitle: "Send it once. Follow one clear order.",
    steps: ["Send plans or a list", "Review the takeoff", "Compare supplier options", "Approve the order", "Coordinate delivery"],
    brands: "Shop Our Brands",
    departments: "Order by department",
    departmentsBody: "Choose common materials or send a custom request.",
  },
  es: {
    heroEyebrow: "Avantia Concierge de Construcción",
    headline: "Materiales cotizados y entregados.",
    subline: "Envíenos sus planos o lista de materiales. Comparamos proveedores, organizamos su pedido y coordinamos la entrega en la obra.",
    order: "Iniciar solicitud",
    learn: "Ver cómo funciona",
    serviceEyebrow: "Su departamento de materiales",
    serviceTitle: "Un solo lugar para precios y entrega de materiales.",
    serviceBody: "Envíe un plano, lista, foto o enlace. Organizamos los materiales, comparamos proveedores y preparamos el pedido para su aprobación.",
    servicePoints: ["Cómputo asistido por IA", "Verificación humana", "Comparación de proveedores", "Coordinación en obra"],
    problemEyebrow: "Creado para contratistas",
    problemTitle: "Menos compras. Más construcción.",
    problems: [
      { title: "Mantenga la cuadrilla trabajando", body: "Reduzca esperas por materiales y llamadas repetidas." },
      { title: "Compre con mejor información", body: "Compare precio, disponibilidad y alternativas prácticas." },
      { title: "Controle la orden final", body: "Revise la lista y apruebe antes de realizar el pedido." },
    ],
    stepsEyebrow: "Un proceso coordinado",
    stepsTitle: "Envíelo una vez. Siga una orden clara.",
    steps: ["Envíe planos o lista", "Revise el cómputo", "Compare proveedores", "Apruebe la orden", "Coordine la entrega"],
    brands: "Marcas que conseguimos",
    departments: "Ordene por departamento",
    departmentsBody: "Elija materiales comunes o envíe una solicitud especial.",
  },
} as const;

const problemIcons = [Truck, Search, PackageCheck] as const;
const HOMEPAGE_STORY_LOOP_END = 12.25;

export function ConstructionConciergeHome() {
  const [language, setLanguage] = useState<Language>("en");
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [showHeroActions, setShowHeroActions] = useState(false);
  const [showStickyOrder, setShowStickyOrder] = useState(false);
  const heroMobileVideoRef = useRef<HTMLVideoElement>(null);
  const heroDesktopVideoRef = useRef<HTMLVideoElement>(null);
  const text = copy[language];

  useEffect(() => {
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = "en"; };
  }, [language]);

  useEffect(() => {
    const actionTimer = setTimeout(() => setShowHeroActions(true), 2000);
    return () => clearTimeout(actionTimer);
  }, []);

  useEffect(() => {
    const updateStickyOrder = () => setShowStickyOrder(window.scrollY > window.innerHeight * 0.7);
    updateStickyOrder();
    window.addEventListener("scroll", updateStickyOrder, { passive: true });
    return () => window.removeEventListener("scroll", updateStickyOrder);
  }, []);

  function toggleHeroVideo() {
    const video = window.matchMedia("(max-width: 639px)").matches ? heroMobileVideoRef.current : heroDesktopVideoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setHeroPlaying(true);
    } else {
      video.pause();
      setHeroPlaying(false);
    }
  }

  function loopHomepageStory(event: React.SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    if (video.currentTime < HOMEPAGE_STORY_LOOP_END) return;
    video.currentTime = 0;
    void video.play();
  }

  return (
    <main className="overflow-x-clip bg-[#f4f5f7] pb-20 text-[#071126] sm:pb-0">
      <section className="relative isolate flex min-h-[min(88svh,56rem)] items-start justify-center overflow-hidden bg-[#071126] text-white">
        <video ref={heroMobileVideoRef} className="absolute inset-0 -z-20 h-full w-full object-cover object-bottom sm:hidden" autoPlay muted loop playsInline preload="metadata" poster="/videos/avantia-hero-background-v13-mobile-poster.png" onPlaying={() => setHeroPlaying(true)} onTimeUpdate={loopHomepageStory} data-loop-end={HOMEPAGE_STORY_LOOP_END} aria-label="Construction material ordering, delivery, and jobsite work">
          <source src="/videos/avantia-hero-background-v13-mobile.webm" type="video/webm" />
          <source src="/videos/avantia-hero-background-v13-mobile.mp4" type="video/mp4" />
        </video>
        <video ref={heroDesktopVideoRef} className="absolute inset-0 -z-20 hidden h-full w-full object-cover sm:block" autoPlay muted loop playsInline preload="metadata" poster="/videos/avantia-hero-background-v13-desktop-poster.png" onPlaying={() => setHeroPlaying(true)} onTimeUpdate={loopHomepageStory} data-loop-end={HOMEPAGE_STORY_LOOP_END} aria-label="Construction material ordering, delivery, and jobsite work">
          <source src="/videos/avantia-hero-background-v13-desktop.webm" type="video/webm" />
          <source src="/videos/avantia-hero-background-v13-desktop.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,17,38,.34)_0%,rgba(7,17,38,.04)_48%,rgba(7,17,38,.4)_100%)]" aria-hidden="true" />

        <button type="button" onClick={() => setLanguage((current) => current === "en" ? "es" : "en")} className="absolute right-4 top-20 z-10 inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[10px] font-bold uppercase text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-8 sm:top-24" aria-label={language === "en" ? "Ver página en español" : "View page in English"}>
          {language === "en" ? "ES" : "EN"}
        </button>

        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-24 pt-32 text-center sm:px-8 sm:pt-28">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/82 sm:text-xs">{text.heroEyebrow}</p>
          <h1 className="mt-2 max-w-2xl text-[1.4rem] font-semibold leading-tight text-balance sm:text-[2.6rem]">{text.headline}</h1>
          <p className="mt-2 max-w-xl text-xs font-medium leading-5 text-white/88 sm:text-base sm:leading-6">{text.subline}</p>
          <div className="mt-5 min-h-11 w-full max-w-lg sm:mt-6">
            {showHeroActions ? (
              <div className="grid grid-cols-2 gap-3 motion-safe:animate-[hero-actions-in_.45s_ease-out_both]">
                <Link href="/shop" className="inline-flex min-h-11 items-center justify-center rounded bg-[#1877e8] px-2 text-[11px] font-semibold text-white shadow-lg transition hover:bg-[#0d68d5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 min-[390px]:text-xs sm:min-h-12 sm:px-4 sm:text-sm">{text.order}</Link>
                <Link href="/how-it-works" className="inline-flex min-h-11 items-center justify-center rounded bg-white/94 px-2 text-[11px] font-semibold text-[#071126] shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 min-[390px]:text-xs sm:min-h-12 sm:px-4 sm:text-sm">{text.learn}</Link>
              </div>
            ) : null}
          </div>
        </div>

        <button type="button" onClick={toggleHeroVideo} className="absolute bottom-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/36 text-white/90 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:bottom-5 sm:right-5" aria-label={heroPlaying ? "Pause background video" : "Play background video"}>
          {heroPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        </button>
      </section>

      <section className="bg-[#f5f5f7] px-4 py-5 sm:px-8 sm:py-8 lg:px-10" aria-label="Avantia builder shop">
        <div className="mx-auto w-full max-w-7xl">
          <HomepageShopPicker projects={[]} categories={SHOP_TOOL_CATEGORIES} isSignedIn={false} homepageCompact />
        </div>
      </section>

      <section className="px-3 py-8 sm:px-5 sm:py-14" aria-labelledby="full-service-heading">
        <div className="mx-auto max-w-[88rem]">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0066cc]">{text.serviceEyebrow}</p>
            <h2 id="full-service-heading" className="mt-3 text-3xl font-semibold leading-tight text-balance sm:text-5xl">{text.serviceTitle}</h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-lg sm:leading-8">{text.serviceBody}</p>
          </div>
          <div className="mx-auto mt-7 grid max-w-5xl grid-cols-2 gap-2 sm:mt-9 sm:grid-cols-4">
            {text.servicePoints.map((point) => <div key={point} className="flex min-h-12 items-center gap-2 rounded-md bg-white px-3 text-xs font-bold shadow-sm sm:text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{point}</div>)}
          </div>
        </div>
      </section>

      <ShopBrandShowcase compact transparent title={text.brands} />

      <section className="border-y border-slate-200 bg-white px-3 py-10 sm:px-5 sm:py-16" aria-labelledby="contractor-value-heading">
        <div className="mx-auto max-w-[88rem]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0066cc]">{text.problemEyebrow}</p>
          <h2 id="contractor-value-heading" className="mt-2 text-3xl font-semibold text-balance sm:text-5xl">{text.problemTitle}</h2>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {text.problems.map((problem, index) => {
              const Icon = problemIcons[index];
              return <ScrollFocusIsland key={problem.title} className="h-full rounded-[18px] border border-slate-200 bg-[#f6f7f9] p-5 sm:p-7"><Icon className="h-7 w-7 text-[#0066cc]" aria-hidden="true" /><h3 className="mt-7 text-xl font-bold sm:text-2xl">{problem.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{problem.body}</p></ScrollFocusIsland>;
            })}
          </div>
        </div>
      </section>

      <section className="px-3 py-10 sm:px-5 sm:py-14" aria-labelledby="concierge-steps-heading">
        <div className="mx-auto max-w-[88rem]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0066cc]">{text.stepsEyebrow}</p>
          <h2 id="concierge-steps-heading" className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">{text.stepsTitle}</h2>
          <ScrollFocusIsland className="mt-6">
            <ol className="grid grid-cols-5 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-200">
              {text.steps.map((step, index) => <li key={step} className="min-w-0 bg-white px-1.5 py-4 text-center sm:px-4 sm:py-6 sm:text-left"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-xs font-extrabold text-[#0066cc]">{index + 1}</span><p className="mt-2 text-[10px] font-bold leading-4 sm:text-sm">{step}</p></li>)}
            </ol>
          </ScrollFocusIsland>
        </div>
      </section>

      <CoverageScrollSection language={language} />

      {showStickyOrder ? <Link href="/shop" className="fixed bottom-4 left-1/2 z-40 inline-flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-md bg-[#1877e8] px-6 text-sm font-bold text-white shadow-[0_10px_30px_rgba(7,17,38,.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 sm:hidden">Start Order<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link> : null}
      <style jsx global>{`
        @keyframes hero-actions-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
