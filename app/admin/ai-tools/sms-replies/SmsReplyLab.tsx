"use client"

import { useState, useTransition } from "react"
import { FlaskConical, ShieldCheck } from "lucide-react"

type LabResult = {
  reply: string
  autoSafe: boolean
  safetyLevel: "green" | "yellow" | "red"
  safetySignals: string[]
  safetyReason: string
  intent: string
  extractedItems: Array<{ name: string; quantity: number; unit: string }>
  model: string
  latencyMs: number
  inputTokens: number | null
  outputTokens: number | null
  estimatedCostUsd: number | null
  promptVersion: string
  noSend: boolean
}

const STARTERS: Record<string, Record<string, string>> = {
  en: { greeting: "Hi", material_request: "I need 40 sheets of 5/8 drywall and 8 buckets of compound.", pricing: "How much for 100 2x4 studs?", delivery: "Can you deliver tomorrow?", follow_up: "Any update on my quote?", sensitive: "Cancel my order and refund my card." },
  es: { greeting: "Hola", material_request: "Necesito 40 hojas de drywall 5/8 y 8 cubetas de compuesto.", pricing: "¿Cuánto cuestan 100 postes 2x4?", delivery: "¿Pueden entregar mañana?", follow_up: "¿Hay alguna actualización de mi cotización?", sensitive: "Cancele mi pedido y reembolse mi tarjeta." },
  he: { greeting: "שלום", material_request: "אני צריך 40 לוחות גבס 5/8 ו-8 דליים של שפכטל.", pricing: "כמה עולה 100 קורות 2x4?", delivery: "אפשר משלוח מחר?", follow_up: "יש עדכון להצעת המחיר שלי?", sensitive: "תבטלו את ההזמנה ותחזירו את התשלום." },
}

export function SmsReplyLab() {
  const [language, setLanguage] = useState("en")
  const [expectedIntent, setExpectedIntent] = useState("material_request")
  const [message, setMessage] = useState(STARTERS.en.material_request)
  const [result, setResult] = useState<LabResult | null>(null)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function changeScenario(nextLanguage: string, nextIntent: string) {
    setLanguage(nextLanguage)
    setExpectedIntent(nextIntent)
    setMessage(STARTERS[nextLanguage]?.[nextIntent] || "")
    setResult(null)
  }

  function runLab() {
    const testMessage = message.trim()
    if (!testMessage) return
    setError("")
    setResult(null)
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/communications/ai-quality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cases: [{ id: "manager-reply-lab", message: testMessage }] }),
        })
        const payload = await response.json() as { results?: LabResult[]; error?: string }
        if (!response.ok || !payload.results?.[0]) throw new Error(payload.error || "The reply lab could not run.")
        setResult(payload.results[0])
      } catch (labError) {
        setError(labError instanceof Error ? labError.message : "The reply lab could not run.")
      }
    })
  }

  return <section className="mt-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="manager-reply-lab">
    <div className="flex items-start gap-3"><FlaskConical className="mt-0.5 h-5 w-5 text-violet-600" /><div><h2 id="manager-reply-lab" className="font-bold text-slate-950">Manager Reply Lab</h2><p className="mt-1 text-xs leading-5 text-slate-500">Play customer against the real reply engine. This sandbox never sends an SMS and does not save the test conversation.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-slate-700">Language<select value={language} onChange={(event) => changeScenario(event.target.value, expectedIntent)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="en">English</option><option value="es">Spanish</option><option value="he">Hebrew</option></select></label>
      <label className="text-xs font-bold text-slate-700">Expected intent<select value={expectedIntent} onChange={(event) => changeScenario(language, event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="greeting">Greeting</option><option value="material_request">Material request</option><option value="pricing">Pricing</option><option value="delivery">Delivery</option><option value="follow_up">Follow-up</option><option value="sensitive">Protected topic</option></select></label>
    </div>
    <label className="mt-3 block text-xs font-bold text-slate-700">Customer message<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1600} rows={4} dir={language === "he" ? "rtl" : "ltr"} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6" /></label>
    <div className="mt-3 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />NO SEND</span><button type="button" onClick={runLab} disabled={pending || !message.trim()} className="min-h-11 rounded-lg bg-violet-700 px-4 text-xs font-bold text-white disabled:opacity-50">{pending ? "Testing…" : "Generate test reply"}</button></div>
    {error ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700" role="alert">{error}</p> : null}
    {result ? <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${result.safetyLevel === "green" ? "bg-emerald-100 text-emerald-800" : result.safetyLevel === "red" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{result.safetyLevel} · {result.autoSafe ? "eligible for auto-send" : "manager review"}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${result.intent === expectedIntent ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>Detected: {result.intent}</span></div>
      <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-900"><strong>Reply:</strong> {result.reply}</p>
      <p className="text-xs leading-5 text-slate-600"><strong>Why:</strong> {result.safetyReason}</p>
      {result.extractedItems.length ? <p className="text-xs leading-5 text-slate-600"><strong>Extracted:</strong> {result.extractedItems.map((item) => `${item.quantity} ${item.unit} ${item.name}`).join(" · ")}</p> : null}
      <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500"><span>{result.model}</span><span>{result.latencyMs} ms</span><span>{result.inputTokens ?? "—"} input tokens</span><span>{result.outputTokens ?? "—"} output tokens</span><span>{result.estimatedCostUsd === null ? "cost rate not configured" : `$${result.estimatedCostUsd.toFixed(6)}`}</span><span>{result.promptVersion}</span></div>
    </div> : null}
  </section>
}
