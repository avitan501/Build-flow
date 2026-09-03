import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSignedInProfile } from "@/lib/auth";
import {
  PROJECT_UPLOAD_STORAGE_BUCKET,
  type ProjectEventRecord,
  type ProjectRecord,
  type ProjectUploadRecord,
} from "@/lib/projects";
import type { ExtractedWindowScheduleItem } from "@/lib/window-schedule-extraction";
import { formatSiteDateTime } from "@/lib/site-date-time";

type WindowUploadReviewPageProps = {
  params: Promise<{ uploadId: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

type WindowScheduleMetadata = {
  status?: string;
  notes?: string | null;
  items?: ExtractedWindowScheduleItem[];
};

const reviewMessages = {
  "window-schedule-uploaded": { tone: "success", text: "Window schedule uploaded. Review the extracted rows before quoting." },
} as const;

function formatDate(value: string) {
  return formatSiteDateTime(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function normalizeScheduleMetadata(event: ProjectEventRecord | null): WindowScheduleMetadata {
  const metadata = event?.metadata || {};
  const schedule = metadata.window_schedule;
  if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) {
    return { items: [], notes: "No extraction result was found for this upload." };
  }

  const typedSchedule = schedule as WindowScheduleMetadata;
  return {
    status: typedSchedule.status,
    notes: typeof typedSchedule.notes === "string" ? typedSchedule.notes : null,
    items: Array.isArray(typedSchedule.items) ? typedSchedule.items : [],
  };
}

export default async function WindowUploadReviewPage({ params, searchParams }: WindowUploadReviewPageProps) {
  const { uploadId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const successCode = resolvedSearchParams.success?.trim();
  const { supabase, user } = await requireSignedInProfile();

  const { data: upload, error: uploadError } = await supabase
    .from("project_uploads")
    .select("id, project_id, owner_id, file_name, file_path, file_type, file_size, status, created_at")
    .eq("id", uploadId)
    .eq("owner_id", user.id)
    .maybeSingle<ProjectUploadRecord>();

  if (uploadError || !upload) {
    notFound();
  }

  const [{ data: project }, { data: events }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, owner_id, name, address, status, created_at, updated_at")
      .eq("id", upload.project_id)
      .eq("owner_id", user.id)
      .maybeSingle<ProjectRecord>(),
    supabase
      .from("project_events")
      .select("id, project_id, owner_id, event_type, source, title, description, metadata, created_at")
      .eq("project_id", upload.project_id)
      .eq("owner_id", user.id)
      .contains("metadata", { upload_id: upload.id })
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<ProjectEventRecord[]>(),
  ]);

  if (!project) {
    throw new Error("Failed to load window schedule project.");
  }

  const { data: signed } = await supabase.storage.from(PROJECT_UPLOAD_STORAGE_BUCKET).createSignedUrl(upload.file_path, 60 * 30);
  const event = events?.[0] ?? null;
  const schedule = normalizeScheduleMetadata(event);
  const items = schedule.items ?? [];
  const feedback = successCode && reviewMessages[successCode as keyof typeof reviewMessages];

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-5 pb-28 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Window schedule review</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{project.name}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Review extracted windows before quoting or supplier pricing.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">{upload.status}</span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">{items.length} row{items.length === 1 ? "" : "s"}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">Sierra Pacific</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/shop/window?project=${project.id}`} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
                Back to Window
              </Link>
              <Link href={`/projects/${project.id}#documents`} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-semibold text-sky-700">
                Project documents
              </Link>
            </div>
          </div>
        </section>

        {feedback ? (
          <section className={`rounded-[22px] border p-4 text-sm ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
            {feedback.text}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Source file</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">File</div>
                <div className="mt-2 font-semibold text-slate-900">{upload.file_name}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Uploaded</div>
                <div className="mt-2 font-semibold text-slate-900">{formatDate(upload.created_at)}</div>
              </div>
              {signed?.signedUrl ? (
                <a href={signed.signedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">
                  Open uploaded file
                </a>
              ) : null}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {schedule.notes || "No extraction notes yet."}
            </div>
          </article>

          <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Extracted windows</h2>
            {items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                No window rows were extracted yet. The uploaded file is saved to the project, and this upload is ready for manual review.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[920px] w-full border-collapse bg-white text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Mark</th>
                      <th className="px-3 py-3">Qty</th>
                      <th className="px-3 py-3">Location</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Size</th>
                      <th className="px-3 py-3">RO</th>
                      <th className="px-3 py-3">Glass</th>
                      <th className="px-3 py-3">Operation</th>
                      <th className="px-3 py-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={`${item.mark || "window"}-${index}`} className="align-top">
                        <td className="px-3 py-3 font-semibold text-slate-950">{valueOrDash(item.mark)}</td>
                        <td className="px-3 py-3">{valueOrDash(item.quantity)}</td>
                        <td className="px-3 py-3">{valueOrDash(item.location)}</td>
                        <td className="px-3 py-3">{valueOrDash(item.windowType)}</td>
                        <td className="px-3 py-3">{item.width || item.height ? `${valueOrDash(item.width)} x ${valueOrDash(item.height)}` : "—"}</td>
                        <td className="px-3 py-3">{item.roughOpeningWidth || item.roughOpeningHeight ? `${valueOrDash(item.roughOpeningWidth)} x ${valueOrDash(item.roughOpeningHeight)}` : "—"}</td>
                        <td className="px-3 py-3">{valueOrDash(item.glass)}</td>
                        <td className="px-3 py-3">{valueOrDash(item.operation)}</td>
                        <td className="px-3 py-3">{item.confidence === null ? "—" : `${Math.round((item.confidence || 0) * 100)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
