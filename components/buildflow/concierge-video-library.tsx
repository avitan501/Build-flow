"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Languages } from "lucide-react";
import { useEffect, useState } from "react";

import { ScrollFocusIsland } from "@/components/buildflow/scroll-focus-island";

type Language = "en" | "es";

const videos = [
  {
    slug: "crew-downtime",
    en: { title: "Keep the crew moving", body: "See how one materials request replaces repeated calls while the crew and payroll clock are running." },
    es: { title: "Mantenga la cuadrilla trabajando", body: "Vea cómo una solicitud reemplaza llamadas repetidas mientras la cuadrilla y el reloj siguen corriendo." },
  },
  {
    slug: "ai-takeoff",
    en: { title: "Turn plans into a material list", body: "AI-assisted takeoff prepares the list; our team verifies it; you review it before ordering." },
    es: { title: "Convierta planos en una lista", body: "La IA prepara el cómputo, nuestro equipo lo verifica y usted lo revisa antes de ordenar." },
  },
  {
    slug: "supplier-comparison",
    en: { title: "Compare supplier options", body: "Check pricing, availability, and practical alternatives without chasing each supplier yourself." },
    es: { title: "Compare opciones de proveedores", body: "Revise precios, disponibilidad y alternativas sin perseguir a cada proveedor." },
  },
  {
    slug: "personal-shopper",
    en: { title: "Find the hard-to-find item", body: "Send a photo, link, plan, or description. Avantia identifies the item and organizes the request." },
    es: { title: "Encuentre el artículo difícil", body: "Envíe una foto, enlace, plano o descripción. Avantia identifica y organiza la solicitud." },
  },
  {
    slug: "order-control",
    en: { title: "Review one organized order", body: "Quantities, specifications, address, and delivery notes stay together for one clear approval." },
    es: { title: "Revise una orden organizada", body: "Cantidades, especificaciones, dirección y notas de entrega quedan juntas para aprobar." },
  },
  {
    slug: "delivery-coordination",
    en: { title: "Coordinate the jobsite delivery", body: "The order is organized around where and when the materials are needed." },
    es: { title: "Coordine la entrega en obra", body: "La orden se organiza según dónde y cuándo se necesitan los materiales." },
  },
  {
    slug: "nationwide-sourcing",
    en: { title: "Source across 41 states", body: "Tell us the job location. Avantia looks for suitable supplier options near the project." },
    es: { title: "Consiga materiales en 41 estados", body: "Díganos dónde está la obra. Avantia busca opciones apropiadas cerca del proyecto." },
  },
] as const;

const pageCopy = {
  en: {
    language: "Español",
    back: "Back to homepage",
    eyebrow: "Construction Concierge",
    title: "Seven ways Avantia keeps material purchasing off your plate.",
    body: "Each short video explains one part of the service. Share the one that matches the contractor’s immediate problem.",
    action: "Start a material request",
    videoLabel: "Avantia Build marketing video",
  },
  es: {
    language: "English",
    back: "Volver al inicio",
    eyebrow: "Construction Concierge",
    title: "Siete maneras en que Avantia simplifica la compra de materiales.",
    body: "Cada video explica una parte del servicio. Comparta el que corresponda al problema inmediato del contratista.",
    action: "Iniciar solicitud de materiales",
    videoLabel: "Video de Avantia Build",
  },
} as const;

export function ConciergeVideoLibrary() {
  const [language, setLanguage] = useState<Language>("en");
  const text = pageCopy[language];

  useEffect(() => {
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = "en"; };
  }, [language]);

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-[#071126]">
      <section className="bg-[#071126] px-5 pb-14 pt-28 text-white sm:px-8 sm:pb-20 sm:pt-32">
        <div className="mx-auto max-w-[88rem]">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-white/80 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{text.back}</Link>
            <button type="button" onClick={() => setLanguage((current) => current === "en" ? "es" : "en")} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-3 text-xs font-bold text-[#071126]" aria-label={language === "en" ? "Ver página en español" : "View page in English"}><Languages className="h-4 w-4" aria-hidden="true" />{text.language}</button>
          </div>
          <p className="mt-14 text-xs font-bold uppercase tracking-[0.16em] text-sky-300">{text.eyebrow}</p>
          <h1 className="mt-3 max-w-5xl text-4xl font-semibold leading-tight text-balance sm:text-6xl">{text.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-xl sm:leading-8">{text.body}</p>
        </div>
      </section>

      <section className="px-3 py-8 sm:px-5 sm:py-14" aria-label="Avantia marketing videos">
        <div className="mx-auto grid max-w-[88rem] gap-5 lg:grid-cols-2">
          {videos.map((video, index) => {
            const item = video[language];
            return (
              <ScrollFocusIsland key={video.slug} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_42px_rgba(7,17,38,.07)]">
                <div className="bg-[#071126] p-2.5">
                  <video className="aspect-video w-full rounded-xl object-cover" controls playsInline preload="metadata" poster={`/videos/marketing/${video.slug}-poster.jpg`} aria-label={`${text.videoLabel}: ${item.title}`}>
                    <source src={`/videos/marketing/${video.slug}.mp4`} type="video/mp4" />
                    <source src={`/videos/marketing/${video.slug}.webm`} type="video/webm" />
                    <track src={`/videos/marketing/${video.slug}.vtt`} kind="captions" srcLang="en" label="English" />
                  </video>
                </div>
                <div className="p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0066cc]">{String(index + 1).padStart(2, "0")}</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">{item.title}</h2><p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{item.body}</p></div>
              </ScrollFocusIsland>
            );
          })}
        </div>
      </section>

      <section className="bg-white px-5 py-12 text-center sm:px-8 sm:py-16"><h2 className="text-3xl font-semibold">{language === "es" ? "¿Listo para dejar de perseguir materiales?" : "Ready to stop chasing materials?"}</h2><Link href="/shop" className="mx-auto mt-6 inline-flex min-h-12 items-center gap-3 rounded-md bg-[#1877e8] px-6 text-sm font-bold text-white">{text.action}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></section>
    </main>
  );
}
