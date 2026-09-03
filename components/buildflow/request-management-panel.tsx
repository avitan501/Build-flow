"use client"

import { CalendarClock, CheckCircle2, ChevronDown, CreditCard, Download, FileCheck2, FileText, Mail, MessageCircle, MessageSquareText, Paperclip, Phone, Plus, ReceiptText, Route, Search, Send, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoAttachmentMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions"
import { openRequestPricingComparisonAction } from "@/app/admin/supplier-quotes/actions"
import { previewRequestClientQuoteAction, recordRequestClientDocumentSentAction, recordRequestPaymentLinkSentAction, saveRequestClientDocumentAction, saveRequestManagerNotesAction, saveRequestSupplierPlanAction, scheduleRequestDeliveryAction, sendClientReplyAction, sendRequestClientQuoteAction, type RequestClientQuoteInput } from "@/app/owner/materials/requests/actions"
import { AutosaveStatus } from "@/components/buildflow/autosave-status"
import { LocationAutocomplete } from "@/components/buildflow/location-autocomplete"
import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { RelatedEmailTimeline, type RelatedEmailItem } from "@/components/buildflow/related-email-timeline"
import { RequestSupplierRouteEditor } from "@/components/buildflow/request-supplier-route-editor"
import { OPEN_REQUEST_CLIENT_CONTACT_EVENT } from "@/components/buildflow/request-client-contact"
import { RequestWorkflowStepHeader, workflowStepCardClass } from "@/components/buildflow/request-workflow-step-header"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"
import type { ManagerPipelineStage } from "@/lib/manager-dashboard"
import { DEFAULT_PROPOSAL_TERMS } from "@/lib/proposal-terms"
import { AVANTIA_PAYMENT_LINK } from "@/lib/payment-link"
import type { RequestClientDocumentType } from "@/lib/request-client-quote-pdf"
import { findCanonicalSupplier } from "@/lib/supplier-canonical"
import { useSequencedAutosave } from "@/lib/use-sequenced-autosave"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }
type QuoteLine = { key: string; description: string; quantity: number; unit: string; unitPrice: number }
export type RequestComparisonSummary = { id: string; title: string; status: string; quoteNumber: string; updatedAt: string; bids: Array<{ id: string; supplierName: string; landedTotal: number; pricedItemCount: number; itemCount: number; recommended: boolean }> }
export type RequestSupplierRouteSelection = { supplierId: string | null; name: string; note: string }
export type RequestClientDocumentSnapshot = {
  documentType: RequestClientDocumentType
  documentNumber: string
  publicToken: string
  version: number
  updatedAt: string
  documentData: {
    issueDate?: string
    clientAddress?: string
    shipTo?: string
    lines?: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>
    deliveryCharge?: number
    salesTaxRate?: number
    taxableDelivery?: boolean
    terms?: string
  }
}

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"
const supplierNameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })

function resolvedRouteSupplierIds(routeSelections: RequestSupplierRouteSelection[], suppliers: SupplierRoutingOption[]) {
  return [...new Set(routeSelections.flatMap((selection) => {
    const supplier = findCanonicalSupplier(suppliers, selection)
    return supplier ? [supplier.id] : []
  }))]
}

function supplierRouteVersion(metadata: Record<string, unknown> | null | undefined) {
  return JSON.stringify([metadata?.supplier_route_names ?? [], metadata?.supplier_route_entries ?? [], metadata?.supplier_route_notes ?? {}])
}

