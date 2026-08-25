"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"

import { saveDeliveryRequestAction } from "@/app/delivery/actions"
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

export function DeliveryEstimator() {
  const [storeName, setStoreName] = useState("")
  const [orderNumber, setOrderNumber] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  const [pickupCoordinates, setPickupCoordinates] = useState("")
  const [jobsiteName, setJobsiteName] = useState("")
  const [jobsiteAddress, setJobsiteAddress] = useState("")
  const [jobsiteCoordinates, setJobsiteCoordinates] = useState("")
  const [vehicle, setVehicle] = useState<DeliveryVehicle>("small")
  const [speed, setSpeed] = useState<DeliverySpeed>("rush")
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle")
  const [savedReference, setSavedReference] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [needsLogin, setNeedsLogin] = useState(false)
  const [isPending, startTransition] = useTransition()

  const origin = useMemo(() => parseCoordinatePair(pickupCoordinates), [pickupCoordinates])
  const destination = useMemo(() => parseCoordinatePair(jobsiteCoordinates), [jobsiteCoordinates])
  const estimate = useMemo(() => {
    if (!origin || !destination) return null
    return calculateDeliveryEstimate({ origin, destination, vehicle, speed })
  }, [destination, origin, speed, vehicle])

  const pickupInvalid = pickupCoordinates.length > 0 && !origin
  const jobsiteInvalid = jobsiteCoordinates.length > 0 && !destination
  const readyToSave = Boolean(storeName.trim() && estimate)

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
    if (!readyToSave || !estimate) return

    const localReference = `DLV-${Date.now().toString().slice(-6)}`
    const request = {
      reference: localReference,
      storeName: storeName.trim(),
      orderNumber: orderNumber.trim(),
      pickupAddress: pickupAddress.trim(),
      pickupCoordinates,
      jobsiteName: jobsiteName.trim(),
      jobsiteAddress: jobsiteAddress.trim(),
      jobsiteCoordinates,
      vehicle,
      speed,
      estimate,
      createdAt: new Date().toISOString(),
    }

    try {
      const previous = JSON.parse(window.localStorage.getItem("buildflow-delivery-requests") ?? "[]") as unknown[]
      window.localStorage.setItem("buildflow-delivery-requests", JSON.stringify([request, ...previous].slice(0, 20)))
    } catch {
      window.localStorage.setItem("buildflow-delivery-requests", JSON.stringify([request]))
    }

    setSaveMessage("")
    setNeedsLogin(false)
    startTransition(async () => {
      const result = await saveDeliveryRequestAction({
        storeName: request.storeName,
        orderNumber: request.orderNumber,
        pickupAddress: request.pickupAddress,
        pickupCoordinates: request.pickupCoordinates,
        jobsiteName: request.jobsiteName,
        jobsiteAddress: request.jobsiteAddress,
        jobsiteCoordinates: request.jobsiteCoordinates,
        vehicle,
        speed,
        estimate: {
          estimatedRoadMiles: estimate.estimatedRoadMiles,
          total: estimate.total,
          serviceFee: estimate.serviceFee,
        },
      })
      if (result.ok) {
        setSavedReference(result.reference)
        setSaveMessage("Saved to your AvantiaBuild account and the owner delivery desk.")
        return
      }
      setSavedReference(localReference)
      const loginRequired = Boolean("needsLogin" in result && result.needsLogin)
      setNeedsLogin(loginRequired)
      setSaveMessage(loginRequired ? "Saved on this device. Sign in to save it to AvantiaBuild." : result.error)
    })
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fc_0%,#eaf1fa_48%,#f8fafc_100%)] px-4 pb-28 pt-4 text-slate-950 sm:px-6 sm:pb-12 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="relative overflow-hidden rounded-[30px] bg-[#0e2341] px-5 py-6 text-white shadow-[0_22px_60px_rgba(14,35,65,0.22)] sm:px-8 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(243,203,114,0.34),transparent_25%),linear-gradient(115deg,transparent_0%,transparent_62%,rgba(255,255,255,0.05)_62%,rgba(255,255,255,0.05)_63%,transparent_63%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Delivery desk
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Move it to the jobsite.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Plan the route and load, then send the request to the owner delivery desk. Final courier pricing comes from the selected provider.</p>
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
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Instant estimate</span>
            </div>

            <div className="mt-6 flex gap-3">
              <RouteLine />
              <div className="grid min-w-0 flex-1 gap-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Store name
                    <input value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="Home Depot, Lowe’s, local supplier" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Pickup address <span className="font-normal text-slate-400">(for live quote)</span>
                    <input value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} placeholder="Street, city, state, ZIP" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
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
                    <input value={jobsiteAddress} onChange={(event) => setJobsiteAddress(event.target.value)} placeholder="Street, city, state, ZIP" className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100" />
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
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(Object.entries(DELIVERY_VEHICLES) as [DeliveryVehicle, (typeof DELIVERY_VEHICLES)[DeliveryVehicle]][]).map(([key, option]) => (
                  <button key={key} type="button" onClick={() => setVehicle(key)} aria-pressed={vehicle === key} className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${vehicle === key ? "border-[#0e2341] bg-[#0e2341] text-white shadow-[0_12px_28px_rgba(14,35,65,0.18)]" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300 hover:bg-white"}`}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className={`text-xs font-semibold ${vehicle === key ? "text-amber-300" : "text-slate-500"}`}>from {currency.format(option.minimum)}</span>
                    </span>
                    <span className={`mt-1 block text-xs leading-5 ${vehicle === key ? "text-slate-300" : "text-slate-500"}`}>{option.description}</span>
                  </button>
                ))}
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">Your estimate</p>
                <h2 className="mt-1 text-xl font-semibold">Complete price</h2>
              </div>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-slate-300">USD</span>
            </div>

            {estimate ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/7 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Distance</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">{estimate.estimatedRoadMiles} <span className="text-sm font-normal text-slate-400">mi</span></p>
                    <p className="mt-1 text-[10px] text-slate-500">Road distance estimate</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/7 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Pickup</p>
                    <p className="mt-1 text-sm font-semibold text-amber-200">{DELIVERY_SPEEDS[speed].eta}</p>
                    <p className="mt-2 text-[10px] text-slate-500">Subject to driver availability</p>
                  </div>
                </div>

                <dl className="mt-5 space-y-3 border-y border-white/10 py-5 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-slate-400">Base · {DELIVERY_VEHICLES[vehicle].label}</dt><dd>{currency.format(estimate.baseCharge)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-400">Mileage · {estimate.estimatedRoadMiles} mi</dt><dd>{currency.format(estimate.mileageCharge)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-400">{DELIVERY_SPEEDS[speed].label} priority</dt><dd>{currency.format(estimate.priorityCharge)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-400">Coordination fee</dt><dd>{currency.format(estimate.serviceFee)}</dd></div>
                </dl>

                <div className="flex items-end justify-between gap-4 py-5">
                  <div><p className="text-xs text-slate-400">Estimated total</p><p className="mt-1 text-xs text-slate-500">Before tolls or waiting time</p></div>
                  <p className="text-4xl font-semibold tracking-[-0.05em] text-amber-300">{currency.format(estimate.total)}</p>
                </div>

                <label className="grid gap-1.5 text-xs font-semibold text-slate-300">
                  Store pickup / order number <span className="font-normal text-slate-500">(optional)</span>
                  <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="Order # or pickup code" className="min-h-12 rounded-2xl border border-white/12 bg-white/8 px-4 text-base font-normal text-white outline-none placeholder:text-slate-500 focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10" />
                </label>

                <button type="button" onClick={saveRequest} disabled={!readyToSave || isPending} className="mt-4 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f3cb72_0%,#dca845_100%)] px-5 text-base font-semibold text-[#0e2341] shadow-[0_16px_32px_rgba(220,168,69,0.2)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45">
                  {isPending ? "Saving…" : "Save delivery request"}
                </button>
                {savedReference ? <div role="status" className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-sm text-emerald-200"><p>Saved as <strong>{savedReference}</strong></p>{saveMessage ? <p className="mt-1 text-xs text-emerald-100/80">{saveMessage}</p> : null}{needsLogin ? <Link href="/login?next=/delivery" className="mt-2 inline-block font-bold underline underline-offset-4">Sign in</Link> : null}</div> : null}
              </>
            ) : (
              <div className="mt-5 rounded-[22px] border border-dashed border-white/16 bg-white/5 px-5 py-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-amber-300"><PinIcon /></span>
                <p className="mt-4 text-sm font-semibold">Add both coordinates</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Your distance and full price will appear here instantly.</p>
              </div>
            )}

            <p className="mt-4 text-[10px] leading-4 text-slate-500">Planning estimate only—not a Curri, Roadie, GoShare, or Uber quote. Final price, vehicle availability, tolls, waiting time, and item limits come from the selected courier before dispatch.</p>
          </aside>
        </div>

        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Courier connections</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Best providers for AvantiaBuild</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Apply to Curri first, keep Roadie as the fast backup, and use GoShare for bulky loads. Uber Direct is better for smaller urgent items after its size rules are confirmed.</p></div><Link href="/owner/delivery-requests" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Owner request desk</Link></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {DELIVERY_PARTNERS.map((partner) => (
              <article key={partner.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{partner.name}</h3><p className="mt-1 text-xs font-bold text-sky-700">{partner.recommendation}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">Live quote after approval</span></div>
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
