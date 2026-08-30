"use client";

import { Download, Mail, MessageCircle } from "lucide-react";
import { BEAT_QUOTE_CAMPAIGN_MESSAGE } from "@/lib/campaign-messages";

export function CampaignFlyerActions() {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
        <Download className="h-4 w-4" />Save or print PDF
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(BEAT_QUOTE_CAMPAIGN_MESSAGE)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#25D366] px-4 text-sm font-semibold text-white">
        <MessageCircle className="h-4 w-4" />WhatsApp
      </a>
      <a href={`mailto:?subject=${encodeURIComponent("Can Avantia beat your material quote?")}&body=${encodeURIComponent(BEAT_QUOTE_CAMPAIGN_MESSAGE)}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">
        <Mail className="h-4 w-4" />Email
      </a>
    </div>
  );
}
