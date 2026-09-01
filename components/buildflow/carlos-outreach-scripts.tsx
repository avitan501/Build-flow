"use client";

import { Check, ChevronDown, Copy, Handshake, PhoneCall } from "lucide-react";
import { useState, type ReactNode } from "react";

type ScriptHighlight = { text: string; tone: "blue" | "amber" | "green" };
type ScriptStep = { label: string; text: string; highlights: readonly ScriptHighlight[] };

const SUPPLIER_STEPS = [
  {
    label: "Opening",
    text: "Hi, this is Carlos with Avantia Build. We have local contractors buying construction materials, and we need a supplier we can send quote requests to. Who handles contractor quotes at your company?",
    highlights: [
      { text: "Avantia Build", tone: "blue" },
      { text: "local contractors", tone: "green" },
      { text: "a supplier we can send quote requests to", tone: "amber" },
    ],
  },
  {
    label: "Simple question",
    text: "When we have a job that matches what you sell, can I email you the material list for pricing and delivery availability?",
    highlights: [
      { text: "email you the material list", tone: "blue" },
      { text: "pricing and delivery availability", tone: "amber" },
    ],
  },
  {
    label: "Get the details",
    text: "Great. What is the best email, which materials should we contact you for, and where do you deliver?",
    highlights: [
      { text: "best email", tone: "blue" },
      { text: "which materials", tone: "amber" },
      { text: "where do you deliver", tone: "green" },
    ],
  },
] as const;

const CONTRACTOR_STEPS = [
  {
    label: "Opening",
    text: "Hi, this is Carlos from Avantia Build. We help contractors compare material quotes and delivery options. If you have a current supplier quote or material list, send it to us and we'll check whether another supplier can offer a better overall option. There's no obligation. What materials are you buying this week?",
    highlights: [
      { text: "Avantia Build", tone: "blue" },
      { text: "compare material quotes and delivery options", tone: "green" },
      { text: "current supplier quote or material list", tone: "amber" },
      { text: "There's no obligation", tone: "blue" },
      { text: "What materials are you buying this week?", tone: "green" },
    ],
  },
  {
    label: "If interested",
    text: "I'll text you the upload link. You can send a PDF, screenshot, or photo of the quote.",
    highlights: [
      { text: "upload link", tone: "blue" },
      { text: "PDF, screenshot, or photo", tone: "amber" },
    ],
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

function HighlightedScript({ step }: { step: ScriptStep }) {
  const colors = {
    blue: "bg-sky-100 text-sky-950",
    amber: "bg-amber-100 text-amber-950",
    green: "bg-emerald-100 text-emerald-950",
  } as const;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  step.highlights.forEach((highlight, index) => {
    const start = step.text.indexOf(highlight.text, cursor);
    if (start < 0) return;
    if (start > cursor) nodes.push(step.text.slice(cursor, start));
    nodes.push(<mark key={`${highlight.text}-${index}`} className={`rounded px-1 py-0.5 font-bold ${colors[highlight.tone]}`}>{highlight.text}</mark>);
    cursor = start + highlight.text.length;
  });
  if (cursor < step.text.length) nodes.push(step.text.slice(cursor));
  return <p className="text-xs leading-6 text-slate-700">{nodes}</p>;
}

function ScriptBlock({
  title,
  steps,
  record,
  tone,
}: {
  title: string;
  steps: ReadonlyArray<ScriptStep>;
  record: string;
  tone: "sky" | "amber";
}) {
  const accent = tone === "amber" ? "text-amber-700" : "text-sky-700";
  return (
    <details className="group overflow-hidden rounded-md border border-slate-200 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2">
        {tone === "amber" ? <Handshake className="h-4 w-4 text-amber-600" /> : <PhoneCall className="h-4 w-4 text-sky-600" />}
        <h4 className="min-w-0 flex-1 text-xs font-bold text-slate-950">{title}</h4>
        <span className="text-[10px] font-semibold text-slate-400">{steps.length} steps</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {steps.map((step) => (
          <div key={step.label} className="grid gap-1.5 px-3 py-2.5 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-start sm:gap-3">
            <p className={`pt-1 text-[9px] font-bold uppercase tracking-[.12em] ${accent}`}>{step.label}</p>
            <HighlightedScript step={step} />
            <CopyScriptButton text={step.text} />
          </div>
        ))}
      </div>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] leading-4 text-slate-500"><strong className="text-slate-700">Record:</strong> {record}</p>
    </details>
  );
}

export function SupplierRelationshipScripts() {
  return (
    <div className="mb-3 grid gap-3">
      <ScriptBlock title="Supplier call" steps={SUPPLIER_STEPS} tone="amber" record="contact name · email · trade · delivery area · minimum · contractor pricing" />
    </div>
  );
}

export function ContractorCallScript() {
  return (
    <div className="mb-3">
      <ScriptBlock title="Contractor call" steps={CONTRACTOR_STEPS} tone="sky" record="name · phone · material needed · quote/list received · next follow-up" />
    </div>
  );
}
