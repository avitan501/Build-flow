import { ArrowLeft, Languages, MessageCircle, PhoneCall } from "lucide-react";
import Link from "next/link";

import { requireManagerPortalProfile } from "@/lib/auth";

const conversationSteps = [
  {
    number: 1,
    label: "Introduction",
    english: ["Hi, this is Carlos.", "David Avitan asked me to call you."],
    spanish: ["Hola, soy Carlos.", "David Avitan me pidió que lo llamara."],
  },
  {
    number: 2,
    label: "Explain the service",
    english: [
      "I work with David.",
      "We help contractors get better prices on construction materials.",
      "Send me your list on WhatsApp, and I will compare prices for you.",
    ],
    spanish: [
      "Trabajo con David.",
      "Ayudamos a contratistas a conseguir mejores precios en materiales de construcción.",
      "Envíeme su lista por WhatsApp y compararé los precios por usted.",
    ],
  },
  {
    number: 3,
    label: "Ask what they need",
    english: ["What are you working on now?", "What materials do you need today, tomorrow, or this week?"],
    spanish: ["¿En qué está trabajando ahora?", "¿Qué materiales necesita hoy, mañana o esta semana?"],
  },
  {
    number: 4,
    label: "Move to messaging",
    english: [
      "I will send you my WhatsApp now.",
      "Please reply with the materials you need.",
      "Do you prefer WhatsApp or regular text?",
      "Great. I will see you there.",
    ],
    spanish: [
      "Le enviaré mi WhatsApp ahora.",
      "Por favor, respóndame con los materiales que necesita.",
      "¿Prefiere WhatsApp o mensaje de texto?",
      "Perfecto. Nos vemos allí.",
    ],
  },
];

export default async function ClientTargetConversationPage() {
  const { access } = await requireManagerPortalProfile();
  const backHref = access.owner ? "/admin/goals-progress" : "/admin/users";
  const backLabel = access.owner ? "Back to Goals & Progress" : "Back to Customers";

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-6 text-slate-950 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href={backHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <header className="mt-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white"><Languages className="h-5 w-5" /></span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Client Target</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal sm:text-4xl">Carlos&apos;s conversation guide</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Follow the four steps in order. English and Spanish stay together so the same message is delivered in either language.</p>
        </header>

        <div className="mt-6 hidden grid-cols-2 gap-4 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
          <span>English</span>
          <span>Español</span>
        </div>

        <ol className="mt-3 grid gap-4">
          {conversationSteps.map((step) => (
            <li key={step.number} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-xs font-bold text-white">{step.number}</span>
                <h2 className="text-sm font-semibold">{step.label}</h2>
              </div>
              <div className="grid md:grid-cols-2">
                <div className="p-4 md:border-r md:border-slate-200">
                  <p className="mb-2 text-[11px] font-semibold uppercase text-[#0066cc] md:hidden">English</p>
                  <div className="grid gap-2">
                    {step.english.map((line) => <p key={line} className="text-lg font-semibold leading-7 text-slate-900">{line}</p>)}
                  </div>
                </div>
                <div className="border-t border-slate-200 p-4 md:border-t-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase text-[#0066cc] md:hidden">Español</p>
                  <div lang="es" className="grid gap-2">
                    {step.spanish.map((line) => <p key={line} className="text-lg font-semibold leading-7 text-slate-900">{line}</p>)}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-5 grid gap-3 rounded-lg bg-slate-950 p-5 text-white sm:grid-cols-2">
          <div className="flex gap-3"><PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" /><div><h2 className="text-sm font-semibold">Keep the call short</h2><p className="mt-1 text-sm leading-6 text-slate-300">The goal is to learn what they need and move the conversation to WhatsApp or text.</p></div></div>
          <div className="flex gap-3"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><h2 className="text-sm font-semibold">Send the message immediately</h2><p className="mt-1 text-sm leading-6 text-slate-300">Before ending the call, send the first message and ask the client to reply.</p></div></div>
        </section>
      </div>
    </main>
  );
}
