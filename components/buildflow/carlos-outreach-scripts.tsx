"use client";

import { Check, Copy, Handshake, PhoneCall } from "lucide-react";
import { useState } from "react";

const SUPPLIER_STEPS = [
  {
    label: "Opening",
    text: "Hi, this is Carlos with Avantia Build. We have local contractors buying construction materials, and we need a supplier we can send quote requests to. Who handles contractor quotes at your company?",
  },
  {
    label: "Simple question",
    text: "When we have a job that matches what you sell, can I email you the material list for pricing and delivery availability?",
  },
  {
    label: "Get the details",
    text: "Great. What is the best email, which materials should we contact you for, and where do you deliver?",
  },
] as const;

const CONTRACTOR_STEPS = [
  {
    label: "Opening",
    text: "Hi, this is Carlos from Avantia Build. We help contractors compare material quotes and delivery options. If you have a current supplier quote or material list, send it to us and we'll check whether another supplier can offer a better overall option. There's no obligation. What materials are you buying this week?",
  },
  {
    label: "If interested",
    text: "I'll text you the upload link. You can send a PDF, screenshot, or photo of the quote.",
  },
] as const;

function CopyScriptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:border-sky-300"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ScriptBlock({
  title,
  steps,
  record,
  tone,
}: {
  title: string;
  steps: ReadonlyArray<{ label: string; text: string }>;
  record: string;
  tone: "sky" | "amber";
}) {
  const accent = tone === "amber" ? "text-amber-700" : "text-sky-700";
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <header className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        {tone === "amber" ? <Handshake className="h-4 w-4 text-amber-600" /> : <PhoneCall className="h-4 w-4 text-sky-600" />}
        <h4 className="text-xs font-bold text-slate-950">{title}</h4>
      </header>
      <div className="grid gap-2 p-2.5 lg:grid-cols-3">
        {steps.map((step) => (
          <div key={step.label} className="flex flex-col rounded-md bg-slate-50 p-3">
            <p className={`text-[9px] font-bold uppercase tracking-[.12em] ${accent}`}>{step.label}</p>
            <p className="mt-1.5 flex-1 text-xs leading-5 text-slate-700">{step.text}</p>
            <div className="mt-2"><CopyScriptButton text={step.text} /></div>
          </div>
        ))}
      </div>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] leading-4 text-slate-500"><strong className="text-slate-700">Record:</strong> {record}</p>
    </section>
  );
}

export function SupplierRelationshipScripts() {
  return (
    <div className="mb-3 grid gap-3">
      <ScriptBlock title="Supplier call" steps={SUPPLIER_STEPS} tone="amber" record="contact name · email · trade · delivery area · minimum · contractor pricing" />
      <ScriptBlock title="Contractor call" steps={CONTRACTOR_STEPS} tone="sky" record="name · phone · material needed · quote/list received · next follow-up" />
    </div>
  );
}
