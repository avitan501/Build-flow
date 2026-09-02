import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Images,
  Link2,
  Phone,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";

import { requireOwnerAccess } from "@/lib/owner-access";
import { TRUSTED_OWNER_SMS_PHONES } from "@/lib/aura/trusted-owner-phones";

import {
  cancelAuraIntakeAction,
  confirmAuraIntakeAction,
  reviewTrustedSmsIntakeAction,
} from "../aura/actions";

type RequestItem = { name?: string; quantity?: number; unit?: string };
type IntakeProposal = {
  recordType?:
    "contact" | "client" | "lead" | "supplier" | "task" | "material_request";
  summary?: string;
  contact?: {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    company?: string | null;
    notes?: string | null;
  } | null;
  lead?: {
    title?: string;
    description?: string | null;
    location?: string | null;
  } | null;
  supplier?: {
    name?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  } | null;
  tasks?: Array<{
    title?: string;
    notes?: string | null;
    dueAt?: string | null;
    priority?: string;
  }>;
  request?: {
    title?: string;
    department?: string;
    customerName?: string | null;
    projectAddress?: string | null;
    notes?: string | null;
    items?: RequestItem[];
  } | null;
  missingInformation?: string[];
  result?: {
    entityType?: string;
    id?: string;
    contactId?: string;
    leadId?: string;
    taskCount?: number;
  };
};
type IntakeRow = {
  id: string;
  message_text: string | null;
  proposal: IntakeProposal;
  status: string;
  ai_model: string | null;
  created_at: string;
  updated_at: string;
  raw_payload: {
    media?: Array<{ url?: string; type?: string; name?: string }>;
    messageParts?: Array<{ text?: string | null; media?: unknown[] }>;
  } | null;
};
type ClientRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
};
type AuditRow = {
  id: string;
  intake_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

const labels = {
  contact: "Contact",
  client: "Contact",
  lead: "Lead",
  supplier: "Supplier",
  task: "Task / To-do",
  material_request: "Material request",
} as const;
const activityLabels: Record<string, string> = {
  sms_command_received: "Phone instruction received",
  sms_message_joined: "Follow-up joined to instruction",
  ai_review_completed: "AI check completed",
  intake_confirmed: "Approved and added",
  material_request_confirmed: "Material request created",
  supplier_confirmed: "Supplier added",
  intake_cancelled: "Instruction skipped",
};

function formatDate(value: string) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }).format(date);
  } catch {
    return "Unknown time";
  }
}

