"use client"

import { CalendarClock, ChevronDown, Download, FileText, Mail, MessageCircle, MessageSquareText, Paperclip, Phone, Plus, Route, Send, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoAttachmentMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions"
import { previewRequestClientQuoteAction, saveRequestSupplierPlanAction, scheduleRequestDeliveryAction, sendClientReplyAction, sendRequestClientQuoteAction, updateRequestWorkflowStepAction, type RequestClientQuoteInput } from "@/app/owner/materials/requests/actions"
import { LocationAutocomplete } from "@/components/buildflow/location-autocomplete"
import { RelatedEmailTimeline, type RelatedEmailItem } from "@/components/buildflow/related-email-timeline"
import { OPEN_REQUEST_CLIENT_CONTACT_EVENT } from "@/components/buildflow/request-client-contact"
import { RequestWorkflowStepHeader, workflowStepCardClass } from "@/components/buildflow/request-workflow-step-header"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"
import type { ManagerPipelineStage } from "@/lib/manager-dashboard"
import { DEFAULT_PROPOSAL_TERMS } from "@/lib/proposal-terms"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }
type QuoteLine = { key: string; description: string; quantity: number; unit: string; unitPrice: number }
export type RequestComparisonSummary = { id: string; title: string; status: string; quoteNumber: string; updatedAt: string; bids: Array<{ id: string; supplierName: string; landedTotal: number; pricedItemCount: number; itemCount: number; recommended: boolean }> }

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"

const REPLY_BLOCKS = [
  { id: "received", label: "Order received", text: "We received your order and are reviewing it now." },
  { id: "question", label: "I have a question", text: "I have a question about your request before we continue." },
  { id: "pricing", label: "Pricing is ready", text: "Your pricing is ready. Please review the attached quote." },
  { id: "missing", label: "Ask for missing details", text: "Please reply with the missing information so we can complete your request." },
  { id: "delivery", label: "Delivery scheduled", text: "Your material delivery is scheduled." },
] as const

function deliveryDateLabel(value: string) {
  if (!value) return ""
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
}

