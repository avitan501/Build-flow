"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateDeliveryStatusAction } from "@/app/admin/ai-tools/jobsite-delivery/actions";
import { DELIVERY_SPEEDS, DELIVERY_VEHICLES } from "@/lib/delivery-pricing";
import type { SavedDeliveryRequest } from "@/lib/delivery-requests";
import { formatSiteDateTime } from "@/lib/site-date-time";

type QueueRequest = SavedDeliveryRequest & { id: string };

const statusOptions: Array<{ value: SavedDeliveryRequest["status"]; label: string }> = [
  { value: "new", label: "New" },
  { value: "quoted", label: "Quoted" },
  { value: "dispatched", label: "Dispatched" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function RequestStatus({ request }: { request: QueueRequest }) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function saveStatus(nextStatus: SavedDeliveryRequest["status"]) {
    const previous = status;
    setStatus(nextStatus);
    setMessage("");
    startTransition(async () => {
      const result = await updateDeliveryStatusAction({ id: request.id, status: nextStatus });
      if (!result.ok) {
        setStatus(previous);
        setMessage(result.error);
        return;
      }
      setMessage("Saved");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400" htmlFor={`delivery-status-${request.id}`}>Status</label>
      <select id={`delivery-status-${request.id}`} value={status} onChange={(event) => saveStatus(event.target.value as SavedDeliveryRequest["status"])} disabled={isPending} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 disabled:opacity-60">
        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {message ? <span role={message === "Saved" ? "status" : "alert"} className={`text-xs ${message === "Saved" ? "text-emerald-700" : "text-rose-700"}`}>{message}</span> : null}
    </div>
  );
}

export function DeliveryRequestQueue({ requests }: { requests: QueueRequest[] }) {
  return (
    <section aria-labelledby="delivery-queue-heading" className="mx-auto mt-6 max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0066cc]">Manager queue</p>
          <h2 id="delivery-queue-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Delivery requests</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{requests.length} saved</span>
      </div>

      <div className="mt-4 grid gap-3">
        {requests.length ? requests.map((request) => (
          <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><strong className="text-base text-slate-950">{request.reference}</strong><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{DELIVERY_SPEEDS[request.speed as keyof typeof DELIVERY_SPEEDS]?.label || request.speed}</span></div>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">{request.storeName} → {request.jobsiteName || "Jobsite"}</h3>
                <p className="mt-1 text-sm text-slate-500">{request.pickupAddress || request.pickupCoordinates} → {request.jobsiteAddress || request.jobsiteCoordinates}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span>{DELIVERY_VEHICLES[request.vehicle as keyof typeof DELIVERY_VEHICLES]?.label || request.vehicle}</span><span>{request.estimate.estimatedRoadMiles} mi planned</span><span>{currency.format(request.providerQuote?.total ?? request.estimate.total)} {request.providerQuote ? "Uber Direct quote" : "planning estimate"}</span><span>Created {formatSiteDateTime(request.createdAt)}</span>{request.scheduledPickupAt ? <span>Pickup {formatSiteDateTime(request.scheduledPickupAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</span> : null}</div>
                {request.providerDelivery ? <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"><strong>Uber {request.providerDelivery.status}</strong><span>ID {request.providerDelivery.deliveryId}</span>{request.providerDelivery.trackingUrl ? <a href={request.providerDelivery.trackingUrl} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">Open live tracking</a> : null}</div> : null}
              </div>
              <RequestStatus request={request} />
            </div>
          </article>
        )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">No delivery requests yet. Complete the planner above to create the first one.</div>}
      </div>
    </section>
  );
}
