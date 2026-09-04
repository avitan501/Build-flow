"use client";

import { ArrowRight, Video } from "lucide-react";
import { useState } from "react";

type GoogleMeetLauncherProps = {
  variant?: "card" | "row";
};

export function GoogleMeetLauncher({ variant = "card" }: GoogleMeetLauncherProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function startMeeting() {
    if (busy) return;
    setBusy(true);
    setStatus("Creating a secure Google Meet…");
    const meetingWindow = window.open("about:blank", "avantia-google-meet");
    if (meetingWindow) {
      meetingWindow.opener = null;
      meetingWindow.document.title = "Creating Avantia Build meeting…";
    }

    try {
      const response = await fetch("/api/admin/google-meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      const result = (await response.json()) as {
        ok?: boolean;
        meetingUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.ok || !result.meetingUrl) {
        throw new Error(result.error || "Google Meet could not be started.");
      }
      const url = new URL(result.meetingUrl);
      if (url.protocol !== "https:" || url.hostname !== "meet.google.com") {
        throw new Error("Google returned an invalid meeting link.");
      }
      if (meetingWindow) meetingWindow.location.replace(url.toString());
      else window.location.assign(url.toString());
      setStatus("Meeting created. Opening Google Meet…");
    } catch (error) {
      meetingWindow?.close();
      setStatus(
        error instanceof Error
          ? error.message
          : "Google Meet could not be started.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (variant === "row") {
    return (
      <div className="border-b border-slate-100 last:border-b-0">
        <button
          type="button"
          onClick={startMeeting}
          disabled={busy}
          className="group flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0066cc] disabled:cursor-wait disabled:opacity-60"
        >
          <span>{busy ? "Creating Google Meet…" : "Google Meet"}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" />
        </button>
        {status ? <p role="status" className="px-3 pb-2 text-xs text-slate-600">{status}</p> : null}
      </div>
    );
  }

  return (
    <div className="grid min-h-[4.75rem] grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white"><Video className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-950">Google Meet</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500">Create a live meeting from the connected Avantia account.</span>
        {status ? <span role="status" className="mt-1 block text-xs font-medium text-slate-700">{status}</span> : null}
      </span>
      <button type="button" onClick={startMeeting} disabled={busy} className="inline-flex min-h-11 items-center rounded-md px-3 text-xs font-semibold text-[#0066cc] hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-wait disabled:opacity-60">{busy ? "Creating…" : "Start"}</button>
    </div>
  );
}
