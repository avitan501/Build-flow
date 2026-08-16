"use client";

import { Download, Mail, MessageCircle } from "lucide-react";

const CAMPAIGN_URL = "https://build.avantiap.com/beat-a-quote";
const MESSAGE = `Already have a construction material quote? Send it to Avantia Build and we'll try to beat it. ${CAMPAIGN_URL}`;

export function CampaignFlyerActions() {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
        <Download className="h-4 w-4" />Save or print PDF
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#25D366] px-4 text-sm font-semibold text-white">
        <MessageCircle className="h-4 w-4" />WhatsApp
      </a>
      <a href={`mailto:?subject=${encodeURIComponent("Can Avantia beat your material quote?")}&body=${encodeURIComponent(MESSAGE)}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">
        <Mail className="h-4 w-4" />Email
      </a>
    </div>
  );
}
