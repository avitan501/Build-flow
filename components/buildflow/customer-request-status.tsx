"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { updateRequestStatusAction } from "@/app/preview-admin/workflow-actions";
import type { ManagerPipelineStage } from "@/lib/manager-dashboard";
import type { QuoteRequestStatus } from "@/lib/quote-requests";

const stages: Array<{ status: QuoteRequestStatus; label: string }> = [
  { status: "draft", label: "Request created" },
  { status: "submitted", label: "Review request" },
  { status: "in_review", label: "Supplier pricing / Client approval" },
  { status: "quoted", label: "Payment & delivery" },
  { status: "closed", label: "Completed" },
];

const stageTone: Record<ManagerPipelineStage, string> = {
  received: "border-amber-300 bg-amber-50 text-amber-900",
  pricing: "border-sky-300 bg-sky-50 text-sky-900",
  approval: "border-violet-300 bg-violet-50 text-violet-900",
  delivery: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

export function CustomerRequestStatus({
  requestId,
  status,
  currentStage,
}: {
  requestId: string;
  status: QuoteRequestStatus;
  currentStage: ManagerPipelineStage;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useOptimistic(status);
  const [isPending, startTransition] = useTransition();

  function updateStatus(nextStatus: QuoteRequestStatus) {
    if (nextStatus === selectedStatus) return;
    if (
      nextStatus === "closed" &&
      !window.confirm(
        "Mark this request completed? The customer can no longer add items to this request.",
      )
    )
      return;
    startTransition(async () => {
      setSelectedStatus(nextStatus);
      setMessage(null);
      const result = await updateRequestStatusAction({
        requestId,
        status: nextStatus,
      });
      if (!result.ok) {
        return setMessage(result.error);
      }
      setMessage(null);
      router.refresh();
    });
  }

  return (
    <div className="w-44 min-w-0">
        <label className="grid gap-1">
          <span
            id="request-status-heading"
            className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500"
          >
            Request status
          </span>
          <select
            aria-label="Change request status"
            value={selectedStatus}
            disabled={isPending}
            onChange={(event) =>
              updateStatus(event.target.value as QuoteRequestStatus)
            }
            className={`h-8 w-full rounded-md border px-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-60 ${stageTone[currentStage]}`}
          >
            {stages.map((stage) => (
              <option key={stage.status} value={stage.status}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>
      {message ? (
        <p
          role="alert"
          className="mt-1 text-[10px] font-semibold text-rose-700"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