function StructuredPreview({ proposal }: { proposal: IntakeProposal }) {
  if (proposal.recordType === "material_request" && proposal.request) {
    return (
      <div className="mt-4 min-w-0 break-words rounded-md border border-slate-200 bg-white [overflow-wrap:anywhere]">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold">
            {proposal.request.title || "Material request"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {proposal.request.department || "Unassigned department"}
            {proposal.request.projectAddress
              ? ` · ${proposal.request.projectAddress}`
              : ""}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {proposal.request.items?.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="grid grid-cols-[4.5rem_1fr] gap-3 px-4 py-2.5 text-sm"
            >
              <span className="font-semibold tabular-nums text-slate-700">
                {item.quantity || 1} {item.unit || "each"}
              </span>
              <span>{item.name || "Material item"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (
    (proposal.recordType === "contact" || proposal.recordType === "client") &&
    proposal.contact
  ) {
    return (
      <div className="mt-4 grid min-w-0 gap-2 break-words rounded-md border border-slate-200 bg-white p-4 text-sm [overflow-wrap:anywhere]">
        <strong>
          {proposal.contact.fullName ||
            proposal.contact.company ||
            "New contact"}
        </strong>
        <span className="text-slate-600">
          {[
            proposal.contact.company,
            proposal.contact.phone,
            proposal.contact.email,
          ]
            .filter(Boolean)
            .join(" · ") || "Contact details were not included"}
        </span>
      </div>
    );
  }
  if (proposal.recordType === "lead" && proposal.lead) {
    return (
      <div className="mt-4 min-w-0 break-words rounded-md border border-slate-200 bg-white p-4 text-sm [overflow-wrap:anywhere]">
        <strong>{proposal.lead.title || "New lead"}</strong>
        <p className="mt-1 text-slate-600">
          {[proposal.lead.location, proposal.lead.description]
            .filter(Boolean)
            .join(" · ") || "No additional lead details"}
        </p>
      </div>
    );
  }
  if (proposal.recordType === "supplier" && proposal.supplier) {
    const supplierDetails = [
      proposal.supplier.contactName,
      proposal.supplier.phone,
      proposal.supplier.email,
      proposal.supplier.address,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <div className="mt-4 grid min-w-0 gap-2 break-words rounded-md border border-slate-200 bg-white p-4 text-sm [overflow-wrap:anywhere]">
        <strong>{proposal.supplier.name || "New supplier"}</strong>
        {supplierDetails ? (
          <span className="text-slate-600">{supplierDetails}</span>
        ) : null}
      </div>
    );
  }
  return (
    <div className="mt-4 min-w-0 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white [overflow-wrap:anywhere]">
      {proposal.tasks?.map((task, index) => (
        <div key={`${task.title}-${index}`} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <strong className="min-w-0 break-words text-sm">{task.title || "New task"}</strong>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
              {task.priority || "normal"}
            </span>
          </div>
          {task.notes ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {task.notes}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default async function AiInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { supabase } = await requireOwnerAccess("/owner/ai-inbox");
  const requestedView = (await searchParams).view;
  const view =
    requestedView === "done"
      ? "done"
      : requestedView === "cancelled"
        ? "cancelled"
        : "waiting";
  const [{ data: rows, error }, { data: clients }] = await Promise.all([
    supabase
      .from("aura_intakes")
      .select(
        "id,message_text,proposal,status,ai_model,created_at,updated_at,raw_payload",
      )
      .eq("source", "sms")
      .in("sender_phone", [...TRUSTED_OWNER_SMS_PHONES])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id,full_name,company_name,email")
      .eq("role", "client")
      .eq("is_active", true)
      .order("full_name")
      .limit(500),
  ]);
  if (error)
    console.error("ai_inbox_intakes_load_failed", { code: error.code });
  const intakes = (rows || []) as IntakeRow[];
  const clientRows = (clients || []) as ClientRow[];
  const intakeIds = intakes.map((item) => item.id);
  const { data: auditData } = intakeIds.length
    ? await supabase
        .from("aura_audit_log")
        .select("id,intake_id,action,details,created_at")
        .in("intake_id", intakeIds)
        .order("created_at", { ascending: false })
        .limit(80)
    : { data: [] };
  const activity = (auditData || []) as AuditRow[];
  const intakeById = new Map(intakes.map((item) => [item.id, item]));
  const waiting = intakes.filter((item) =>
    ["pending", "needs_follow_up", "failed"].includes(item.status),
  );
  const done = intakes.filter((item) => item.status === "confirmed");
  const cancelled = intakes.filter((item) => item.status === "cancelled");
  const visible =
    view === "done" ? done : view === "cancelled" ? cancelled : waiting;

  return (
    <main className="min-h-screen bg-[#f2f4f5] px-3 py-4 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto min-w-0 max-w-6xl">
        <header className="overflow-hidden rounded-lg border border-[#17324d] bg-[#102a43] text-white shadow-sm">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto]">
            <div>
              <Link
                href="/admin/goals-progress"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Task To Do
              </Link>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f2b84b]">
                Phone instruction desk
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Task To Do Inbox
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                Text naturally or send a screenshot from your trusted phone. AI
                can join a follow-up message, read the image, and organize one
                instruction for your approval.
              </p>
            </div>
            <div className="grid min-w-52 grid-cols-3 gap-px self-end overflow-hidden rounded-md bg-white/15">
              <div className="bg-white/[0.08] p-3 text-center">
                <strong className="block text-2xl">{waiting.length}</strong>
                <span className="text-[10px] uppercase text-slate-300">
                  Waiting
                </span>
              </div>
              <div className="bg-white/[0.08] p-3 text-center">
                <strong className="block text-2xl">{done.length}</strong>
                <span className="text-[10px] uppercase text-slate-300">
                  Added
                </span>
              </div>
              <div className="bg-white/[0.08] p-3 text-center">
                <strong className="block text-2xl">{cancelled.length}</strong>
                <span className="text-[10px] uppercase text-slate-300">
                  Skipped
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/10 px-5 py-3 text-xs text-slate-200 sm:px-7">
            <Phone className="mr-2 inline h-3.5 w-3.5" />
            Write naturally, or guide AI with: <code>add lead ...</code> ·{" "}
            <code>add contact ...</code> · <code>add request ...</code> ·{" "}
            <code>add task ...</code> · <code>add supplier ...</code>
          </div>
        </header>

        <nav
          className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:flex"
          aria-label="AI Inbox views"
        >
          {[
            ["waiting", "Waiting", "Waiting for approval", waiting.length],
            ["done", "Added", "Added", done.length],
            ["cancelled", "Skipped", "Skipped", cancelled.length],
          ].map(([id, mobileLabel, label, count]) => (
            <Link
              key={id}
              href={
                id === "waiting"
                  ? "/owner/ai-inbox"
                  : `/owner/ai-inbox?view=${id}`
              }
              aria-label={`${label} (${count})`}
              className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-md px-1.5 text-xs font-semibold sm:gap-2 sm:px-3 sm:text-sm ${view === id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {id === "waiting" ? (
                <Clock3 className="h-4 w-4 shrink-0" />
              ) : id === "done" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <X className="h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0 truncate sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{label}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] sm:px-2 ${view === id ? "bg-white/15" : "bg-slate-100"}`}
              >
                {count}
              </span>
            </Link>
          ))}
        </nav>

        <details className="group mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white">
              <ClipboardList className="h-4 w-4" />
              {waiting.length ? (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#f2b84b]" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">
                Notifications & activity log
              </strong>
              <span className="block truncate text-xs text-slate-500">
                {waiting.length
                  ? `${waiting.length} instruction${waiting.length === 1 ? "" : "s"} need your attention`
                  : "Everything received from your phone is recorded here"}
              </span>
            </span>
            <span className="text-xs font-semibold text-[#0875b7] group-open:hidden">
              Open log
            </span>
            <span className="hidden text-xs font-semibold text-slate-500 group-open:inline">
              Close
            </span>
          </summary>
          <div className="border-t border-slate-200">
            <div className="grid divide-y divide-slate-100">
              {activity.length ? (
                activity.slice(0, 12).map((event) => {
                  const related = event.intake_id
                    ? intakeById.get(event.intake_id)
                    : null;
                  return (
                    <div
                      key={event.id}
                      className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr_auto] sm:items-center sm:gap-4"
                    >
                      <span className="text-[11px] text-slate-500">
                        {formatDate(event.created_at)}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {activityLabels[event.action] ||
                          event.action.replaceAll("_", " ")}
                        <small className="mt-0.5 block truncate font-normal text-slate-500">
                          {related?.message_text || "AI Inbox activity"}
                        </small>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {related?.proposal?.recordType
                          ? labels[
                              related.proposal.recordType as keyof typeof labels
                            ] || "Item"
                          : "System"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  Activity will appear after the next add… message arrives.
                </p>
              )}
            </div>
          </div>
        </details>

        <section className="mt-4 space-y-3">
          {visible.length ? (
            visible.map((intake) => {
              const proposal = intake.proposal || {};
              const type = proposal.recordType || "task";
              const completedRequestId =
                proposal.result?.entityType === "material_request"
                  ? proposal.result.id
                  : null;
              return (
                <article
                  key={intake.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div className="grid lg:grid-cols-[15rem_1fr]">
                    <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                          <Bot className="h-3.5 w-3.5 text-[#0875b7]" />
                          {labels[type as keyof typeof labels] || "Task"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(intake.created_at)}
                        </span>
                      </div>
                      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Original phone message
                      </p>
                      <p className="mt-2 min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
                        {intake.message_text || "No message text"}
                      </p>
                      {intake.raw_payload?.media?.length ? (
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800">
                          <Images className="h-3.5 w-3.5" />
                          {intake.raw_payload.media.length} screenshot
                          {intake.raw_payload.media.length === 1
                            ? ""
                            : "s"}{" "}
                          read by AI
                        </p>
                      ) : null}
                      {(intake.raw_payload?.messageParts?.length || 0) > 1 ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                          <Link2 className="h-3.5 w-3.5" />
                          {intake.raw_payload!.messageParts!.length} phone
                          messages combined
                        </p>
                      ) : null}
                      <p className="mt-4 text-[11px] text-slate-400">
                        AI check:{" "}
                        {intake.ai_model === "fallback"
                          ? "basic review"
                          : intake.ai_model || "not run"}
                      </p>
                    </aside>
                    <div className="min-w-0 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0875b7]">
                            AI understood
                          </p>
                          <h2 className="mt-1 break-words text-lg font-semibold [overflow-wrap:anywhere]">
                            {proposal.summary || "Phone instruction"}
                          </h2>
                        </div>
                        {intake.status === "confirmed" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            <Check className="h-3.5 w-3.5" />
                            Added
                          </span>
                        ) : intake.status === "cancelled" ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            Skipped
                          </span>
                        ) : intake.status === "failed" ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            Needs recheck
                          </span>
                        ) : null}
                      </div>
                      <StructuredPreview proposal={proposal} />
                      {proposal.missingInformation?.length ? (
                        <div className="mt-3 min-w-0 break-words rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 [overflow-wrap:anywhere]">
                          <strong>Check before approval:</strong>{" "}
                          {proposal.missingInformation.join(" · ")}
                        </div>
                      ) : null}
                      {completedRequestId ? (
                        <Link
                          href={`/owner/materials/requests/${completedRequestId}`}
                          className="mt-4 inline-flex text-sm font-semibold text-[#0875b7] hover:underline"
                        >
                          Open created material request →
                        </Link>
                      ) : null}
                      {["pending", "needs_follow_up", "failed"].includes(
                        intake.status,
                      ) ? (
                        <div className="mt-5 border-t border-slate-200 pt-4">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                            <form action={reviewTrustedSmsIntakeAction}>
                              <input
                                type="hidden"
                                name="intakeId"
                                value={intake.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Run AI check again
                              </button>
                            </form>
                            {intake.status !== "failed" ? (
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                {type === "material_request" ? (
                                  <form
                                    action={confirmAuraIntakeAction}
                                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                                  >
                                    <input
                                      type="hidden"
                                      name="intakeId"
                                      value={intake.id}
                                    />
                                    <label className="text-[11px] font-semibold text-slate-600">
                                      Client
                                      <span className="mt-1 block">
                                        <select
                                          name="customerId"
                                          required
                                          defaultValue=""
                                          className="h-9 min-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm"
                                        >
                                          <option value="" disabled>
                                            Choose client…
                                          </option>
                                          {clientRows.map((client) => (
                                            <option
                                              key={client.id}
                                              value={client.id}
                                            >
                                              {client.full_name ||
                                                client.company_name ||
                                                client.email ||
                                                "Client"}
                                            </option>
                                          ))}
                                        </select>
                                      </span>
                                    </label>
                                    <button
                                      type="submit"
                                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0875b7] px-4 text-xs font-bold text-white hover:bg-[#06679f]"
                                    >
                                      <Check className="h-4 w-4" />
                                      Approve & create request
                                    </button>
                                  </form>
                                ) : (
                                  <form action={confirmAuraIntakeAction}>
                                    <input
                                      type="hidden"
                                      name="intakeId"
                                      value={intake.id}
                                    />
                                    <button
                                      type="submit"
                                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0875b7] px-4 text-xs font-bold text-white hover:bg-[#06679f]"
                                    >
                                      <Check className="h-4 w-4" />
                                      Approve & add{" "}
                                      {labels[
                                        type as keyof typeof labels
                                      ]?.toLowerCase() || "item"}
                                    </button>
                                  </form>
                                )}
                                <form action={cancelAuraIntakeAction}>
                                  <input
                                    type="hidden"
                                    name="intakeId"
                                    value={intake.id}
                                  />
                                  <button
                                    type="submit"
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                  >
                                    Skip
                                  </button>
                                </form>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <h2 className="mt-3 text-lg font-semibold">
                {view === "waiting"
                  ? "No phone instructions are waiting"
                  : view === "done"
                    ? "No approved instructions yet"
                    : "No skipped instructions"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {view === "waiting"
                  ? "Send a natural instruction from your trusted phone and it will appear here."
                  : "Choose another tab to see your instruction history."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
