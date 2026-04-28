"use client";

import { useMemo, useState } from "react";

import type { WhatsAppSettings } from "@/lib/whatsapp-settings";

type Props = {
  initialSettings: WhatsAppSettings;
  readOnly: boolean;
};

type SaveState = {
  type: "idle" | "success" | "error";
  message: string;
};

export function SettingsForm({ initialSettings, readOnly }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ type: "idle", message: "" });

  const forbiddenFields = useMemo(
    () => [
      ["no_final_price", "No final price"],
      ["no_delivery_promise", "No delivery promise"],
      ["no_order_confirmation", "No order confirmation"],
      ["no_payment_confirmation", "No payment confirmation"],
      ["no_discount", "No discount"],
      ["no_supplier_commitment", "No supplier commitment"],
    ] as const,
    [],
  );

  const languageFields = useMemo(
    () => [
      ["hebrew", "Hebrew"],
      ["english", "English"],
      ["spanish", "Spanish"],
      ["auto_detect", "Auto detect"],
    ] as const,
    [],
  );

  const alertFields = useMemo(
    () => [
      ["urgent", "Urgent"],
      ["angry_customer", "Angry customer"],
      ["payment_question", "Payment question"],
      ["price_question", "Price question"],
      ["order_change", "Order change"],
      ["supplier_issue", "Supplier issue"],
    ] as const,
    [],
  );

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveState({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/admin/whatsapp/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistant_mode: settings.assistant_mode,
          safe_ack_message: settings.safe_ack_message,
          forbidden_rules: settings.forbidden_rules,
          languages: settings.languages,
          tone: settings.tone,
          alert_rules: settings.alert_rules,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        settings?: WhatsAppSettings;
      };

      if (!response.ok || !payload.ok || !payload.settings) {
        throw new Error(payload.error || "Failed to save WhatsApp settings.");
      }

      setSettings(payload.settings);
      setSaveState({ type: "success", message: "Temporary JSON settings saved successfully." });
    } catch (error) {
      setSaveState({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save WhatsApp settings.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="grid gap-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Temporary storage mode</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              These settings are stored in a server-side JSON file only until the Supabase migration is approved.
              {readOnly ? " On the live serverless runtime this page is currently preview-only." : ""}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs uppercase tracking-[0.16em] text-orange-700">
            temporary json only
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Assistant mode</span>
            <select
              value={settings.assistant_mode}
              onChange={(event) => setSettings((current) => ({ ...current, assistant_mode: event.target.value as WhatsAppSettings["assistant_mode"] }))}
              disabled={readOnly}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="off">Off</option>
              <option value="draft_only">Draft only</option>
              <option value="auto_ack_only">Auto acknowledge only</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Tone</span>
            <select
              value={settings.tone}
              onChange={(event) => setSettings((current) => ({ ...current, tone: event.target.value as WhatsAppSettings["tone"] }))}
              disabled={readOnly}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="warm_personal">Warm personal</option>
              <option value="professional">Professional</option>
              <option value="formal">Formal</option>
            </select>
          </label>
        </div>

        <label className="mt-5 grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Safe acknowledgement message</span>
          <textarea
            value={settings.safe_ack_message}
            onChange={(event) => setSettings((current) => ({ ...current, safe_ack_message: event.target.value }))}
            rows={4}
            disabled={readOnly}
            className="rounded-[24px] border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Forbidden rules</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Keep these protections on so no live pricing, commitments, or confirmations are sent automatically.
          </p>
          <div className="mt-5 grid gap-3">
            {forbiddenFields.map(([key, label]) => (
              <ToggleRow
                key={key}
                label={label}
                checked={settings.forbidden_rules[key]}
                disabled={readOnly}
                onChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    forbidden_rules: { ...current.forbidden_rules, [key]: checked },
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Languages</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enable language handling options for the future draft workflow. This does not enable outbound sending.
          </p>
          <div className="mt-5 grid gap-3">
            {languageFields.map(([key, label]) => (
              <ToggleRow
                key={key}
                label={label}
                checked={settings.languages[key]}
                disabled={readOnly}
                onChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    languages: { ...current.languages, [key]: checked },
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Alert rules</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            These flags mark message types that should surface for admin review later.
          </p>
          <div className="mt-5 grid gap-3">
            {alertFields.map(([key, label]) => (
              <ToggleRow
                key={key}
                label={label}
                checked={settings.alert_rules[key]}
                disabled={readOnly}
                onChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    alert_rules: { ...current.alert_rules, [key]: checked },
                  }))
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Safety guardrails</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          <li>• No outbound WhatsApp sending from this page</li>
          <li>• Auto replies remain disabled at runtime</li>
          <li>• No OpenClaw, Supabase, or migration changes happen here</li>
          <li>• Only behavior settings are saved — never secrets</li>
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSaving || readOnly}
            className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {readOnly ? "Preview only on live runtime" : isSaving ? "Saving…" : "Save temporary settings"}
          </button>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Last updated: {new Date(settings.updated_at).toLocaleString()}
          </div>
        </div>

        {saveState.type !== "idle" ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              saveState.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {saveState.message}
          </div>
        ) : null}
      </section>
    </form>
  );
}

type ToggleRowProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ label, checked, disabled = false, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}
