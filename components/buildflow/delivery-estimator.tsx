"use client"

import { useMemo, useState, useTransition } from "react"

import { saveDeliveryRequestAction } from "@/app/admin/ai-tools/jobsite-delivery/actions"
import { DELIVERY_PARTNERS } from "@/lib/delivery-partners"
import {
  calculateDeliveryEstimate,
  DELIVERY_SPEEDS,
  DELIVERY_VEHICLES,
  parseCoordinatePair,
  type DeliverySpeed,
  type DeliveryVehicle,
} from "@/lib/delivery-pricing"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

type LiveUberQuote = {
  quoteId: string
  total: number
  currency: string
  durationMinutes: number | null
  pickupMinutes: number | null
  dropoffEta: string | null
  expiresAt: string
}

type DeliveryHistoryItem = {
  storeName: string
  pickupAddress: string
  pickupCoordinates: string
  jobsiteName: string
  jobsiteAddress: string
  jobsiteCoordinates: string
}

type DeliveryEstimatorProps = {
  defaultContactName: string
  defaultContactPhone: string
  deliveryHistory: DeliveryHistoryItem[]
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function RouteLine() {
  return (
    <div className="flex w-7 shrink-0 flex-col items-center" aria-hidden="true">
      <span className="h-3 w-3 rounded-full border-[3px] border-white bg-amber-400 shadow-[0_0_0_2px_#dca845]" />
      <span className="my-1 h-16 w-px border-l border-dashed border-slate-300" />
      <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#0e2341] shadow-[0_0_0_3px_white]">
        <span className="h-1.5 w-1.5 rounded-[1px] bg-white" />
      </span>
    </div>
  )
}

export function DeliveryEstimator({ defaultContactName, defaultContactPhone, deliveryHistory }: DeliveryEstimatorProps) {
  const [storeName, setStoreName] = useState("")
  const [orderNumber, setOrderNumber] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  const [pickupCoordinates, setPickupCoordinates] = useState("")
  const [jobsiteName, setJobsiteName] = useState("")
  const [jobsiteAddress, setJobsiteAddress] = useState("")
  const [jobsiteCoordinates, setJobsiteCoordinates] = useState("")
  const [pickupContactName, setPickupContactName] = useState(defaultContactName)
  const [pickupPhone, setPickupPhone] = useState(defaultContactPhone)
  const [dropoffContactName, setDropoffContactName] = useState("")
  const [dropoffPhone, setDropoffPhone] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [deliveryTiming, setDeliveryTiming] = useState<"asap" | "later">("asap")
  const [scheduledPickupLocal, setScheduledPickupLocal] = useState("")
  const [weightPounds, setWeightPounds] = useState("20")
  const [vehicle, setVehicle] = useState<DeliveryVehicle>("small")
  const [speed, setSpeed] = useState<DeliverySpeed>("rush")
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle")
  const [savedReference, setSavedReference] = useState("")
  const [savedTaskId, setSavedTaskId] = useState("")
  const [savedFingerprint, setSavedFingerprint] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [liveQuote, setLiveQuote] = useState<LiveUberQuote | null>(null)
  const [liveQuoteState, setLiveQuoteState] = useState<"idle" | "loading" | "error">("idle")
  const [liveQuoteMessage, setLiveQuoteMessage] = useState("")
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false)
  const [scheduleState, setScheduleState] = useState<"idle" | "loading" | "scheduled" | "error">("idle")
  const [scheduleMessage, setScheduleMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const origin = useMemo(() => parseCoordinatePair(pickupCoordinates), [pickupCoordinates])
  const destination = useMemo(() => parseCoordinatePair(jobsiteCoordinates), [jobsiteCoordinates])
  const estimate = useMemo(() => {
    if (!origin || !destination) return null
    return calculateDeliveryEstimate({ origin, destination, vehicle, speed })
  }, [destination, origin, speed, vehicle])

  const pickupInvalid = pickupCoordinates.length > 0 && !origin
  const jobsiteInvalid = jobsiteCoordinates.length > 0 && !destination
  const parsedWeight = Number(weightPounds)
  const uberPackageEligible = (vehicle === "small" || vehicle === "car") && Number.isFinite(parsedWeight) && parsedWeight > 0 && parsedWeight <= 50
  const scheduledPickupMs = scheduledPickupLocal ? new Date(scheduledPickupLocal).getTime() : Number.NaN
  const timingReady = deliveryTiming === "asap" || (Number.isFinite(scheduledPickupMs) && scheduledPickupMs > Date.now() + 60 * 60 * 1000 && scheduledPickupMs < Date.now() + 30 * 24 * 60 * 60 * 1000)
  const readyForLiveQuote = pickupAddress.trim().length >= 8 && jobsiteAddress.trim().length >= 8 && uberPackageEligible && timingReady
  const readyToSave = Boolean(storeName.trim() && pickupAddress.trim() && jobsiteAddress.trim() && (estimate || liveQuote) && timingReady)
  const draftFingerprint = JSON.stringify([storeName, pickupAddress, pickupCoordinates, jobsiteName, jobsiteAddress, jobsiteCoordinates, pickupContactName, pickupPhone, dropoffContactName, dropoffPhone, itemDescription, weightPounds, vehicle, speed, deliveryTiming, scheduledPickupLocal, liveQuote?.quoteId || ""])
  const storeSuggestions = useMemo(() => Array.from(new Set(deliveryHistory.map((item) => item.storeName).filter(Boolean))), [deliveryHistory])
  const pickupAddressSuggestions = useMemo(() => Array.from(new Set(deliveryHistory.map((item) => item.pickupAddress).filter(Boolean))), [deliveryHistory])
  const jobsiteAddressSuggestions = useMemo(() => Array.from(new Set(deliveryHistory.map((item) => item.jobsiteAddress).filter(Boolean))), [deliveryHistory])

  function updateStoreName(value: string) {
    setStoreName(value)
    const match = deliveryHistory.find((item) => item.storeName.trim().toLowerCase() === value.trim().toLowerCase())
    if (!match) return
    setPickupAddress(match.pickupAddress)
    setPickupCoordinates(match.pickupCoordinates)
    resetLiveQuote()
  }

  function resetLiveQuote() {
    setLiveQuote(null)
    setLiveQuoteMessage("")
    setLiveQuoteState("idle")
  }

  async function requestLiveQuote() {
    if (!readyForLiveQuote) {
      setLiveQuoteState("error")
      setLiveQuoteMessage("Enter both complete addresses and use a small item or car load up to 50 lb.")
      return
    }

    setLiveQuoteState("loading")
    setLiveQuoteMessage("")
    try {
      const response = await fetch("/api/delivery/uber/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: jobsiteAddress.trim(),
          weightPounds: parsedWeight,
          vehicle,
          scheduledPickupAt: deliveryTiming === "later" ? new Date(scheduledPickupLocal).toISOString() : null,
        }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; code?: string; quote?: LiveUberQuote }
      if (!response.ok || !payload.ok || !payload.quote) {
        setLiveQuote(null)
        setLiveQuoteMessage(payload.error || "Uber could not return a live quote right now.")
        setLiveQuoteState("error")
        return
      }
      setLiveQuote(payload.quote)
      setLiveQuoteState("idle")
    } catch {
      setLiveQuote(null)
      setLiveQuoteMessage("Uber could not return a live quote right now.")
      setLiveQuoteState("error")
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationState("error")
      return
    }

    setLocationState("loading")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setJobsiteCoordinates(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`)
        setLocationState("idle")
      },
      () => setLocationState("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function saveRequest() {
    if (!readyToSave || (!estimate && !liveQuote)) return

    const scheduledPickupAt = deliveryTiming === "later" && scheduledPickupLocal
      ? new Date(scheduledPickupLocal).toISOString()
      : null
    const request = {
      storeName: storeName.trim(),
      orderNumber: orderNumber.trim(),
      pickupAddress: pickupAddress.trim(),
      pickupCoordinates,
      jobsiteName: jobsiteName.trim(),
      jobsiteAddress: jobsiteAddress.trim(),
      jobsiteCoordinates,
      pickupContactName: pickupContactName.trim(),
      pickupPhone: pickupPhone.trim(),
      dropoffContactName: dropoffContactName.trim(),
      dropoffPhone: dropoffPhone.trim(),
      itemDescription: itemDescription.trim(),
      weightPounds: parsedWeight,
      scheduledPickupAt,
      vehicle,
      speed,
      estimate,
      ...(liveQuote ? {
        providerQuote: {
          provider: "Uber Direct" as const,
          quoteId: liveQuote.quoteId,
          total: liveQuote.total,
          currency: liveQuote.currency,
          pickupMinutes: liveQuote.pickupMinutes,
          durationMinutes: liveQuote.durationMinutes,
          expiresAt: liveQuote.expiresAt,
        },
      } : {}),
      createdAt: new Date().toISOString(),
    }

    setSavedReference("")
    setSaveMessage("")
    startTransition(async () => {
      const result = await saveDeliveryRequestAction({
        storeName: request.storeName,
        orderNumber: request.orderNumber,
        pickupAddress: request.pickupAddress,
        pickupCoordinates: request.pickupCoordinates,
        jobsiteName: request.jobsiteName,
        jobsiteAddress: request.jobsiteAddress,
        jobsiteCoordinates: request.jobsiteCoordinates,
        pickupContactName: request.pickupContactName,
        pickupPhone: request.pickupPhone,
        dropoffContactName: request.dropoffContactName,
        dropoffPhone: request.dropoffPhone,
        itemDescription: request.itemDescription,
        weightPounds: request.weightPounds,
        scheduledPickupAt: request.scheduledPickupAt,
        vehicle,
        speed,
        estimate: {
          estimatedRoadMiles: estimate?.estimatedRoadMiles || 0,
          total: liveQuote?.total ?? estimate?.total ?? 0,
          serviceFee: liveQuote ? 0 : estimate?.serviceFee || 0,
        },
        providerQuote: request.providerQuote,
      })
      if (result.ok) {
        setSavedReference(result.reference)
        setSavedTaskId(result.taskId)
        setSavedFingerprint(draftFingerprint)
        setSaveMessage("Saved to the Manager delivery queue.")
        return
      }
      setSaveMessage(result.error)
    })
  }

  async function scheduleDelivery() {
    if (!savedTaskId || !liveQuote || !scheduleConfirmed) return
    setScheduleState("loading")
    setScheduleMessage("")
    try {
      const response = await fetch("/api/delivery/uber/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: savedTaskId, confirmed: true }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; delivery?: { deliveryId?: string } }
      if (!response.ok || !payload.ok) {
        setScheduleState("error")
        setScheduleMessage(payload.error || "Uber could not schedule this delivery.")
        return
      }
      setScheduleState("scheduled")
      setScheduleMessage(`Uber delivery ${payload.delivery?.deliveryId || "scheduled"} is confirmed.`)
    } catch {
      setScheduleState("error")
      setScheduleMessage("Uber could not schedule this delivery.")
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fc_0%,#eaf1fa_48%,#f8fafc_100%)] px-4 pb-28 pt-4 text-slate-950 sm:px-6 sm:pb-12 lg:px-8 lg:py-8">
      <datalist id="delivery-store-suggestions">{storeSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="delivery-pickup-addresses">{pickupAddressSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="delivery-jobsite-addresses">{jobsiteAddressSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
      <div className="mx-auto max-w-6xl">
        <header className="relative overflow-hidden rounded-[30px] bg-[#0e2341] px-5 py-6 text-white shadow-[0_22px_60px_rgba(14,35,65,0.22)] sm:px-8 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(243,203,114,0.34),transparent_25%),linear-gradient(115deg,transparent_0%,transparent_62%,rgba(255,255,255,0.05)_62%,rgba(255,255,255,0.05)_63%,transparent_63%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Manager · AI Tools
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Move it to the jobsite.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Plan the route and load, request a live provider quote when eligible, then track the delivery through completion in the Manager queue.</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-[#0e2341]"><PinIcon /></span>
              <div>
                <p className="text-xs text-slate-300">Fastest option</p>
                <p className="text-sm font-semibold text-white">Rush pickup · 30–60 min</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)] lg:items-start">
          <section className="rounded-[28px] border border-white bg-white/95 p-5 shadow-[0_18px_48px_rgba(51,65,85,0.1)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">01 · Route</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Where is it going?</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Live + planning</span>
            </div>

            <div className="mt-6 flex gap-3">
              <RouteLine />
              <div className="grid min-w-0 flex-1 gap-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Store name
                    <input value={storeName} onChange={(event) => updateStoreName(event.target.value)} list="delivery-store-suggestions" autoComplete="organization" placeholder="Home Depot, Lowe’s, local supplier" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
                    {storeName.trim() ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeName)}`} target="_blank" rel="noreferrer" className="text-xs font-normal text-sky-700 underline underline-offset-4">Find this store address</a> : <span className="text-xs font-normal text-slate-400">Choosing a saved store fills its last pickup address.</span>}
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Pickup address <span className="font-normal text-slate-400">(for live quote)</span>
                    <input value={pickupAddress} onChange={(event) => { setPickupAddress(event.target.value); resetLiveQuote() }} list="delivery-pickup-addresses" autoComplete="street-address" placeholder="Street, city, state, ZIP" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                    Pickup coordinates
                    <input value={pickupCoordinates} onChange={(event) => setPickupCoordinates(event.target.value)} placeholder="40.741895, -73.989308" inputMode="decimal" aria-invalid={pickupInvalid} className={`min-h-12 rounded-2xl border bg-slate-50 px-4 font-mono text-sm font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${pickupInvalid ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-amber-400 focus:ring-amber-100"}`} />
                    {pickupInvalid ? <span className="text-xs font-normal text-rose-600">Use: latitude, longitude</span> : <span className="text-xs font-normal text-slate-400">Paste coordinates from Google Maps for the planning estimate.</span>}
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Jobsite name <span className="font-normal text-slate-400">(optional)</span>
                    <input value={jobsiteName} onChange={(event) => setJobsiteName(event.target.value)} placeholder="Smith renovation" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Jobsite address <span className="font-normal text-slate-400">(for live quote)</span>
                    <input value={jobsiteAddress} onChange={(event) => { setJobsiteAddress(event.target.value); resetLiveQuote() }} list="delivery-jobsite-addresses" autoComplete="street-address" placeholder="Street, city, state, ZIP" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
                  </label>
                  <div className="sm:col-span-2">
                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                      Jobsite coordinates
                      <input value={jobsiteCoordinates} onChange={(event) => setJobsiteCoordinates(event.target.value)} placeholder="40.678178, -73.944158" inputMode="decimal" aria-invalid={jobsiteInvalid} className={`min-h-12 rounded-2xl border bg-slate-50 px-4 font-mono text-sm font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${jobsiteInvalid ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-amber-400 focus:ring-amber-100"}`} />
                    </label>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className={`text-xs ${locationState === "error" ? "text-rose-600" : "text-slate-400"}`}>{jobsiteInvalid ? "Use: latitude, longitude" : locationState === "error" ? "Location unavailable" : "Paste from Maps"}</span>
                      <button type="button" onClick={useCurrentLocation} disabled={locationState === "loading"} className="text-xs font-semibold text-sky-700 underline decoration-sky-200 underline-offset-4 disabled:opacity-50">{locationState === "loading" ? "Finding…" : "Use my location"}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-7 h-px bg-slate-100" />

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">02 · Item size</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">What should we send?</h2>
              <label className="mt-4 grid max-w-xs gap-1.5 text-sm font-semibold text-slate-700">
                Package weight (lb)
                <input type="number" min="1" max="50" step="1" value={weightPounds} onChange={(event) => { setWeightPounds(event.target.value); resetLiveQuote() }} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
                <span className={`text-xs font-normal ${Number.isFinite(parsedWeight) && parsedWeight > 0 && parsedWeight <= 50 ? "text-slate-500" : "text-rose-600"}`}>Uber Direct packages must be 50 lb or less and fit in a normal vehicle.</span>
              </label>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(Object.entries(DELIVERY_VEHICLES) as [DeliveryVehicle, (typeof DELIVERY_VEHICLES)[DeliveryVehicle]][]).map(([key, option]) => (
                  <button key={key} type="button" onClick={() => { setVehicle(key); resetLiveQuote() }} aria-pressed={vehicle === key} className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${vehicle === key ? "border-[#0e2341] bg-[#0e2341] text-white shadow-[0_12px_28px_rgba(14,35,65,0.18)]" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-white"}`}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className={`text-xs font-semibold ${vehicle === key ? "text-amber-300" : "text-slate-500"}`}>from {currency.format(option.minimum)}</span>
                    </span>
                    <span className={`mt-1 block text-xs leading-5 ${vehicle === key ? "text-slate-300" : "text-slate-500"}`}>{option.description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Courier contacts and schedule</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Uber needs a contact at pickup and drop-off. These details are saved only with this Manager delivery request.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Pickup contact<input value={pickupContactName} onChange={(event) => setPickupContactName(event.target.value)} autoComplete="name" placeholder="Person at the store" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" /></label>
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Pickup phone<input value={pickupPhone} onChange={(event) => setPickupPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="(516) 555-0123" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" /></label>
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Jobsite contact<input value={dropoffContactName} onChange={(event) => setDropoffContactName(event.target.value)} autoComplete="name" placeholder="Person receiving it" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" /></label>
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Jobsite phone<input value={dropoffPhone} onChange={(event) => setDropoffPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="(516) 555-0123" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" /></label>
                  <label className="grid gap-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">What is being delivered?<input value={itemDescription} onChange={(event) => setItemDescription(event.target.value)} placeholder="Example: two boxes of electrical fittings" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" /></label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white p-1 ring-1 ring-slate-200">
                  <button type="button" onClick={() => { setDeliveryTiming("asap"); resetLiveQuote() }} aria-pressed={deliveryTiming === "asap"} className={`min-h-10 rounded-lg text-xs font-semibold ${deliveryTiming === "asap" ? "bg-[#10233f] text-white" : "text-slate-600"}`}>As soon as possible</button>
                  <button type="button" onClick={() => { setDeliveryTiming("later"); resetLiveQuote() }} aria-pressed={deliveryTiming === "later"} className={`min-h-10 rounded-lg text-xs font-semibold ${deliveryTiming === "later" ? "bg-[#10233f] text-white" : "text-slate-600"}`}>Schedule for later</button>
                </div>
                {deliveryTiming === "later" ? <label className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-700">Requested pickup time<input type="datetime-local" value={scheduledPickupLocal} onChange={(event) => { setScheduledPickupLocal(event.target.value); resetLiveQuote() }} aria-invalid={!timingReady} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal" /><span className={timingReady ? "font-normal text-slate-500" : "font-normal text-rose-600"}>Choose a time between 1 hour and 30 days from now.</span></label> : null}
              </div>
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-slate-950">Uber Direct live price</p><p className="mt-1 text-xs text-slate-600">Uses the two full addresses above. Requesting a quote does not create or charge for a delivery.</p></div>
                  <button type="button" onClick={requestLiveQuote} disabled={!readyForLiveQuote || liveQuoteState === "loading"} className="min-h-11 rounded-xl bg-[#10233f] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{liveQuoteState === "loading" ? "Checking Uber…" : "Get live Uber price"}</button>
                </div>
                {liveQuote ? <div role="status" className="mt-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800"><strong>{currency.format(liveQuote.total)}</strong> live provider fee · {liveQuote.pickupMinutes !== null ? `${liveQuote.pickupMinutes} min pickup` : "Pickup time shown after dispatch"} · no AvantiaBuild markup</div> : null}
                {liveQuoteMessage ? <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700">{liveQuoteMessage}</div> : null}
              </div>
            </div>

            <div className="my-7 h-px bg-slate-100" />

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">03 · Timing</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">How fast?</h2>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-[22px] bg-slate-100 p-1.5">
                {(Object.entries(DELIVERY_SPEEDS) as [DeliverySpeed, (typeof DELIVERY_SPEEDS)[DeliverySpeed]][]).map(([key, option]) => (
                  <button key={key} type="button" onClick={() => setSpeed(key)} aria-pressed={speed === key} className={`min-h-16 rounded-[17px] px-2 py-2 text-center transition active:scale-[0.98] ${speed === key ? "bg-white text-slate-950 shadow-[0_6px_18px_rgba(51,65,85,0.12)]" : "text-slate-500"}`}>
                    <span className="block text-xs font-semibold sm:text-sm">{option.label}</span>
                    <span className={`mt-0.5 block text-[10px] sm:text-xs ${speed === key ? "text-amber-700" : "text-slate-400"}`}>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-[#1b365d] bg-[#0e2341] p-5 text-white shadow-[0_22px_54px_rgba(14,35,65,0.2)] lg:sticky lg:top-20 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">{liveQuote ? "Live provider quote" : "Your estimate"}</p>
                <h2 className="mt-1 text-xl font-semibold">Complete price</h2>
              </div>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-slate-300">{liveQuote ? "Uber Direct" : "USD"}</span>
            </div>

            {estimate || liveQuote ? (
              <>
                {liveQuote ? <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-emerald-100">Uber Direct production quote</p><span className="rounded-full bg-emerald-200/15 px-2.5 py-1 text-[10px] font-bold text-emerald-100">0% markup</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-50/80"><p>Pickup: <strong className="text-white">{liveQuote.pickupMinutes !== null ? `${liveQuote.pickupMinutes} min` : "Pending"}</strong></p><p>Trip: <strong className="text-white">{liveQuote.durationMinutes !== null ? `${liveQuote.durationMinutes} min` : "Pending"}</strong></p></div><p className="mt-3 text-[10px] text-emerald-50/60">Quote expires {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(liveQuote.expiresAt))}. Saving it does not dispatch a courier.</p></div> : null}

                {estimate ? <>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-white/7 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Distance</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight">{estimate.estimatedRoadMiles} <span className="text-sm font-normal text-slate-400">mi</span></p>
                      <p className="mt-1 text-[10px] text-slate-500">Road distance estimate</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/7 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Pickup</p>
                      <p className="mt-1 text-sm font-semibold text-amber-200">{liveQuote?.pickupMinutes !== null && liveQuote?.pickupMinutes !== undefined ? `${liveQuote.pickupMinutes} min` : DELIVERY_SPEEDS[speed].eta}</p>
                      <p className="mt-2 text-[10px] text-slate-500">Subject to courier availability</p>
                    </div>
                  </div>

                  {!liveQuote ? <dl className="mt-5 space-y-3 border-y border-white/10 py-5 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-slate-400">Base · {DELIVERY_VEHICLES[vehicle].label}</dt><dd>{currency.format(estimate.baseCharge)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-400">Mileage · {estimate.estimatedRoadMiles} mi</dt><dd>{currency.format(estimate.mileageCharge)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-400">{DELIVERY_SPEEDS[speed].label} priority</dt><dd>{currency.format(estimate.priorityCharge)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-slate-400">Coordination fee</dt><dd>{currency.format(estimate.serviceFee)}</dd></div>
                  </dl> : <p className="mt-4 text-xs text-slate-400">The live Uber fee replaces the website planning formula. AvantiaBuild adds no delivery markup.</p>}
                </> : <p className="mt-4 text-xs leading-5 text-slate-400">Add route coordinates if you also want the mileage comparison and to save this quote to the owner delivery desk.</p>}

                <div className="flex items-end justify-between gap-4 py-5">
                  <div><p className="text-xs text-slate-400">{liveQuote ? "Uber delivery fee" : "Estimated total"}</p><p className="mt-1 text-xs text-slate-500">{liveQuote ? "No AvantiaBuild markup" : "Before tolls or waiting time"}</p></div>
                  <p className="text-4xl font-semibold tracking-[-0.05em] text-amber-300">{currency.format(liveQuote?.total ?? estimate?.total ?? 0)}</p>
                </div>

                {estimate || liveQuote ? <><label className="grid gap-1.5 text-xs font-semibold text-slate-300">
                  Store pickup / order number <span className="font-normal text-slate-500">(optional)</span>
                  <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="Order # or pickup code" className="min-h-12 rounded-2xl border border-white/12 bg-white/8 px-4 text-base font-normal text-white outline-none placeholder:text-slate-500 focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10" />
                </label>

                <button type="button" onClick={saveRequest} disabled={!readyToSave || isPending} className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-5 text-base font-semibold text-[#0e2341] shadow-[0_16px_32px_rgba(220,168,69,0.2)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45">
                  {isPending ? "Saving…" : "Save delivery request"}
                </button>
                {savedReference ? <div role="status" className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-sm text-emerald-200"><p>Saved as <strong>{savedReference}</strong></p>{saveMessage ? <p className="mt-1 text-xs text-emerald-100/80">{saveMessage}</p> : null}</div> : saveMessage ? <p role="alert" className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-center text-sm text-rose-100">{saveMessage}</p> : null}
                {savedTaskId && liveQuote && savedFingerprint !== draftFingerprint ? <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">The delivery details changed. Save the request again before scheduling Uber.</p> : null}
                {savedTaskId && liveQuote && savedFingerprint === draftFingerprint ? <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                  <label className="flex items-start gap-3 text-xs leading-5 text-amber-50"><input type="checkbox" checked={scheduleConfirmed} onChange={(event) => setScheduleConfirmed(event.target.checked)} className="mt-1 h-4 w-4" /><span>I confirm the addresses, contacts, package, live Uber price, and pickup timing. Scheduling can create a charge with Uber Direct.</span></label>
                  <button type="button" onClick={scheduleDelivery} disabled={!scheduleConfirmed || scheduleState === "loading" || scheduleState === "scheduled"} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-[#10233f] disabled:opacity-50">{scheduleState === "loading" ? "Scheduling…" : scheduleState === "scheduled" ? "Delivery scheduled" : deliveryTiming === "later" ? "Schedule Uber delivery" : "Request Uber pickup"}</button>
                  {scheduleMessage ? <p role={scheduleState === "error" ? "alert" : "status"} className={`mt-2 text-xs ${scheduleState === "error" ? "text-rose-200" : "text-emerald-200"}`}>{scheduleMessage}</p> : null}
                </div> : null}</> : null}
              </>
            ) : (
              <div className="mt-5 rounded-[22px] border border-dashed border-white/16 bg-white/5 px-5 py-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-amber-300"><PinIcon /></span>
                <p className="mt-4 text-sm font-semibold">Add addresses for a live price</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Use both full addresses for Uber, or add coordinates for the planning estimate.</p>
              </div>
            )}

            <p className="mt-4 text-[10px] leading-4 text-slate-500">{liveQuote ? "Live Uber Direct quote. The amount can change after it expires or if the route, package, waiting time, or delivery details change. No courier is dispatched until a delivery is separately confirmed." : "Planning estimate only. Final price, vehicle availability, tolls, waiting time, and item limits come from the selected courier before dispatch."}</p>
          </aside>
        </div>

        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Courier connections</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Provider setup and dispatch options</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Uber Direct is connected for urgent packages up to 50 lb. Curri, Roadie, and GoShare remain the better paths for pickup trucks, vans, and bulky construction materials.</p></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {DELIVERY_PARTNERS.map((partner) => (
              <article key={partner.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{partner.name}</h3><p className="mt-1 text-xs font-bold text-sky-700">{partner.recommendation}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${partner.name === "Uber Direct" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-white text-slate-600 ring-slate-200"}`}>{partner.name === "Uber Direct" ? "Connected · live" : "Live quote after approval"}</span></div>
                <p className="mt-3 text-sm font-medium text-slate-800">{partner.bestFor}</p><p className="mt-2 text-xs leading-5 text-slate-500">{partner.vehicles}</p><p className="mt-2 text-xs leading-5 text-slate-500">{partner.integration}</p>
                <div className="mt-4 flex gap-2"><a href={partner.applyUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-[#10233f] px-3 py-2 text-xs font-bold text-white">Apply / contact</a><a href={partner.docsUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">API details</a></div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