function deliveryTimeLabel(value: string) {
  if (!value) return ""
  const [hours, minutes] = value.split(":").map(Number)
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function deliveryWindowEndTime(startTime: string, durationHours: number) {
  if (!/^\d{2}:\d{2}$/.test(startTime) || !Number.isFinite(durationHours)) return ""
  const [hours, minutes] = startTime.split(":").map(Number)
  const endMinutes = hours * 60 + minutes + Math.round(durationHours * 60)
  if (endMinutes >= 24 * 60) return ""
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`
}

export function RequestManagementPanel({
  requestId,
  requestTitle,
  client,
  departments,
  suppliers,
  packages,
  requestItems,
  projectAddress,
  currentStage,
  comparisons,
  clientReplyCompleted,
  step3CompletedOverride,
  step4CompletedOverride,
  initialManagerNotes,
  initialSupplierRecommendations,
  supplierEmails,
  clientEmails,
}: {
  requestId: string
  requestTitle: string
  client: { name: string; email: string; phone: string }
  departments: string[]
  suppliers: SupplierRoutingOption[]
  packages: PackageRoute[]
  requestItems: Array<{ id: string; name: string; quantity: number; unit: string | null; reviewReasons: string[] }>
  projectAddress: string
  currentStage: ManagerPipelineStage
  comparisons: RequestComparisonSummary[]
  clientReplyCompleted: boolean
  step3CompletedOverride: boolean | null
  step4CompletedOverride: boolean | null
  initialManagerNotes: string
  initialSupplierRecommendations: Array<{ supplierId: string; isRecommended: boolean; shouldContact: boolean }>
  supplierEmails: RelatedEmailItem[]
  clientEmails: RelatedEmailItem[]
}) {
  const router = useRouter()
  const [supplierIds, setSupplierIds] = useState<string[]>(() => initialSupplierRecommendations.filter((entry) => entry.shouldContact).map((entry) => entry.supplierId))
  const [recommendedSupplierIds, setRecommendedSupplierIds] = useState<string[]>(() => initialSupplierRecommendations.filter((entry) => entry.isRecommended).map((entry) => entry.supplierId))
  const [managerNotes, setManagerNotes] = useState(initialManagerNotes)
  const [greeting, setGreeting] = useState<"hi" | "hello" | "morning" | "afternoon">("hi")
  const [replyBlock, setReplyBlock] = useState<string>(() => requestItems.some((item) => item.reviewReasons.length) ? "missing" : "received")
  const [replyNote, setReplyNote] = useState("")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "whatsapp" | "text">(client.email ? "email" : "whatsapp")
  const [feedback, setFeedback] = useState("")
  const [feedbackError, setFeedbackError] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState("")
  const [deliveryWindowStart, setDeliveryWindowStart] = useState("")
  const [deliveryWindowHours, setDeliveryWindowHours] = useState("2")
  const [deliveryAddress, setDeliveryAddress] = useState(projectAddress)
  const [clientReplyDone, setClientReplyDone] = useState(clientReplyCompleted)
  const [contactOpen, setContactOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteNumber, setQuoteNumber] = useState(() => `AVA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
  const [issueDate] = useState(() => new Date().toLocaleDateString("en-US"))
  const [clientAddress, setClientAddress] = useState("")
  const [shipTo, setShipTo] = useState(projectAddress)
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>(() => requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: 0 })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [salesTaxRate, setSalesTaxRate] = useState(8.875)
  const [taxableDelivery, setTaxableDelivery] = useState(true)
  const [taxRecommendation, setTaxRecommendation] = useState("")
  const [quoteTerms, setQuoteTerms] = useState(DEFAULT_PROPOSAL_TERMS)
  const [quoteMessage, setQuoteMessage] = useState("Please review the attached Avantia Build estimate. Reply with any questions or approval.")
  const [includeAch, setIncludeAch] = useState(false)
  const [ach, setAch] = useState({ bankName: "", accountOwner: "", routingNumber: "", accountNumber: "" })
  const [quoteFeedback, setQuoteFeedback] = useState("")
  const [pending, startTransition] = useTransition()
  const pendingRef = useRef(pending)
  const contactDialogRef = useRef<HTMLElement | null>(null)
  const quoteDialogRef = useRef<HTMLElement | null>(null)
  const contactTriggerRef = useRef<HTMLElement | null>(null)
  const routeDepartment = departments.length === 1 ? departments[0] : departments.length > 1 ? "Multiple departments" : "Others"
  const availableSuppliers = useMemo(() => [...suppliers].sort((left, right) => left.name.localeCompare(right.name)), [suppliers])

  const firstName = client.name.trim().split(/\s+/)[0] || "there"
  const missingQuestions = useMemo(() => requestItems.flatMap((item) => item.reviewReasons.map((reason) => `${item.name}: ${reason}`)), [requestItems])
  const deliveryWindowHoursNumber = Number(deliveryWindowHours)
  const deliveryWindowEnd = useMemo(() => deliveryWindowEndTime(deliveryWindowStart, deliveryWindowHoursNumber), [deliveryWindowHoursNumber, deliveryWindowStart])
  const deliveryWindowReady = Boolean(deliveryDate && deliveryWindowStart && deliveryWindowEnd && deliveryAddress.trim() && deliveryWindowHoursNumber >= 0.5 && deliveryWindowHoursNumber <= 12)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  const clientMessage = useMemo(() => {
    const greetingText = greeting === "hello" ? `Hello ${client.name || "there"},` : greeting === "morning" ? `Good morning ${firstName},` : greeting === "afternoon" ? `Good afternoon ${firstName},` : `Hi ${firstName},`
    const selectedText = REPLY_BLOCKS.filter((block) => block.id === replyBlock).flatMap((block) => {
      if (block.id === "missing" && missingQuestions.length) return ["To finish pricing, please confirm:", ...missingQuestions.map((question) => `- ${question}`)]
      if (block.id === "delivery") return [
        block.text,
        ...(deliveryDate ? [`Date: ${deliveryDateLabel(deliveryDate)}`] : []),
        ...(deliveryWindowStart && deliveryWindowEnd ? [`Delivery window: Between ${deliveryTimeLabel(deliveryWindowStart)} and ${deliveryTimeLabel(deliveryWindowEnd)} (${deliveryWindowHoursNumber.toLocaleString()} hour${deliveryWindowHoursNumber === 1 ? "" : "s"})`] : []),
        ...(deliveryAddress.trim() ? [`Address: ${deliveryAddress.trim()}`] : []),
      ]
      return [block.text]
    })
    return [greetingText, "", ...selectedText, ...(replyNote.trim() ? [replyNote.trim()] : []), "", `Request: ${requestTitle}`, "", "Thank you,", "Avantia Build"].join("\n")
  }, [client.name, deliveryAddress, deliveryDate, deliveryWindowEnd, deliveryWindowHoursNumber, deliveryWindowStart, firstName, greeting, missingQuestions, replyBlock, replyNote, requestTitle])

  useEffect(() => {
    function openContact() {
      contactTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setContactOpen(true)
    }
    window.addEventListener(OPEN_REQUEST_CLIENT_CONTACT_EVENT, openContact)
    return () => window.removeEventListener(OPEN_REQUEST_CLIENT_CONTACT_EVENT, openContact)
  }, [])

  useEffect(() => {
    if (!contactOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focusFrame = window.requestAnimationFrame(() => {
      contactDialogRef.current?.querySelector<HTMLElement>("button, input, select, textarea, a[href]")?.focus()
    })
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) {
        setContactOpen(false)
        window.setTimeout(() => contactTriggerRef.current?.focus(), 0)
        return
      }
      if (event.key !== "Tab") return
      const focusable = Array.from(
        contactDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [contactOpen])

  useEffect(() => {
    if (!quoteOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focusFrame = window.requestAnimationFrame(() => {
      quoteDialogRef.current?.querySelector<HTMLElement>("button, input, select, textarea, a[href]")?.focus()
    })
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) {
        setQuoteOpen(false)
        setContactOpen(true)
        return
      }
      if (event.key !== "Tab") return
      const focusable = Array.from(
        quoteDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [quoteOpen])

  function closeContact() {
    if (pending) return
    setContactOpen(false)
    window.setTimeout(() => contactTriggerRef.current?.focus(), 0)
  }

  function openQuote() {
    setContactOpen(false)
    setQuoteOpen(true)
  }

  function closeQuote() {
    if (pending) return
    setQuoteOpen(false)
    setContactOpen(true)
  }

  function toggleSupplier(supplierId: string) {
    setSupplierIds((current) => current.includes(supplierId) ? current.filter((id) => id !== supplierId) : [...current, supplierId])
    setRecommendedSupplierIds((current) => current.includes(supplierId) ? current : [...current, supplierId])
  }

  function toggleRecommendedSupplier(supplierId: string) {
    setRecommendedSupplierIds((current) => current.includes(supplierId) ? current.filter((id) => id !== supplierId) : [...current, supplierId])
    if (recommendedSupplierIds.includes(supplierId)) setSupplierIds((current) => current.filter((id) => id !== supplierId))
  }

  async function saveSupplierPlan() {
    const chosen = new Set([...recommendedSupplierIds, ...supplierIds])
    const result = await saveRequestSupplierPlanAction({ requestId, managerNotes, suppliers: [...chosen].map((supplierId) => ({ supplierId, isRecommended: recommendedSupplierIds.includes(supplierId), shouldContact: supplierIds.includes(supplierId) })) })
    setFeedbackError(!result.ok)
    setFeedback(result.ok ? "Request notes and supplier choices saved." : result.error)
    return result.ok
  }

  function createSupplierRequest() {
    if (!supplierIds.length) return
    startTransition(async () => {
      if (!await saveSupplierPlan()) return
      const query = new URLSearchParams({ department: routeDepartment })
      supplierIds.forEach((supplierId) => query.append("supplier", supplierId))
      router.push(`/owner/materials/requests/${requestId}/supplier-request?${query.toString()}`)
    })
  }

  function saveDeliverySchedule() {
    startTransition(async () => {
      setFeedback("")
      const result = await scheduleRequestDeliveryAction({ requestId, date: deliveryDate, startTime: deliveryWindowStart, durationHours: deliveryWindowHoursNumber, address: deliveryAddress })
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? "Delivery schedule saved. The client message is ready to send." : result.error)
      if (result.ok) setReplyBlock("delivery")
    })
  }

  function sendClientEmail() {
    startTransition(async () => {
      setFeedback("")
      const formData = new FormData()
      formData.set("requestId", requestId)
      formData.set("message", clientMessage)
      if (attachment) formData.set("attachment", attachment)
      const result = await sendClientReplyAction(formData)
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? `Email sent directly to ${client.email}.` : result.error)
      if (result.ok) setClientReplyDone(true)
    })
  }

  function sendClientText() {
    startTransition(async () => {
      setFeedback("")
      if (!attachment) {
        const result = await sendAuraMessageAction({ channel: "sms", recipient: client.phone, message: clientMessage })
        setFeedbackError(!result.ok)
        setFeedback(result.ok ? `Text sent directly to ${client.phone} from Q U O.` : result.error)
        if (result.ok) {
          setClientReplyDone(true)
          await updateRequestWorkflowStepAction({ requestId, step: 4, completed: true })
        }
        return
      }
      const formData = new FormData()
      formData.set("phone", client.phone)
      formData.set("message", clientMessage)
      formData.set("attachment", attachment)
      const prepared = await prepareQuoAttachmentMessageAction(formData)
      if (!prepared.ok) {
        setFeedbackError(true)
        setFeedback(prepared.error)
        return
      }
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.location.href = prepared.deepLink
      } else {
        await navigator.clipboard?.writeText(clientMessage).catch(() => undefined)
        window.open(prepared.quoWebUrl, "_blank", "noopener,noreferrer")
        window.open(prepared.attachmentUrl, "_blank", "noopener,noreferrer")
      }
      setFeedbackError(false)
      setFeedback("Q U O is ready with the message and file. Review it and press Send.")
    })
  }

  function sendClientWhatsApp() {
    startTransition(async () => {
      setFeedback("")
      const result = await sendAuraMessageAction({ channel: "whatsapp", recipient: client.phone, message: clientMessage })
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? `WhatsApp message sent to ${client.phone}.` : result.error)
      if (result.ok) {
        setClientReplyDone(true)
        await updateRequestWorkflowStepAction({ requestId, step: 4, completed: true })
      }
    })
  }

  const quoteSubtotal = quoteLines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0)
  const quoteTax = (quoteSubtotal + (taxableDelivery ? deliveryCharge : 0)) * salesTaxRate / 100
  const quoteTotal = quoteSubtotal + deliveryCharge + quoteTax

  function quoteInput(): RequestClientQuoteInput {
    return {
      requestId,
      quoteNumber,
      issueDate,
      expiresOn: "",
      clientAddress,
      shipTo,
      message: quoteMessage,
      lines: quoteLines.map(({ description, quantity, unit, unitPrice }) => ({ description, quantity, unit, unitPrice })),
      deliveryCharge,
      salesTaxRate,
      taxableDelivery,
      terms: quoteTerms,
      ach: includeAch ? ach : undefined,
    }
  }

  function updateQuoteLine(key: string, patch: Partial<QuoteLine>) {
    setQuoteLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line))
  }

  function downloadQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await previewRequestClientQuoteAction(quoteInput())
      if (!result.ok || !result.pdfBase64 || !result.fileName) return setQuoteFeedback(result.ok ? "The PDF could not be prepared." : result.error)
      const bytes = Uint8Array.from(atob(result.pdfBase64), (character) => character.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))
      const link = document.createElement("a")
      link.href = url
      link.download = result.fileName
      link.click()
      URL.revokeObjectURL(url)
      setQuoteFeedback("Estimate PDF downloaded for review.")
    })
  }

  function textQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await previewRequestClientQuoteAction(quoteInput())
      if (!result.ok || !result.pdfBase64 || !result.fileName) return setQuoteFeedback(result.ok ? "The PDF could not be prepared." : result.error)
      const bytes = Uint8Array.from(atob(result.pdfBase64), (character) => character.charCodeAt(0))
      const file = new File([bytes], result.fileName, { type: "application/pdf" })
      const formData = new FormData()
      formData.set("phone", client.phone)
      formData.set("message", quoteMessage.trim() || `Hello ${firstName}, your Avantia Build estimate is attached.`)
      formData.set("attachment", file)
      const prepared = await prepareQuoAttachmentMessageAction(formData)
      if (!prepared.ok) return setQuoteFeedback(prepared.error)
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.location.href = prepared.deepLink
      } else {
        await navigator.clipboard?.writeText(quoteMessage).catch(() => undefined)
        window.open(prepared.quoWebUrl, "_blank", "noopener,noreferrer")
        window.open(prepared.attachmentUrl, "_blank", "noopener,noreferrer")
      }
      setQuoteFeedback("The estimate and message are ready in Q U O. Review them and press Send.")
    })
  }

  function sendQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await sendRequestClientQuoteAction(quoteInput())
      setQuoteFeedback(result.ok ? `Estimate emailed to ${client.email}.` : result.error)
      if (result.ok) {
        setFeedback(`Estimate ${quoteNumber} emailed to ${client.email}.`)
        setClientReplyDone(true)
      }
    })
  }

  const supplierQuoteCount = comparisons.reduce((total, comparison) => total + comparison.bids.length, 0)
  const pricingComplete = step3CompletedOverride ?? supplierQuoteCount > 0
  const pricingStatus = pricingComplete ? "complete" : currentStage === "pricing" ? "active" : "upcoming"
  const replyComplete = step4CompletedOverride ?? clientReplyDone

  return (
    <div className="grid gap-2">
      <details open={currentStage === "pricing"} className={workflowStepCardClass()}>
        <RequestWorkflowStepHeader requestId={requestId} step={3} title="Get supplier pricing" detail={supplierQuoteCount ? `${supplierQuoteCount} supplier quote${supplierQuoteCount === 1 ? "" : "s"} received` : packages.length ? `${packages.length} supplier request${packages.length === 1 ? "" : "s"} sent` : "No supplier prices received yet"} status={pricingStatus} icon="pricing" />
        <div className="border-t border-slate-200 p-4">
          {comparisons.length ? <p className="mb-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">Supplier prices are shown beside each request item in the table above.</p> : <p className="mb-3 rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">Supplier answers and prices will appear beside each item after a quote is linked.</p>}

          <RelatedEmailTimeline title="Supplier email" emails={supplierEmails} />

          <details id="supplier-routing" className="group/route scroll-mt-24 rounded-md border border-slate-200 bg-slate-50">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold"><span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-sky-700" />Find Supplier</span><ChevronDown className="h-4 w-4 text-slate-400 transition group-open/route:rotate-180" /></summary>
            <div className="border-t border-slate-200 p-3">
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">Request notes<textarea value={managerNotes} onChange={(event) => setManagerNotes(event.target.value)} rows={3} maxLength={5000} placeholder="Add instructions for Carlos, supplier preferences, delivery details, or anything important." className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-950 outline-none focus:border-sky-500" /></label>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Recommended suppliers</legend>
              <p className="mt-0.5 text-xs text-slate-500">Mark suppliers worth considering, then choose exactly who Carlos should contact.</p>
              <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2">
                {availableSuppliers.length ? availableSuppliers.map((entry) => <div key={entry.id} className="flex min-h-12 items-center gap-3 rounded-md px-2 text-sm hover:bg-slate-50"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input aria-label={`Recommend ${entry.name}`} type="checkbox" checked={recommendedSupplierIds.includes(entry.id)} onChange={() => toggleRecommendedSupplier(entry.id)} className="h-4 w-4 rounded border-slate-300 accent-amber-500" /><span className="min-w-0"><span className="block truncate font-semibold">{entry.name}</span><span className="block truncate text-xs text-slate-500">{entry.email || entry.phone || entry.whatsapp || "No contact method"} · {(entry.trustLevel || "not-reviewed").replaceAll("-", " ")}</span></span></label><label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold"><input aria-label={`Contact ${entry.name}`} type="checkbox" checked={supplierIds.includes(entry.id)} onChange={() => toggleSupplier(entry.id)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" />Contact</label></div>) : <p className="px-2 py-4 text-center text-sm leading-5 text-slate-500">No suppliers are saved in Supplier Directory.</p>}
              </div>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => startTransition(async () => { await saveSupplierPlan() })} disabled={pending} className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-50">Save notes & choices</button><button type="button" onClick={createSupplierRequest} disabled={!supplierIds.length || pending} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-3 text-xs font-bold text-white disabled:opacity-50"><Route className="h-4 w-4" />Contact {supplierIds.length || ""} supplier{supplierIds.length === 1 ? "" : "s"}</button></div>
          </div>
          {packages.length ? <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current routes</p><div className="mt-2 grid gap-2">{packages.map((pkg) => <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{pkg.department}</span><span className="text-right text-slate-600">{suppliers.find((entry) => entry.id === pkg.supplier_id)?.name || "Not assigned"} · {pkg.status.replaceAll("_", " ")}</span></div>)}</div></div> : null}
            </div>
          </details>
        </div>
      </details>

      {contactOpen && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[145] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="request-client-contact-title" onMouseDown={(event) => { if (event.currentTarget === event.target) closeContact() }}>
          <section ref={contactDialogRef} id="request-client-contact-dialog" className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">Available at every stage</p><h2 id="request-client-contact-title" className="truncate text-lg font-bold">Contact client</h2><p className="text-xs text-slate-500">{replyComplete ? "Client contacted · send another update when needed" : "Message, estimate, or delivery"}</p></div>
              <button type="button" onClick={closeContact} disabled={pending} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white disabled:opacity-40" aria-label="Close contact client"><X className="h-4 w-4" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <RelatedEmailTimeline title="Client email" emails={clientEmails} />
          <div>
            {missingQuestions.length ? <p className="mt-1 text-xs font-semibold text-amber-700">{missingQuestions.length} missing details can be added to the reply automatically.</p> : null}

            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold"><span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-emerald-700" />Schedule delivery</span><ChevronDown className="h-4 w-4 text-slate-400" /></summary>
              <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1 text-xs font-bold text-slate-600">Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-600">Window starts<input type="time" value={deliveryWindowStart} onChange={(event) => setDeliveryWindowStart(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-600">Window length (hours)<input type="number" min="0.5" max="12" step="0.5" value={deliveryWindowHours} onChange={(event) => setDeliveryWindowHours(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Delivery address<input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Jobsite delivery address" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950" /></label>
                {deliveryWindowStart && !deliveryWindowEnd ? <p className="text-xs font-bold text-rose-700 sm:col-span-2 lg:col-span-3">Choose a shorter window that ends before midnight.</p> : null}
                <button type="button" onClick={saveDeliverySchedule} disabled={pending || !deliveryWindowReady} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2 lg:col-span-3"><CalendarClock className="h-4 w-4" />{pending ? "Saving..." : "Save window and prepare client message"}</button>
              </div>
            </details>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-slate-600">Greeting<select value={greeting} onChange={(event) => setGreeting(event.target.value as typeof greeting)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950"><option value="hi">Hi {firstName}</option><option value="hello">Hello</option><option value="morning">Good morning</option><option value="afternoon">Good afternoon</option></select></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Follow-up<select value={replyBlock} onChange={(event) => setReplyBlock(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950">{REPLY_BLOCKS.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}</select></label>
            </div>

            <label className="mt-3 grid gap-1 text-xs font-bold text-slate-600">Add a note <span className="font-normal text-slate-400">(optional)</span><textarea value={replyNote} onChange={(event) => setReplyNote(event.target.value)} rows={2} placeholder="Write a short note" className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-[#0066cc]">Preview message</summary><div className="whitespace-pre-wrap border-t border-slate-200 px-3 py-3 text-sm leading-6 text-slate-700" aria-label="Reply preview">{clientMessage}</div></details>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8b6a27]">Contact client</p>
              <p className="mt-1 text-sm font-semibold text-[#12263f]">Choose how you want to send this update.</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
              <button type="button" onClick={() => setDeliveryMethod("email")} disabled={!client.email} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition sm:text-sm ${deliveryMethod === "email" ? "bg-[#17304f] text-white shadow-sm" : "text-slate-600 hover:bg-white"} disabled:opacity-40`}><Mail className="h-4 w-4" />Email</button>
              <button type="button" onClick={() => setDeliveryMethod("whatsapp")} disabled={!client.phone} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition sm:text-sm ${deliveryMethod === "whatsapp" ? "bg-[#17304f] text-white shadow-sm" : "text-slate-600 hover:bg-white"} disabled:opacity-40`}><MessageCircle className="h-4 w-4" />WhatsApp</button>
              <button type="button" onClick={() => setDeliveryMethod("text")} disabled={!client.phone} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition sm:text-sm ${deliveryMethod === "text" ? "bg-[#17304f] text-white shadow-sm" : "text-slate-600 hover:bg-white"} disabled:opacity-40`}><MessageSquareText className="h-4 w-4" />Q U O Text</button>
            </div>

            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-sm font-semibold text-slate-700"><Paperclip className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{attachment?.name || "Attach quote, order, photo, or file (optional)"}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.tif,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.mp4,.mov" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="sr-only" /></label>
            {deliveryMethod === "text" && attachment ? <p className="mt-2 text-xs font-medium text-slate-600">Q U O supports common files up to 5 MB. Review the prepared message in Q U O and press Send.</p> : null}
            {deliveryMethod === "whatsapp" && attachment ? <p className="mt-2 text-xs font-semibold text-amber-700">For this attachment, choose Email or Q U O Text. WhatsApp sends the written message only.</p> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {deliveryMethod === "email" ? <button type="button" onClick={sendClientEmail} disabled={pending || !client.email} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17304f] px-4 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />{pending ? "Sending..." : "Send email"}</button> : deliveryMethod === "whatsapp" ? <button type="button" onClick={sendClientWhatsApp} disabled={pending || !client.phone || Boolean(attachment)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17304f] px-4 text-sm font-bold text-white disabled:opacity-45"><MessageCircle className="h-4 w-4" />{pending ? "Sending..." : "Send WhatsApp"}</button> : <button type="button" onClick={sendClientText} disabled={pending || !client.phone} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#17304f] px-4 text-sm font-bold text-white disabled:opacity-50"><MessageSquareText className="h-4 w-4" />{pending ? "Preparing..." : attachment ? "Open Q U O with file" : "Send Q U O text"}</button>}
              {client.phone ? <a href={`tel:${client.phone}`} className={`${actionClass} min-h-12 border-[#cda548] text-[#17304f]`}><Phone className="h-4 w-4" />Call client</a> : null}
            </div>
            {feedback ? <p className={`mt-3 rounded-lg border px-4 py-3 text-sm font-semibold ${feedbackError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status">{feedback}</p> : null}
            <button type="button" onClick={openQuote} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#0071e3] bg-sky-50 px-4 text-sm font-bold text-[#0066cc]"><FileText className="h-4 w-4" />Create and send estimate</button>
          </div>

            </div>
          </section>
        </div>, document.body) : null}
      {feedback && !contactOpen ? <p className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${feedbackError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status">{feedback}</p> : null}

      {quoteOpen && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-slate-950/55 p-2 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="request-quote-title" onMouseDown={(event) => { if (event.currentTarget === event.target) closeQuote() }}>
        <section ref={quoteDialogRef} className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Avantia Build estimate</p><h2 id="request-quote-title" className="mt-0.5 text-xl font-bold">Create client quote</h2><p className="mt-0.5 text-xs text-slate-500">Review the PDF, then send it by email or text.</p></div><button type="button" onClick={closeQuote} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40" aria-label="Close"><X className="h-4 w-4" /></button></header>
          <div className="overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="grid gap-1 text-xs font-bold">Estimate code<input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold">Date<input value={issueDate} disabled className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold">Client<input value={client.name} disabled className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal" /></label>
              <label className="grid gap-1 text-xs font-bold sm:col-span-2">Customer address<textarea value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
              <LocationAutocomplete
                label="Ship to"
                value={shipTo}
                onChange={(value) => { setShipTo(value); setTaxRecommendation("") }}
                onSelect={(suggestion) => {
                  setShipTo(suggestion.label)
                  if (suggestion.taxRate !== null) {
                    setSalesTaxRate(suggestion.taxRate)
                    setTaxRecommendation(`${suggestion.taxRate.toFixed(3)}% destination rate · ${suggestion.taxJurisdiction}`)
                  } else {
                    setTaxRecommendation("Address verified. Confirm the destination sales-tax rate before sending.")
                  }
                }}
                placeholder="Street, city, state, ZIP"
                hint={<span className="text-xs font-normal text-slate-500">Choose a verified address to apply an available destination tax rate.</span>}
                className="sm:col-span-2"
              />
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[48rem] text-left text-xs"><thead className="bg-slate-950 text-white"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Unit price</th><th className="px-3 py-2 text-right">Total</th><th className="w-10" /></tr></thead><tbody>{quoteLines.map((line, index) => <tr key={line.key} className="border-b border-slate-200 last:border-b-0"><td className="px-3 py-2 font-bold">{index + 1}</td><td className="p-1.5"><input value={line.description} onChange={(event) => updateQuoteLine(line.key, { description: event.target.value })} className="h-9 w-full min-w-56 rounded-md border border-slate-300 px-2" /></td><td className="p-1.5"><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateQuoteLine(line.key, { quantity: Number(event.target.value) })} className="h-9 w-24 rounded-md border border-slate-300 px-2" /></td><td className="p-1.5"><input value={line.unit} onChange={(event) => updateQuoteLine(line.key, { unit: event.target.value })} className="h-9 w-24 rounded-md border border-slate-300 px-2" /></td><td className="p-1.5"><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateQuoteLine(line.key, { unitPrice: Number(event.target.value) })} className="h-9 w-28 rounded-md border border-slate-300 px-2" /></td><td className="px-3 py-2 text-right font-bold tabular-nums">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(line.quantity * line.unitPrice)}</td><td><button type="button" onClick={() => setQuoteLines((current) => current.filter((item) => item.key !== line.key))} className="inline-flex h-8 w-8 items-center justify-center text-slate-400 hover:text-rose-700" aria-label={`Remove item ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table>
            </div>
            <button type="button" onClick={() => setQuoteLines((current) => [...current, { key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold"><Plus className="h-3.5 w-3.5" />Add item</button>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-bold">Terms & conditions<textarea value={quoteTerms} onChange={(event) => setQuoteTerms(event.target.value)} rows={3} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <label className="grid gap-1 text-xs font-bold">Email message<textarea value={quoteMessage} onChange={(event) => setQuoteMessage(event.target.value)} rows={2} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                <label className="inline-flex min-h-10 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={includeAch} onChange={(event) => setIncludeAch(event.target.checked)} className="h-4 w-4 accent-[#0071e3]" />Include ACH payment information in this PDF</label>
                {includeAch ? <div className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold">Bank name<input value={ach.bankName} onChange={(event) => setAch({ ...ach, bankName: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Account owner<input value={ach.accountOwner} onChange={(event) => setAch({ ...ach, accountOwner: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Routing number<input type="password" inputMode="numeric" value={ach.routingNumber} onChange={(event) => setAch({ ...ach, routingNumber: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><label className="grid gap-1 text-xs font-bold">Account number<input type="password" value={ach.accountNumber} onChange={(event) => setAch({ ...ach, accountNumber: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-2 font-normal" /></label><p className="sm:col-span-2 text-[10px] font-semibold text-amber-800">These values are used only to create this PDF and are not saved in the customer request.</p></div> : null}
              </div>
              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteSubtotal)}</strong></div><label className="mt-3 flex items-center justify-between gap-3 text-sm"><span>Delivery</span><input type="number" min="0" step="0.01" value={deliveryCharge} onChange={(event) => setDeliveryCharge(Number(event.target.value))} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label><label className="mt-2 flex items-center justify-between gap-3 text-sm"><span>Sales tax % <span className="block text-[10px] font-normal text-slate-500">Destination rate</span></span><input type="number" min="0" max="20" step="0.001" value={salesTaxRate} onChange={(event) => { setSalesTaxRate(Number(event.target.value)); setTaxRecommendation("Rate edited manually") }} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label><label className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={taxableDelivery} onChange={(event) => setTaxableDelivery(event.target.checked)} className="mt-1" /><span>Include Avantia-billed delivery in the taxable amount</span></label>{taxRecommendation ? <p className="mt-2 text-xs font-semibold text-emerald-700">{taxRecommendation}</p> : <p className="mt-2 text-xs text-slate-500">Tax is calculated on materials and, when checked, Avantia-billed delivery.</p>}<div className="mt-3 flex justify-between border-t border-slate-300 pt-3 text-lg"><strong>Total</strong><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteTotal)}</strong></div></aside>
            </div>
            {quoteFeedback ? <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" role="status">{quoteFeedback}</p> : null}
          </div>
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3"><button type="button" onClick={downloadQuote} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold disabled:opacity-40"><Download className="h-4 w-4" />Download PDF</button><button type="button" onClick={textQuote} disabled={pending || !client.phone || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0071e3] bg-white px-4 text-sm font-bold text-[#0066cc] disabled:opacity-40"><MessageSquareText className="h-4 w-4" />Text estimate</button><button type="button" onClick={sendQuote} disabled={pending || !client.email || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />{pending ? "Working..." : "Email estimate"}</button></footer>
        </section>
      </div>, document.body) : null}
    </div>
  )
}
