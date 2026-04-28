import Link from "next/link";

import { PageStatusHeader, statusButtonClass } from "@/components/buildflow/wireframe";
import { requireAdminProfile } from "@/lib/auth";
import { getBuildflowWireframeData } from "@/lib/buildflow-wireframe";
import { getWhatsAppSettingsState } from "@/lib/whatsapp-settings";

import { SettingsForm } from "./SettingsForm";

export default async function AdminWhatsAppSettingsPage() {
  await requireAdminProfile();
  const { settings, readOnly, reason } = await getWhatsAppSettingsState();
  const { specMap } = getBuildflowWireframeData();
  const spec = specMap.get("admin-whatsapp-settings");

  if (!spec) {
    throw new Error("Missing admin WhatsApp settings wireframe spec.");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8 lg:px-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageStatusHeader
          title={spec.title}
          purpose={spec.purpose}
          status={spec.status}
          progress={spec.progress}
          missing={spec.missing}
          nextStep={spec.nextStep}
          audience={spec.audience}
          flow={spec.flow}
        />

        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">WhatsApp Operations</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Preview settings</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Admin-only behavior controls for the future WhatsApp workflow. This remains a preview shell until persistent storage is approved.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/whatsapp" className={statusButtonClass(spec.status)}>
                Back to Draft Inbox
              </Link>
              <div className={`rounded-2xl px-4 py-3 text-sm ${readOnly ? "border border-orange-200 bg-orange-50 text-orange-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {readOnly ? "Preview only on live runtime" : "Temporary JSON writes enabled locally"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Storage</div>
              <div className="mt-2 text-lg font-semibold">{readOnly ? "Read-only preview" : "Temporary JSON only"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Assistant mode</div>
              <div className="mt-2 text-lg font-semibold">{settings.assistant_mode.replaceAll("_", " ")}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Last updated</div>
              <div className="mt-2 text-lg font-semibold">{new Date(settings.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {reason ? (
          <div className="rounded-[28px] border border-orange-200 bg-orange-50 px-5 py-4 text-sm leading-6 text-orange-700 sm:px-6">
            {reason}
          </div>
        ) : null}

        <SettingsForm initialSettings={settings} readOnly={readOnly} />
      </section>
    </main>
  );
}
