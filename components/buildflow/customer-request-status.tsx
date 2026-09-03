"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";

import { updateRequestStatusAction } from "@/app/preview-admin/workflow-actions";
import { MaterialRequestAssigneeControl } from "@/components/buildflow/material-request-assignee-control";
import type { ManagerPipelineStage } from "@/lib/manager-dashboard";
import type { QuoteRequestStatus } from "@/lib/quote-requests";
import { formatSiteDateTime } from "@/lib/site-date-time";

const stages: Array<{ status: QuoteRequestStatus; label: string }> = [
  { status: "draft", label: "Request created" },
  { status: "submitted", label: "Review request" },
  { status: "in_review", label: "Supplier pricing / Client approval" },
  { status: "quoted", label: "Payment & delivery" },
  { status: "closed", label: "Completed" },
];

const nextAction: Record<QuoteRequestStatus, string> = {
  draft: "Submit for review",
  submitted: "Confirm the material list",
  in_review: "Finish pricing or client approval",
  quoted: "Coordinate delivery",
  closed: "Complete",
};

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
  updatedAt,
  assignee,
}: {
  requestId: string;
  status: QuoteRequestStatus;
  currentStage: ManagerPipelineStage;
  updatedAt: string;
  assignee: string;
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
      setMessage("Request status updated.");
      router.refresh();
    });
  }

  return (
    <section
      className="mt-2 rounded-lg border border-slate-200 bg-white p-2"
      aria-labelledby="request-status-heading"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] items-end gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
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
            className={`min-h-11 w-full rounded-md border px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-60 ${stageTone[currentStage]}`}
          >
            {stages.map((stage) => (
              <option key={stage.status} value={stage.status}>
                {stage.label}
              </option>
            ))}
          </select>
        </label>
        <MaterialRequestAssigneeControl
          requestId={requestId}
          assignee={assignee}
          compact
        />
        <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 text-[10px] leading-tight text-slate-500 sm:col-span-1 sm:block">
          <p className="truncate">
            <span className="font-bold text-slate-700">Next:</span>{" "}
            {nextAction[status]}
          </p>
          <p className="whitespace-nowrap">
            Updated{" "}
            {formatSiteDateTime(updatedAt, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
      {message ? (
        <p
          role="status"
          className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
