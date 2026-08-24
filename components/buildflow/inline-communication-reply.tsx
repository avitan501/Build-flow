"use client";

import { Reply, Send } from "lucide-react";

const QUICK_REPLIES = [
  "Received, thank you.",
  "I need a few more details.",
  "I am checking current pricing.",
  "Everything is ready to proceed.",
] as const;

export function InlineCommunicationReply({ active, channel, feedback, message, pending, ready, recipient, onMessageChange, onOpen, onSend }: {
  active: boolean;
  channel: string;
  feedback: { tone: "success" | "error"; text: string } | null;
  message: string;
  pending: boolean;
  ready: boolean;
  recipient: string;
  onMessageChange: (message: string) => void;
  onOpen: () => void;
  onSend: () => void;
}) {
  if (!active) {
    return <button type="button" onClick={onOpen} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800"><Reply className="h-3.5 w-3.5" />Reply</button>;
  }

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {QUICK_REPLIES.map((reply) => <button key={reply} type="button" onClick={() => onMessageChange(reply)} className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">{reply}</button>)}
      </div>
      <textarea value={message} onChange={(event) => onMessageChange(event.target.value)} rows={3} maxLength={1600} placeholder="Write your reply" className="mt-1 w-full resize-none rounded-md border border-slate-300 p-3 text-sm leading-6" />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold capitalize text-slate-500">Reply by {channel}</span>
        <button type="button" onClick={onSend} disabled={pending || !ready || !recipient.trim() || !message.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" />{pending ? "Sending..." : "Send reply"}</button>
      </div>
      {feedback ? <p className={`mt-2 text-xs font-semibold ${feedback.tone === "success" ? "text-emerald-700" : "text-rose-700"}`} role="status">{feedback.text}</p> : null}
    </div>
  );
}