function SupplierContactRow({ entry, recommendedSupplierIds, supplierIds, toggleRecommendedSupplier, toggleSupplier }: {
  entry: SupplierRoutingOption
  recommendedSupplierIds: string[]
  supplierIds: string[]
  toggleRecommendedSupplier: (supplierId: string) => void
  toggleSupplier: (supplierId: string) => void
}) {
  return <div className="flex min-h-12 items-center gap-3 rounded-md px-2 text-sm hover:bg-slate-50"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input aria-label={`Recommend ${entry.name}`} type="checkbox" checked={recommendedSupplierIds.includes(entry.id)} onChange={() => toggleRecommendedSupplier(entry.id)} className="h-4 w-4 rounded border-slate-300 accent-amber-500" /><span className="min-w-0"><span className="block truncate font-semibold">{entry.name}</span><span className="block truncate text-xs text-slate-500">{entry.email || entry.phone || entry.whatsapp || "No contact method"} · {(entry.trustLevel || "not-reviewed").replaceAll("-", " ")}</span></span></label><label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold"><input aria-label={`Contact ${entry.name}`} type="checkbox" checked={supplierIds.includes(entry.id)} onChange={() => toggleSupplier(entry.id)} className="h-4 w-4 rounded border-slate-300 accent-[#0071e3]" />Contact</label></div>
}

const REPLY_BLOCKS = [
  { id: "received", label: "Order received", text: "We received your order and are reviewing it now." },
  { id: "question", label: "I have a question", text: "I have a question about your request before we continue." },
  { id: "pricing", label: "Pricing is ready", text: "Your pricing is ready. Please review the attached quote." },
  { id: "missing", label: "Ask for missing details", text: "Please reply with the missing information so we can complete your request." },
  { id: "payment", label: "Secure payment link", text: `You can pay securely here: ${AVANTIA_PAYMENT_LINK}` },
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
  pricingSummaryItems,
  routeSelections,
  projectAddress,
  currentStage,
  comparisons,
  clientReplyCompleted,
  step2CompletedOverride,
  step3CompletedOverride,
  initialPaymentDelivery,
  initialClientDocuments,
  initialManagerNotes,
  initialSupplierRecommendations,
  clientEmails,
}: {
  requestId: string
  requestTitle: string
  client: { name: string; email: string; phone: string }
  departments: string[]
  suppliers: SupplierRoutingOption[]
  packages: PackageRoute[]
  requestItems: Array<{ id: string; name: string; quantity: number; unit: string | null; reviewReasons: string[] }>
  pricingSummaryItems: Array<{ id: string; original: string; organized: string; route: string; metadata: Record<string, unknown> | null }>
  routeSelections: RequestSupplierRouteSelection[]
  projectAddress: string
  currentStage: ManagerPipelineStage
  comparisons: RequestComparisonSummary[]
  clientReplyCompleted: boolean
  step2CompletedOverride: boolean | null
  step3CompletedOverride: boolean | null
  initialPaymentDelivery: { documentType: "invoice" | "receipt" | null; paymentLinkSent: boolean; deliveryScheduled: boolean }
  initialClientDocuments: RequestClientDocumentSnapshot[]
  initialManagerNotes: string
  initialSupplierRecommendations: Array<{ supplierId: string; isRecommended: boolean; shouldContact: boolean }>
  clientEmails: RelatedEmailItem[]
}) {
  const router = useRouter()
  const initialRouteSupplierIds = resolvedRouteSupplierIds(routeSelections, suppliers)
  const [supplierIds, setSupplierIds] = useState<string[]>(() => [...new Set([...initialSupplierRecommendations.filter((entry) => entry.shouldContact).map((entry) => entry.supplierId), ...initialRouteSupplierIds])])
  const [recommendedSupplierIds, setRecommendedSupplierIds] = useState<string[]>(() => [...new Set([...initialSupplierRecommendations.filter((entry) => entry.isRecommended).map((entry) => entry.supplierId), ...initialRouteSupplierIds])])
  const [managerNotes, setManagerNotes] = useState(initialManagerNotes)
  const notesAutosave = useSequencedAutosave<string>({
    save: (value, version) => saveRequestManagerNotesAction({ requestId, managerNotes: value, version }),
  })
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
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [clientReplyDone, setClientReplyDone] = useState(clientReplyCompleted)
  const [paymentLinkSent, setPaymentLinkSent] = useState(initialPaymentDelivery.paymentLinkSent)
  const [documentSent, setDocumentSent] = useState<"invoice" | "receipt" | null>(initialPaymentDelivery.documentType)
  const [deliveryScheduled, setDeliveryScheduled] = useState(initialPaymentDelivery.deliveryScheduled)
  const [contactOpen, setContactOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [documentType, setDocumentType] = useState<RequestClientDocumentType>("estimate")
  const [quoteNumber, setQuoteNumber] = useState(() => `AVA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
  const [issueDate, setIssueDate] = useState(() => new Date().toLocaleDateString("en-US"))
  const [clientAddress, setClientAddress] = useState("")
  const [shipTo, setShipTo] = useState(projectAddress)
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>(() => requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: 0 })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [salesTaxRate, setSalesTaxRate] = useState(8.875)
  const [taxableDelivery, setTaxableDelivery] = useState(true)
  const [taxRecommendation, setTaxRecommendation] = useState("")
  const [quoteTerms, setQuoteTerms] = useState(DEFAULT_PROPOSAL_TERMS)
  const [quoteMessage, setQuoteMessage] = useState("Please review your Avantia Build estimate. Reply with any questions or approval.")
  const [includeAch, setIncludeAch] = useState(false)
  const [ach, setAch] = useState({ bankName: "", accountOwner: "", routingNumber: "", accountNumber: "" })
  const [quoteFeedback, setQuoteFeedback] = useState("")
  const [documentLinks, setDocumentLinks] = useState<Record<RequestClientDocumentType, string | undefined>>(() => Object.fromEntries(initialClientDocuments.map((entry) => [entry.documentType, `/client-document/${entry.publicToken}`])) as Record<RequestClientDocumentType, string | undefined>)
  const [onlineSupplierSearchOpen, setOnlineSupplierSearchOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const pendingRef = useRef(pending)
  const contactDialogRef = useRef<HTMLElement | null>(null)
  const quoteDialogRef = useRef<HTMLElement | null>(null)
  const contactTriggerRef = useRef<HTMLElement | null>(null)
  const routeDepartment = departments.length === 1 ? departments[0] : departments.length > 1 ? "Multiple departments" : "Others"
  const availableSuppliers = useMemo(() => [...suppliers].sort((left, right) => supplierNameCollator.compare(left.name, right.name)), [suppliers])
  const routeMatches = useMemo(() => {
    return routeSelections.map((selection) => ({ selection, supplier: findCanonicalSupplier(availableSuppliers, selection) ?? null }))
  }, [availableSuppliers, routeSelections])
  const routeSupplierNames = useMemo(() => [...new Set(routeMatches.map(({ selection, supplier }) => supplier?.name || selection.name))].sort(supplierNameCollator.compare), [routeMatches])
  const routeContactSupplierIds = useMemo(() => [...new Set(routeMatches.flatMap(({ supplier }) => supplier ? [supplier.id] : []))], [routeMatches])
  const routeContactSupplierIdSet = useMemo(() => new Set(routeContactSupplierIds), [routeContactSupplierIds])
  const selectedRouteSuppliers = useMemo(() => availableSuppliers.filter((supplier) => routeContactSupplierIdSet.has(supplier.id)), [availableSuppliers, routeContactSupplierIdSet])
  const unlinkedRouteNames = useMemo(() => [...new Set(routeMatches.filter(({ supplier }) => !supplier).map(({ selection }) => selection.name))].sort(supplierNameCollator.compare), [routeMatches])
  const remainingSuppliers = useMemo(() => availableSuppliers.filter((supplier) => !routeContactSupplierIdSet.has(supplier.id)), [availableSuppliers, routeContactSupplierIdSet])
  const onlineSupplierQuery = useMemo(() => pricingSummaryItems.map((item) => item.organized).filter(Boolean).slice(0, 6).join("; "), [pricingSummaryItems])

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

  function openDocument(nextType: RequestClientDocumentType) {
    const saved = initialClientDocuments.find((entry) => entry.documentType === nextType)
    const prefix = nextType === "invoice" ? "INV" : nextType === "receipt" ? "REC" : "AVA"
    setDocumentType(nextType)
    setQuoteNumber(saved?.documentNumber || `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
    setIssueDate(saved?.documentData.issueDate || new Date().toLocaleDateString("en-US"))
    setClientAddress(saved?.documentData.clientAddress || "")
    setShipTo(saved?.documentData.shipTo || projectAddress)
    setQuoteLines(saved?.documentData.lines?.length ? saved.documentData.lines.map((line) => ({ ...line, key: crypto.randomUUID() })) : requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: 0 })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])
    setDeliveryCharge(Number(saved?.documentData.deliveryCharge) || 0)
    setSalesTaxRate(Number.isFinite(saved?.documentData.salesTaxRate) ? Number(saved?.documentData.salesTaxRate) : 8.875)
    setTaxableDelivery(saved?.documentData.taxableDelivery !== false)
    setQuoteTerms(saved?.documentData.terms || DEFAULT_PROPOSAL_TERMS)
    setQuoteMessage(nextType === "invoice" ? "Please review your Avantia Build invoice and use the secure payment link." : nextType === "receipt" ? "Your payment was received. Please keep this Avantia Build receipt for your records." : "Please review your Avantia Build estimate. Reply with any questions or approval.")
    setContactOpen(false)
    setQuoteOpen(true)
  }

  function openQuote() {
    openDocument("estimate")
  }

  function openPaymentLink() {
    setReplyBlock("payment")
    setDeliveryMethod(client.phone ? "text" : client.email ? "email" : "whatsapp")
    setContactOpen(true)
  }

  function openDeliverySchedule() {
    setReplyBlock("delivery")
    setDeliveryOpen(true)
    setContactOpen(true)
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

  function openManualPricing() {
    setFeedback("")
    startTransition(async () => {
      const result = await openRequestPricingComparisonAction(requestId)
      if (!result.ok) { setFeedbackError(true); setFeedback(result.error); return }
      router.push(`/admin/quote-comparison/${result.data.comparisonId}`)
    })
  }

  function toggleRecommendedSupplier(supplierId: string) {
    setRecommendedSupplierIds((current) => current.includes(supplierId) ? current.filter((id) => id !== supplierId) : [...current, supplierId])
    if (recommendedSupplierIds.includes(supplierId)) setSupplierIds((current) => current.filter((id) => id !== supplierId))
  }

  async function saveSupplierPlan() {
    const chosen = new Set([...recommendedSupplierIds, ...supplierIds])
    const result = await saveRequestSupplierPlanAction({ requestId, suppliers: [...chosen].map((supplierId) => ({ supplierId, isRecommended: recommendedSupplierIds.includes(supplierId), shouldContact: supplierIds.includes(supplierId) })) })
    setFeedbackError(!result.ok)
    setFeedback(result.ok ? "Supplier choices saved." : result.error)
    return result.ok
  }

  function createSupplierRequest() {
    if (!supplierIds.length) return
    startTransition(async () => {
      if (!await notesAutosave.flush()) {
        setFeedbackError(true)
        setFeedback("Save the request note before contacting suppliers.")
        return
      }
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
      if (result.ok) {
        setReplyBlock("delivery")
        setDeliveryScheduled(true)
      }
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
      if (result.ok) {
        setClientReplyDone(true)
        if (replyBlock === "payment") {
          const recorded = await recordRequestPaymentLinkSentAction({ requestId, channel: "email" })
          if (recorded.ok) setPaymentLinkSent(true)
        }
      }
    })
  }

  function sendClientText() {
    startTransition(async () => {
      setFeedback("")
      if (!attachment) {
        const result = await sendAuraMessageAction({ channel: "sms", recipient: client.phone, recipientLabel: client.name, message: clientMessage, materialRequestId: requestId, materialRequestTitle: requestTitle })
        setFeedbackError(!result.ok)
        setFeedback(result.ok ? `Text sent directly to ${client.phone} from Q U O.` : result.error)
        if (result.ok) {
          setClientReplyDone(true)
          if (replyBlock === "payment") {
            const recorded = await recordRequestPaymentLinkSentAction({ requestId, channel: "sms" })
            if (recorded.ok) setPaymentLinkSent(true)
          }
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
      const result = await sendAuraMessageAction({ channel: "whatsapp", recipient: client.phone, recipientLabel: client.name, message: clientMessage, materialRequestId: requestId, materialRequestTitle: requestTitle })
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? `WhatsApp message sent to ${client.phone}.` : result.error)
      if (result.ok) {
        setClientReplyDone(true)
        if (replyBlock === "payment") {
          const recorded = await recordRequestPaymentLinkSentAction({ requestId, channel: "whatsapp" })
          if (recorded.ok) setPaymentLinkSent(true)
        }
      }
    })
  }

  const quoteSubtotal = quoteLines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0)
  const quoteTax = (quoteSubtotal + (taxableDelivery ? deliveryCharge : 0)) * salesTaxRate / 100
  const quoteTotal = quoteSubtotal + deliveryCharge + quoteTax
  const documentLabel = documentType === "invoice" ? "Invoice" : documentType === "receipt" ? "Receipt" : "Estimate"

  function quoteInput(): RequestClientQuoteInput {
    return {
      requestId,
      documentType,
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
      setQuoteFeedback(`${documentLabel} PDF downloaded for review.`)
    })
  }

  function textQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const saved = await saveRequestClientDocumentAction(quoteInput())
      if (!saved.ok || !saved.shareUrl) return setQuoteFeedback(saved.ok ? "The live link could not be prepared." : saved.error)
      const message = `${quoteMessage.trim() || `Hello ${firstName}, your Avantia Build ${documentLabel.toLowerCase()} is ready.`}\n\nOpen or download the latest version: ${saved.shareUrl}`
      const sent = await sendAuraMessageAction({ channel: "sms", recipient: client.phone, recipientLabel: client.name, message, materialRequestId: requestId, materialRequestTitle: requestTitle })
      if (!sent.ok) return setQuoteFeedback(sent.error)
      await recordRequestClientDocumentSentAction({ requestId, documentType, documentNumber: quoteNumber, channel: "sms" })
      setDocumentLinks((current) => ({ ...current, [documentType]: saved.shareUrl }))
      if (documentType === "invoice" || documentType === "receipt") setDocumentSent(documentType)
      setQuoteFeedback(`${documentLabel} link sent by text. Future edits will update the same link.`)
    })
  }

  function saveDocument() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await saveRequestClientDocumentAction(quoteInput())
      if (!result.ok || !result.shareUrl) return setQuoteFeedback(result.ok ? "The live link could not be saved." : result.error)
      setDocumentLinks((current) => ({ ...current, [documentType]: result.shareUrl }))
      setQuoteFeedback(`${documentLabel} saved. The client link now shows this version.`)
      router.refresh()
    })
  }

  function sendQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await sendRequestClientQuoteAction(quoteInput())
      const label = documentType === "invoice" ? "Invoice" : documentType === "receipt" ? "Receipt" : "Estimate"
      setQuoteFeedback(result.ok ? `${label} emailed to ${client.email}.` : result.error)
      if (result.ok) {
        setFeedback(`${label} ${quoteNumber} emailed to ${client.email}.`)
        setClientReplyDone(true)
        if (documentType === "invoice" || documentType === "receipt") setDocumentSent(documentType)
        if (result.shareUrl) setDocumentLinks((current) => ({ ...current, [documentType]: result.shareUrl }))
      }
    })
  }

  const supplierQuoteCount = comparisons.reduce((total, comparison) => total + comparison.bids.length, 0)
  const pricingComplete = step2CompletedOverride ?? supplierQuoteCount > 0
  const pricingStatus = pricingComplete ? "complete" : currentStage === "pricing" ? "active" : "upcoming"
  const paymentDeliveryComplete = step3CompletedOverride ?? Boolean(documentSent === "receipt" && deliveryScheduled)
  const paymentDeliveryStatus = paymentDeliveryComplete ? "complete" : ["approval", "delivery"].includes(currentStage) || pricingComplete ? "active" : "upcoming"
  const replyComplete = clientReplyDone
  const fulfillmentDetail = [documentSent ? `${documentSent === "invoice" ? "Invoice" : "Receipt"} sent` : "Document not sent", paymentLinkSent ? "payment link sent" : "payment link not sent", deliveryScheduled ? "delivery scheduled" : "delivery not scheduled"].join(" · ")

  return (
    <div className="grid gap-2">
      <details open={currentStage === "pricing"} className={workflowStepCardClass()}>
        <RequestWorkflowStepHeader requestId={requestId} step={2} title="Supplier pricing & comparison" detail={supplierQuoteCount ? `${supplierQuoteCount} quote${supplierQuoteCount === 1 ? "" : "s"} ready to compare` : packages.length ? `${packages.length} supplier request${packages.length === 1 ? "" : "s"} sent` : "Choose a route, contact suppliers, and add returned pricing"} status={pricingStatus} icon="pricing" />
        <div className="border-t border-slate-200 p-3">
          <details className="mb-3 rounded-md border border-slate-200 bg-white"><summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-bold"><span>Request notes</span><span className="max-w-[60%] truncate font-normal text-slate-400">{managerNotes || "Add a note"}</span></summary><div className="grid gap-2 border-t border-slate-100 p-2"><textarea value={managerNotes} onChange={(event) => { const value = event.target.value; setManagerNotes(value); notesAutosave.queue(value) }} rows={2} maxLength={5000} placeholder="Notes for this pricing request" className="resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-950" /><AutosaveStatus status={notesAutosave.status} error={notesAutosave.error} retry={notesAutosave.retry} /></div></details>
          {routeSupplierNames.length ? <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5"><span className="mr-1 text-[10px] font-black uppercase tracking-[.08em] text-sky-900">Suppliers from Step 1</span>{routeSupplierNames.map((name) => <span key={name} className="rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-sky-100">{name}</span>)}</div> : null}
          <div className="mb-3 overflow-x-auto rounded-md border border-slate-200 bg-slate-100">
            <table className="w-full min-w-[42rem] table-fixed text-left text-[11px]"><thead className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-500"><tr><th className="w-16 px-2 py-1.5">Qty</th><th className="px-2 py-1.5">Original</th><th className="px-2 py-1.5">AI request</th><th className="px-2 py-1.5">Supplier route &amp; note</th></tr></thead><tbody className="divide-y divide-slate-200 bg-slate-50">{pricingSummaryItems.slice(0, 8).map((item) => <tr key={item.id}><td className="px-2 py-1.5 font-bold">{requestItems.find((candidate) => candidate.id === item.id)?.quantity || "—"}</td><td title={item.original} className="truncate px-2 py-1.5 text-slate-500">{item.original}</td><td title={item.organized} className="truncate px-2 py-1.5 font-semibold">{item.organized}</td><td className="px-2 py-1.5"><RequestSupplierRouteEditor key={`${item.id}-${supplierRouteVersion(item.metadata)}`} requestId={requestId} itemId={item.id} metadata={item.metadata} suppliers={availableSuppliers} /></td></tr>)}</tbody></table>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <a href="#supplier-routing" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold"><Route className="h-3.5 w-3.5" />Choose route</a>
            <a href={`/admin/supplier-quotes?request=${requestId}#supplier-quote-upload`} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md bg-[#0071e3] px-2 text-center text-xs font-bold text-white"><Paperclip className="h-3.5 w-3.5" />Upload returned quote</a>
            <button type="button" onClick={openManualPricing} disabled={pending} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-center text-xs font-bold disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add pricing by hand</button>
            {comparisons[0] ? <a href={`/admin/quote-comparison/${comparisons[0].id}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs font-bold text-emerald-900">Compare quotes</a> : <a href={`/admin/supplier-quotes?request=${requestId}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-600">Quotes will compare here</a>}
          </div>

          <details id="supplier-routing" className="group/route scroll-mt-24 rounded-md border border-slate-200 bg-slate-50">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold"><span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-sky-700" />Contact Suppliers</span><ChevronDown className="h-4 w-4 text-slate-400 transition group-open/route:rotate-180" /></summary>
            <div className="border-t border-slate-200 p-3">
          <div className="mt-3 grid gap-3">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Suppliers selected in Step 1</legend>
              <p className="mt-0.5 text-xs text-slate-500">Your chosen routes appear first. Then use any supplier in the directory.</p>
              <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2">
                {selectedRouteSuppliers.map((entry) => <SupplierContactRow key={entry.id} entry={entry} recommendedSupplierIds={recommendedSupplierIds} supplierIds={supplierIds} toggleRecommendedSupplier={toggleRecommendedSupplier} toggleSupplier={toggleSupplier} />)}
                {unlinkedRouteNames.map((name) => <div key={name} className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-sm"><span className="truncate font-semibold text-slate-800">{name}</span><span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">Not linked to directory</span></div>)}
                {!selectedRouteSuppliers.length && !unlinkedRouteNames.length ? <p className="px-2 py-3 text-xs text-slate-500">Choose routes in Step 1.</p> : null}
                {remainingSuppliers.length ? <details className="border-t border-slate-100"><summary className="min-h-10 cursor-pointer px-2 py-3 text-xs font-bold text-[#0066cc]">All Supplier Directory ({remainingSuppliers.length})</summary><div>{remainingSuppliers.map((entry) => <SupplierContactRow key={entry.id} entry={entry} recommendedSupplierIds={recommendedSupplierIds} supplierIds={supplierIds} toggleRecommendedSupplier={toggleRecommendedSupplier} toggleSupplier={toggleSupplier} />)}</div></details> : null}
              </div>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => startTransition(async () => { await saveSupplierPlan() })} disabled={pending} className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-50">Save supplier choices</button><button type="button" onClick={createSupplierRequest} disabled={!supplierIds.length || pending} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#0071e3] px-3 text-xs font-bold text-white disabled:opacity-50"><Route className="h-4 w-4" />Contact {supplierIds.length || ""} supplier{supplierIds.length === 1 ? "" : "s"}</button></div>
            <div className="rounded-md border border-violet-200 bg-violet-50 p-2"><button type="button" onClick={() => setOnlineSupplierSearchOpen((value) => !value)} className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-md bg-white px-3 text-left text-xs font-bold text-violet-900"><span className="inline-flex items-center gap-2"><Search className="h-4 w-4" />AI · Look for suppliers online</span><ChevronDown className={`h-4 w-4 transition ${onlineSupplierSearchOpen ? "rotate-180" : ""}`} /></button>{onlineSupplierSearchOpen ? <MaterialPriceCheck requestId={requestId} query={onlineSupplierQuery || requestTitle} department={routeDepartment} defaultZipCode={(projectAddress.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || "11516")} onClose={() => setOnlineSupplierSearchOpen(false)} /> : null}</div>
          </div>
          {packages.length ? <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current routes</p><div className="mt-2 grid gap-2">{packages.map((pkg) => <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{pkg.department}</span><span className="text-right text-slate-600">{suppliers.find((entry) => entry.id === pkg.supplier_id)?.name || "Not assigned"} · {pkg.status.replaceAll("_", " ")}</span></div>)}</div></div> : null}
            </div>
          </details>
        </div>
      </details>

      <details open={["approval", "delivery"].includes(currentStage)} className={workflowStepCardClass()}>
        <RequestWorkflowStepHeader requestId={requestId} step={3} title="Payment & delivery" detail={fulfillmentDetail} status={paymentDeliveryStatus} icon="payment" />
        <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-[#0066cc]" /><h3 className="text-sm font-black text-[#12263f]">Estimate, invoice, or receipt</h3></div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Create or edit any client document. Its live link always shows the newest saved version.</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5"><button type="button" onClick={() => openDocument("estimate")} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-1 text-[11px] font-bold"><FileCheck2 className="h-3.5 w-3.5" />Estimate</button><button type="button" onClick={() => openDocument("invoice")} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md bg-[#17304f] px-1 text-[11px] font-bold text-white"><FileText className="h-3.5 w-3.5" />Invoice</button><button type="button" onClick={() => openDocument("receipt")} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-1 text-[11px] font-bold"><ReceiptText className="h-3.5 w-3.5" />Receipt</button></div>
            {documentSent ? <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />{documentSent === "invoice" ? "Invoice" : "Receipt"} sent</p> : null}
          </section>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#0066cc]" /><h3 className="text-sm font-black text-[#12263f]">Collect payment</h3></div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Prepare the secure Avantia payment link by text, email, or WhatsApp.</p>
            <button type="button" onClick={openPaymentLink} disabled={!client.phone && !client.email} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[#0071e3] px-2 text-xs font-bold text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" />Send payment link</button>
            {paymentLinkSent ? <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Payment link sent</p> : null}
          </section>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#0066cc]" /><h3 className="text-sm font-black text-[#12263f]">Schedule delivery</h3></div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Choose the jobsite, date, start time, and delivery window.</p>
            <button type="button" onClick={openDeliverySchedule} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs font-bold text-emerald-900"><CalendarClock className="h-3.5 w-3.5" />Set delivery</button>
            {deliveryScheduled ? <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Delivery scheduled</p> : null}
          </section>
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

            <details open={deliveryOpen} onToggle={(event) => setDeliveryOpen(event.currentTarget.open)} className="mt-3 rounded-lg border border-slate-200 bg-slate-50">
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
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Avantia Build document</p><h2 id="request-quote-title" className="mt-0.5 text-xl font-bold">Create client {documentLabel.toLowerCase()}</h2><p className="mt-0.5 text-xs text-slate-500">Review the PDF, then send it by email or text.</p></div><button type="button" onClick={closeQuote} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40" aria-label="Close"><X className="h-4 w-4" /></button></header>
          <div className="overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="grid gap-1 text-xs font-bold">Document type<select value={documentType} onChange={(event) => openDocument(event.target.value as RequestClientDocumentType)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="estimate">Estimate</option><option value="invoice">Invoice</option><option value="receipt">Receipt</option></select></label>
              <label className="grid gap-1 text-xs font-bold">{documentLabel} code<input value={quoteNumber} onChange={(event) => setQuoteNumber(event.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" /></label>
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
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">{documentLinks[documentType] ? <a href={documentLinks[documentType]} target="_blank" rel="noreferrer" className="mr-auto text-xs font-bold text-[#0066cc] underline">Open live client link</a> : null}<button type="button" onClick={saveDocument} disabled={pending || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 disabled:opacity-40"><FileCheck2 className="h-4 w-4" />Save changes</button><button type="button" onClick={downloadQuote} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold disabled:opacity-40"><Download className="h-4 w-4" />Download PDF</button><button type="button" onClick={textQuote} disabled={pending || !client.phone || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0071e3] bg-white px-4 text-sm font-bold text-[#0066cc] disabled:opacity-40"><MessageSquareText className="h-4 w-4" />Text live link</button><button type="button" onClick={sendQuote} disabled={pending || !client.email || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />{pending ? "Working..." : `Email live link`}</button></footer>
        </section>
      </div>, document.body) : null}
    </div>
  )
}
