"use client"

import type { Call, Device } from "@2chat/voice-sdk"
import { Mic, MicOff, Phone, PhoneOff, X } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"

import { getTwoChatVoiceTokenAction } from "@/app/owner/aura/actions"
import { recordCommunicationActivityAction } from "@/app/admin/activity-actions"

type CallStatus = "idle" | "connecting" | "ringing" | "active" | "ended" | "error"

export function TwoChatSoftphone({ open, phone, name, onClose }: { open: boolean; phone: string; name: string; onClose: () => void }) {
  const deviceRef = useRef<Device | null>(null)
  const callRef = useRef<Call | null>(null)
  const connectedAtRef = useRef<number | null>(null)
  const activityRecordedRef = useRef(false)
  const [status, setStatus] = useState<CallStatus>("idle")
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => () => { callRef.current?.disconnect().catch(() => undefined); deviceRef.current?.destroy() }, [])

  function recordCallActivity(outcome: "completed" | "failed" | "no_answer") {
    if (activityRecordedRef.current) return
    activityRecordedRef.current = true
    const connectedAt = connectedAtRef.current
    const durationSeconds = connectedAt ? Math.max(0, Math.round((Date.now() - connectedAt) / 1000)) : 0
    void recordCommunicationActivityAction({ channel: "call", recipient: phone, label: name, outcome, durationSeconds })
  }

  function startCall() {
    setError("")
    setStatus("connecting")
    connectedAtRef.current = null
    activityRecordedRef.current = false
    startTransition(async () => {
      const result = await getTwoChatVoiceTokenAction()
      if (!result.ok) { setStatus("error"); setError(result.error); return }
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const { Device: VoiceDevice } = await import("@2chat/voice-sdk")
        const device = new VoiceDevice({ token: result.token, logLevel: "error" })
        deviceRef.current = device
        device.on("error", (event) => { setStatus("error"); setError(event.message); recordCallActivity("failed") })
        await device.register()
        const call = await device.connect({ to: phone, from: result.from })
        callRef.current = call
        call.on("ringing", () => setStatus("ringing"))
        call.on("accepted", () => { connectedAtRef.current = Date.now(); setStatus("active") })
        call.on("disconnect", () => { recordCallActivity(connectedAtRef.current ? "completed" : "no_answer"); setStatus("ended"); callRef.current = null })
        call.on("error", (event) => { recordCallActivity("failed"); setStatus("error"); setError(event.message) })
      } catch (callError) {
        recordCallActivity("failed")
        setStatus("error")
        setError(callError instanceof Error ? callError.message : "The browser call could not start.")
      }
    })
  }

  async function endCall() {
    await callRef.current?.disconnect().catch(() => undefined)
    recordCallActivity(connectedAtRef.current ? "completed" : "no_answer")
    callRef.current = null
    deviceRef.current?.destroy()
    deviceRef.current = null
    setStatus("ended")
  }

  function toggleMute() {
    const next = !muted
    callRef.current?.mute(next)
    setMuted(next)
  }

  if (!open) return null
  const busy = pending || ["connecting", "ringing", "active"].includes(status)
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/35 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={`Call ${name}`}>
    <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0071e3]">2Chat business line</p><h2 className="mt-1 text-xl font-bold">{name}</h2><p className="mt-1 text-sm text-slate-500">{phone}</p></div><button type="button" onClick={onClose} disabled={busy} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40" aria-label="Close"><X className="h-4 w-4" /></button></div>
      <p className="mt-5 rounded-md bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-700">{status === "idle" ? "Ready to call from (347) 937-8665" : status === "connecting" ? "Connecting microphone..." : status === "ringing" ? "Ringing..." : status === "active" ? "Call connected" : status === "ended" ? "Call ended" : "Call could not connect"}</p>
      {error ? <p className="mt-3 text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
      <div className="mt-5 flex justify-center gap-3">
        {status === "active" ? <button type="button" onClick={toggleMute} className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-300" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button> : null}
        {busy ? <button type="button" onClick={endCall} className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white"><PhoneOff className="h-5 w-5" />End</button> : <button type="button" onClick={startCall} className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white"><Phone className="h-5 w-5" />Call</button>}
      </div>
      <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">Calls may be recorded. Tell the other person the call is being recorded before continuing.</p>
    </div>
  </div>
}
