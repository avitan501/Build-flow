"use client";

import { Languages, MessageCircle, PhoneCall, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

const conversationSteps = [
  { number: 1, label: "Introduction", english: ["Hi, this is Carlos.", "David Avitan asked me to call you."], spanish: ["Hola, soy Carlos.", "David Avitan me pidió que lo llamara."] },
  { number: 2, label: "Explain the service", english: ["I work with David.", "We help contractors get better prices on construction materials.", "Send me your list on WhatsApp, and I will compare prices for you."], spanish: ["Trabajo con David.", "Ayudamos a contratistas a conseguir mejores precios en materiales de construcción.", "Envíeme su lista por WhatsApp y compararé los precios por usted."] },
  { number: 3, label: "Ask what they need", english: ["What are you working on now?", "What materials do you need today, tomorrow, or this week?"], spanish: ["¿En qué está trabajando ahora?", "¿Qué materiales necesita hoy, mañana o esta semana?"] },
  { number: 4, label: "Move to messaging", english: ["I will send you my WhatsApp now.", "Please reply with the materials you need.", "Do you prefer WhatsApp or regular text?", "Great. I will see you there."], spanish: ["Le enviaré mi WhatsApp ahora.", "Por favor, respóndame con los materiales que necesita.", "¿Prefiere WhatsApp o mensaje de texto?", "Perfecto. Nos vemos allí."] },
];

export function ClientTargetCallGuide() {
  const [open, setOpen] = useState(false);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"><Languages className="h-4 w-4" />Open call guide</button>
    {open && typeof document !== "undefined" ? createPortal(
      <div className="fixed inset-0 z-[170] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="client-call-guide-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="my-auto w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 p-4 sm:p-5">
            <div className="flex gap-3"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white"><Languages className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold uppercase text-[#0066cc]">Client Target</p><h2 id="client-call-guide-title" className="mt-1 text-xl font-semibold">Carlos&apos;s conversation guide</h2><p className="mt-1 text-sm text-slate-500">English and Spanish stay together for each step.</p></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close call guide" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="h-5 w-5" /></button>
          </header>
          <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">
            <div className="hidden grid-cols-2 gap-4 px-3 text-xs font-semibold uppercase text-slate-500 md:grid"><span>English</span><span>Español</span></div>
            <ol className="mt-2 grid gap-3">{conversationSteps.map((step) => <li key={step.number} className="overflow-hidden rounded-md border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0071e3] text-xs font-bold text-white">{step.number}</span><h3 className="text-sm font-semibold">{step.label}</h3></div>
              <div className="grid md:grid-cols-2"><div className="p-3 md:border-r md:border-slate-200"><p className="mb-2 text-[11px] font-semibold uppercase text-[#0066cc] md:hidden">English</p>{step.english.map((line) => <p key={line} className="mb-1 text-base font-semibold leading-6">{line}</p>)}</div><div className="border-t border-slate-200 p-3 md:border-t-0" lang="es"><p className="mb-2 text-[11px] font-semibold uppercase text-[#0066cc] md:hidden">Español</p>{step.spanish.map((line) => <p key={line} className="mb-1 text-base font-semibold leading-6">{line}</p>)}</div></div>
            </li>)}</ol>
            <div className="mt-3 grid gap-3 rounded-md bg-slate-950 p-4 text-white sm:grid-cols-2"><div className="flex gap-2"><PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /><p className="text-sm leading-6"><strong>Keep the call short.</strong> Learn what they need and move to messaging.</p></div><div className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /><p className="text-sm leading-6"><strong>Send the message immediately.</strong> Ask the client to reply before ending the call.</p></div></div>
          </div>
        </section>
      </div>, document.body) : null}
  </>;
}
