"use client"

import { Award, CalendarClock, Check, CheckCircle2, ChevronDown, CircleDollarSign, Download, FileCheck2, FileText, Mail, MessageCircle, MessageSquareText, Paperclip, Phone, Plus, ReceiptText, Route, Search, Send, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoAttachmentMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions"
import { openRequestPricingComparisonAction } from "@/app/admin/supplier-quotes/actions"
import { previewRequestClientQuoteAction, recordRequestClientApprovalAction, recordRequestClientDocumentSentAction, recordRequestPaymentLinkSentAction, recordRequestPaymentReceivedAction, saveRequestClientDocumentAction, saveRequestManagerNotesAction, saveRequestSupplierPlanAction, scheduleRequestDeliveryAction, sendClientReplyAction, sendRequestClientQuoteAction, updateRequestSupplierContactStatusAction, type RequestClientQuoteInput, type RequestSupplierContactStatus } from "@/app/owner/materials/requests/actions"
import { AutosaveStatus } from "@/components/buildflow/autosave-status"
import { LocationAutocomplete } from "@/components/buildflow/location-autocomplete"
import { MaterialPriceCheck } from "@/components/buildflow/material-price-check"
import { RelatedEmailTimeline, type RelatedEmailItem } from "@/components/buildflow/related-email-timeline"
import { RequestSupplierRouteEditor } from "@/components/buildflow/request-supplier-route-editor"
import { OPEN_REQUEST_CLIENT_CONTACT_EVENT } from "@/components/buildflow/request-client-contact"
import { RequestWorkflowStepHeader, workflowStepCardClass } from "@/components/buildflow/request-workflow-step-header"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"
import type { ManagerPipelineStage } from "@/lib/manager-dashboard"
import { DEFAULT_PROPOSAL_TERMS, includeRequiredProposalTerms } from "@/lib/proposal-terms"
import { AVANTIA_PAYMENT_LINK } from "@/lib/payment-link"
import type { RequestClientDocumentType } from "@/lib/request-client-quote-pdf"
import { requestPaymentGuidance, type RequestPaymentMethod } from "@/lib/request-client-payment"
import { requestWorkflowState, type RequestWorkflowAction } from "@/lib/request-workflow-state"
import { formatSiteDate, formatSiteWallTime, siteBusinessDateKey } from "@/lib/site-date-time"
import { findCanonicalSupplier } from "@/lib/supplier-canonical"
import { useSequencedAutosave } from "@/lib/use-sequenced-autosave"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }
type QuoteLine = { key: string; description: string; quantity: number; unit: string; unitPrice: number }
export type RequestComparisonSummary = { id: string; title: string; status: string; awardedBidId: string | null; clientQuoteStatus: string; quoteNumber: string; updatedAt: string; bids: Array<{ id: string; supplierName: string; landedTotal: number; pricedItemCount: number; itemCount: number; recommended: boolean }> }
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
    paymentRequest?: { method: RequestPaymentMethod; amountDue: number; instructions: string; securePaymentUrl?: string }
    paymentLink?: string
  }
}

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"
const supplierNameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })
const SUPPLIER_CONTACT_STATUS_OPTIONS: Array<{ value: RequestSupplierContactStatus; label: string }> = [
  { value: "not_contacted", label: "Not contacted" },
  { value: "request_sent", label: "Request sent" },
  { value: "supplier_replied", label: "They replied" },
  { value: "awaiting_supplier_reply", label: "We replied · waiting" },
  { value: "quote_received", label: "Quote received" },
]

function resolvedRouteSupplierIds(routeSelections: RequestSupplierRouteSelection[], suppliers: SupplierRoutingOption[]) {
  return [...new Set(routeSelections.flatMap((selection) => {
    const supplier = findCanonicalSupplier(suppliers, selection)
    return supplier ? [supplier.id] : []
  }))]
}

function supplierRouteVersion(metadata: Record<string, unknown> | null | undefined) {
  return JSON.stringify([metadata?.supplier_route_names ?? [], metadata?.supplier_route_entries ?? [], metadata?.supplier_route_notes ?? {}])
}

function savedDocumentTotal(documentData: RequestClientDocumentSnapshot["documentData"]) {
  const subtotal = (documentData.lines ?? []).reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)
  const deliveryCharge = Number(documentData.deliveryCharge || 0)
  const salesTaxRate = Number(documentData.salesTaxRate || 0)
  const tax = (subtotal + (documentData.taxableDelivery === false ? 0 : deliveryCharge)) * salesTaxRate / 100
  return subtotal + deliveryCharge + tax
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

const WORKFLOW_ACTION_LABELS: Record<RequestWorkflowAction, string> = {
  "choose-suppliers": "Choose Suppliers",
  "contact-suppliers": "Contact Suppliers",
  "add-supplier-quote": "Add Supplier Quote",
  "review-quote": "Review Quote",
  "compare-quotes": "Compare Quotes",
  "send-estimate": "Create & Send Estimate",
  "wait-for-approval": "Waiting for Client Approval",
  "create-invoice": "Create Invoice",
  "send-payment-link": "Send Payment Link",
  "mark-paid": "Mark Payment Received",
  "create-receipt": "Create Receipt",
  "schedule-delivery": "Schedule Delivery",
  complete: "Complete",
}

function deliveryDateLabel(value: string) {
  if (!value) return ""
  return formatSiteDate(value, { weekday: "short", month: "short", day: "numeric", year: "numeric" }, "")
}

function deliveryTimeLabel(value: string) {
  return value ? formatSiteWallTime(value, "") : ""
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
  initialPaymentDelivery: { documentType: "invoice" | "receipt" | null; estimateSent: boolean; clientApproved: boolean; invoiceSent: boolean; receiptSent: boolean; paymentLinkSent: boolean; paymentReceived: boolean; deliveryScheduled: boolean }
  initialClientDocuments: RequestClientDocumentSnapshot[]
  initialManagerNotes: string
  initialSupplierRecommendations: Array<{ supplierId: string; isRecommended: boolean; shouldContact: boolean; contactStatus: RequestSupplierContactStatus }>
  clientEmails: RelatedEmailItem[]
}) {
  const router = useRouter()
  const initialRouteSupplierIds = resolvedRouteSupplierIds(routeSelections, suppliers)
  const [supplierIds, setSupplierIds] = useState<string[]>(() => [...new Set([...initialSupplierRecommendations.filter((entry) => entry.shouldContact).map((entry) => entry.supplierId), ...initialRouteSupplierIds])])
  const [recommendedSupplierIds, setRecommendedSupplierIds] = useState<string[]>(() => [...new Set([...initialSupplierRecommendations.filter((entry) => entry.isRecommended).map((entry) => entry.supplierId), ...initialRouteSupplierIds])])
  const [supplierContactStatuses, setSupplierContactStatuses] = useState<Record<string, RequestSupplierContactStatus>>(() => Object.fromEntries(initialSupplierRecommendations.map((entry) => [entry.supplierId, entry.contactStatus || "not_contacted"])))
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
  const [estimateSent, setEstimateSent] = useState(initialPaymentDelivery.estimateSent)
  const [clientApproved, setClientApproved] = useState(initialPaymentDelivery.clientApproved)
  const [invoiceSent, setInvoiceSent] = useState(initialPaymentDelivery.invoiceSent)
  const [receiptSent, setReceiptSent] = useState(initialPaymentDelivery.receiptSent)
  const [paymentLinkSent, setPaymentLinkSent] = useState(initialPaymentDelivery.paymentLinkSent)
  const [paymentReceived, setPaymentReceived] = useState(initialPaymentDelivery.paymentReceived)
  const [deliveryScheduled, setDeliveryScheduled] = useState(initialPaymentDelivery.deliveryScheduled)
  const [supplierRoutingOpen, setSupplierRoutingOpen] = useState(false)
  const [quoteEntryOpen, setQuoteEntryOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [documentType, setDocumentType] = useState<RequestClientDocumentType>("estimate")
  const [quoteNumber, setQuoteNumber] = useState(() => `AVA-${(siteBusinessDateKey() ?? "").replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
  const [issueDate, setIssueDate] = useState(() => formatSiteDate(new Date(), { month: "numeric", day: "numeric", year: "numeric" }))
  const [clientAddress, setClientAddress] = useState("")
  const [shipTo, setShipTo] = useState(projectAddress)
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>(() => requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: 0 })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [salesTaxRate, setSalesTaxRate] = useState(8.875)
  const [taxableDelivery, setTaxableDelivery] = useState(true)
  const [taxRecommendation, setTaxRecommendation] = useState("")
  const [quoteTerms, setQuoteTerms] = useState(DEFAULT_PROPOSAL_TERMS)
  const [quoteMessage, setQuoteMessage] = useState("Please review your Avantia Build estimate. Reply with any questions or approval.")
  const [requestPayment, setRequestPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<RequestPaymentMethod>("credit_card")
  const [paymentAmountDue, setPaymentAmountDue] = useState("")
  const [paymentInstructions, setPaymentInstructions] = useState("")
  const [hostedPaymentUrl, setHostedPaymentUrl] = useState(AVANTIA_PAYMENT_LINK)
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
        ...(deliveryWindowStart && deliveryWindowEnd ? [`Delivery window: Between ${deliveryTimeLabel(deliveryWindowStart)} and ${deliveryTimeLabel(deliveryWindowEnd)} Eastern (${deliveryWindowHoursNumber.toLocaleString()} hour${deliveryWindowHoursNumber === 1 ? "" : "s"})`] : []),
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
    const savedPayment = saved?.documentData.paymentRequest
    const legacyPaymentLink = saved?.documentData.paymentLink
    const prefix = nextType === "invoice" ? "INV" : nextType === "receipt" ? "REC" : "AVA"
    setDocumentType(nextType)
    setQuoteNumber(saved?.documentNumber || `${prefix}-${(siteBusinessDateKey() ?? "").replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
    setIssueDate(saved?.documentData.issueDate || formatSiteDate(new Date(), { month: "numeric", day: "numeric", year: "numeric" }))
    setClientAddress(saved?.documentData.clientAddress || "")
    setShipTo(saved?.documentData.shipTo || projectAddress)
    setQuoteLines(saved?.documentData.lines?.length ? saved.documentData.lines.map((line) => ({ ...line, key: crypto.randomUUID() })) : requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: 0 })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0 }])
    setDeliveryCharge(Number(saved?.documentData.deliveryCharge) || 0)
    setSalesTaxRate(Number.isFinite(saved?.documentData.salesTaxRate) ? Number(saved?.documentData.salesTaxRate) : 8.875)
    setTaxableDelivery(saved?.documentData.taxableDelivery !== false)
    setQuoteTerms(includeRequiredProposalTerms(saved?.documentData.terms || DEFAULT_PROPOSAL_TERMS))
    setRequestPayment(Boolean(savedPayment || legacyPaymentLink))
    setPaymentMethod(savedPayment?.method || "credit_card")
    setPaymentAmountDue(savedPayment?.amountDue ? String(savedPayment.amountDue) : legacyPaymentLink ? savedDocumentTotal(saved.documentData).toFixed(2) : "")
    setPaymentInstructions(savedPayment?.instructions || "")
    setHostedPaymentUrl(savedPayment?.securePaymentUrl || legacyPaymentLink || AVANTIA_PAYMENT_LINK)
    setQuoteMessage(nextType === "invoice" ? "Please review your Avantia Build invoice. Reply with any questions." : nextType === "receipt" ? "Your payment was received. Please keep this Avantia Build receipt for your records." : "Please review your Avantia Build estimate. Reply with any questions or approval.")
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

  function updateSupplierContactStatus(supplierId: string, status: RequestSupplierContactStatus) {
    const previous = supplierContactStatuses[supplierId] || "not_contacted"
    setSupplierContactStatuses((current) => ({ ...current, [supplierId]: status }))
    setFeedback("")
    startTransition(async () => {
      const result = await updateRequestSupplierContactStatusAction({ requestId, supplierId, status })
      if (!result.ok) {
        setSupplierContactStatuses((current) => ({ ...current, [supplierId]: previous }))
        setFeedbackError(true)
        setFeedback(result.error)
        return
      }
      setFeedbackError(false)
      setFeedback("Supplier status saved.")
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
      terms: includeRequiredProposalTerms(quoteTerms),
      paymentRequest: requestPayment ? {
        method: paymentMethod,
        amountDue: Number(paymentAmountDue),
        instructions: paymentInstructions,
        ...(hostedPaymentUrl.trim() ? { securePaymentUrl: hostedPaymentUrl.trim() } : {}),
      } : undefined,
    }
  }

  function updateQuoteLine(key: string, patch: Partial<QuoteLine>) {
    setQuoteLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line))
  }

  function markDocumentSent(type: RequestClientDocumentType) {
    if (type === "estimate") setEstimateSent(true)
    if (type === "invoice") setInvoiceSent(true)
    if (type === "receipt") setReceiptSent(true)
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
      const recorded = await recordRequestClientDocumentSentAction({ requestId, documentType, documentNumber: quoteNumber, channel: "sms" })
      if (!recorded.ok) return setQuoteFeedback(recorded.error)
      setDocumentLinks((current) => ({ ...current, [documentType]: saved.shareUrl }))
      markDocumentSent(documentType)
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
        markDocumentSent(documentType)
        if (result.shareUrl) setDocumentLinks((current) => ({ ...current, [documentType]: result.shareUrl }))
      }
    })
  }

  function markPaymentReceived() {
    if (!window.confirm("Confirm that the client payment was received?")) return
    startTransition(async () => {
      setFeedback("")
      const result = await recordRequestPaymentReceivedAction({ requestId })
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? "Client payment marked received." : result.error)
      if (result.ok) {
        setPaymentReceived(true)
        router.refresh()
      }
    })
  }

  function markClientApproved() {
    if (!window.confirm("Confirm that the client approved this estimate?")) return
    startTransition(async () => {
      setFeedback("")
      const result = await recordRequestClientApprovalAction({ requestId })
      setFeedbackError(!result.ok)
      setFeedback(result.ok ? "Client approval recorded." : result.error)
      if (result.ok) {
        setClientApproved(true)
        router.refresh()
      }
    })
  }

  const supplierQuoteCount = comparisons.reduce((total, comparison) => total + comparison.bids.length, 0)
  const winningComparison = comparisons.find((comparison) => comparison.status === "awarded" && Boolean(comparison.awardedBidId)) ?? null
  const primaryComparison = winningComparison ?? comparisons[0] ?? null
  const winningBid = winningComparison?.bids.find((bid) => bid.id === winningComparison.awardedBidId) ?? null
  const selectedSupplierNames = [...new Set([
    ...routeSupplierNames,
    ...supplierIds.flatMap((supplierId) => availableSuppliers.find((supplier) => supplier.id === supplierId)?.name || []),
  ])].sort(supplierNameCollator.compare)
  const workflow = requestWorkflowState({
    routeSupplierCount: selectedSupplierNames.length,
    supplierRequestCount: packages.length,
    supplierQuoteCount,
    winningSupplierSelected: Boolean(winningComparison),
    estimateSent,
    clientApproved,
    invoiceSent,
    paymentLinkSent,
    paymentReceived,
    receiptSent,
    deliveryScheduled,
    step2CompletedOverride,
    step3CompletedOverride,
  })
  const pricingStatus = workflow.step2Status
  const paymentDeliveryStatus = workflow.step3Status
  const replyComplete = clientReplyDone
  const pricingDetail = workflow.step2Complete
    ? winningBid ? `Selected: ${winningBid.supplierName}` : "Supplier pricing complete"
    : `Next: ${WORKFLOW_ACTION_LABELS[workflow.step2Action]}`
  const fulfillmentDetail = `Next: ${WORKFLOW_ACTION_LABELS[workflow.step3Action]}`
  const latestClientDocument = initialClientDocuments[0] ?? null
  const supplierProgressRows = selectedSupplierNames.map((name) => {
    const supplier = findCanonicalSupplier(availableSuppliers, { supplierId: null, name }) ?? null
    const bid = comparisons.flatMap((comparison) => comparison.bids).find((candidate) => supplierNameCollator.compare(candidate.supplierName, name) === 0) ?? null
    const supplierPackage = supplier ? packages.find((entry) => entry.supplier_id === supplier.id) ?? null : null
    const note = routeSelections.find((selection) => supplierNameCollator.compare(selection.name, name) === 0)?.note || ""
    return { name, supplier, bid, supplierPackage, note }
  })

  const primaryWorkflowClass = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0066cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
  const secondaryWorkflowClass = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"

  function openSupplierRouting() {
    setSupplierRoutingOpen(true)
    window.requestAnimationFrame(() => document.getElementById("supplier-routing")?.scrollIntoView({ behavior: "smooth", block: "nearest" }))
  }

  function renderStep2PrimaryAction() {
    if (workflow.step2Complete) {
      return <button type="button" onClick={() => openDocument("estimate")} className={primaryWorkflowClass}><FileCheck2 className="h-4 w-4" />Continue to Client Estimate</button>
    }
    if (workflow.step2Action === "choose-suppliers" || workflow.step2Action === "contact-suppliers") {
      return <button type="button" onClick={openSupplierRouting} className={primaryWorkflowClass}><Route className="h-4 w-4" />{workflow.step2Action === "contact-suppliers" ? `Contact ${selectedSupplierNames.length} Supplier${selectedSupplierNames.length === 1 ? "" : "s"}` : "Choose Suppliers"}</button>
    }
    if (workflow.step2Action === "add-supplier-quote") {
      return <button type="button" onClick={() => setQuoteEntryOpen((open) => !open)} aria-expanded={quoteEntryOpen} className={primaryWorkflowClass}><Paperclip className="h-4 w-4" />Add Supplier Quote</button>
    }
    if (workflow.step2Action === "review-quote" || workflow.step2Action === "compare-quotes") {
      return primaryComparison ? <a href={`/admin/quote-comparison/${primaryComparison.id}`} className={primaryWorkflowClass}><Award className="h-4 w-4" />{workflow.step2Action === "review-quote" ? "Review Quote & Select Supplier" : `Compare ${supplierQuoteCount} Quotes`}</a> : null
    }
    return <button type="button" onClick={() => openDocument("estimate")} className={primaryWorkflowClass}><FileCheck2 className="h-4 w-4" />Continue to Client Estimate</button>
  }

  function renderStep3PrimaryAction() {
    if (workflow.step3Action === "send-estimate") return <button type="button" onClick={() => openDocument("estimate")} className={primaryWorkflowClass}><FileCheck2 className="h-4 w-4" />Create & Send Estimate</button>
    if (workflow.step3Action === "wait-for-approval") return <button type="button" onClick={markClientApproved} disabled={pending} className={primaryWorkflowClass}><CheckCircle2 className="h-4 w-4" />{pending ? "Saving..." : "Mark Client Approved"}</button>
    if (workflow.step3Action === "create-invoice") return <button type="button" onClick={() => openDocument("invoice")} className={primaryWorkflowClass}><FileText className="h-4 w-4" />Create & Send Invoice</button>
    if (workflow.step3Action === "send-payment-link") return <button type="button" onClick={openPaymentLink} disabled={!client.phone && !client.email} className={primaryWorkflowClass}><Send className="h-4 w-4" />Send Payment Link</button>
    if (workflow.step3Action === "mark-paid") return <button type="button" onClick={markPaymentReceived} disabled={pending} className={primaryWorkflowClass}><CircleDollarSign className="h-4 w-4" />Mark Payment Received</button>
    if (workflow.step3Action === "create-receipt") return <button type="button" onClick={() => openDocument("receipt")} className={primaryWorkflowClass}><ReceiptText className="h-4 w-4" />Create & Send Receipt</button>
    if (workflow.step3Action === "schedule-delivery") return <button type="button" onClick={openDeliverySchedule} className={primaryWorkflowClass}><CalendarClock className="h-4 w-4" />Schedule Delivery</button>
    return latestClientDocument && documentLinks[latestClientDocument.documentType]
      ? <a href={documentLinks[latestClientDocument.documentType]} target="_blank" rel="noreferrer" className={secondaryWorkflowClass}><CheckCircle2 className="h-4 w-4 text-emerald-700" />Open Final Document</a>
      : <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Payment & Delivery Complete</span>
  }

  return (
    <div className="grid gap-2 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:pb-0">
      <details open={pricingStatus === "active"} className={workflowStepCardClass()}>
        <RequestWorkflowStepHeader requestId={requestId} step={2} title="Supplier quotes" detail={pricingDetail} status={pricingStatus} icon="pricing" />
        <div className="border-t border-slate-200 p-3" data-testid="request-step-2">
          <div className="mb-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{pricingSummaryItems.length} item{pricingSummaryItems.length === 1 ? "" : "s"}</span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">{selectedSupplierNames.length} supplier{selectedSupplierNames.length === 1 ? "" : "s"}</span>
            <span className={`rounded-full px-2.5 py-1 ${supplierQuoteCount ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{supplierQuoteCount} quote{supplierQuoteCount === 1 ? "" : "s"} received</span>
          </div>

          {supplierProgressRows.length ? <div role="table" aria-label="Suppliers selected in Step 1" className="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white"><div role="row" className="hidden grid-cols-[minmax(0,1fr)_13rem_6rem] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-bold uppercase tracking-[.08em] text-slate-500 sm:grid"><span role="columnheader">Supplier</span><span role="columnheader">Status</span><span role="columnheader" className="text-right">Contact</span></div><div className="divide-y divide-slate-100">{supplierProgressRows.map((row) => {
            const contactStatus = row.bid ? "quote_received" : row.supplier ? supplierContactStatuses[row.supplier.id] || (row.supplierPackage ? "request_sent" : "not_contacted") : "not_contacted"
            return <article role="row" key={row.name} className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_13rem_6rem]">
              <div role="cell" className="min-w-0"><p className="truncate text-sm font-black text-[#12263f]">{row.name}</p>{row.bid ? <p className="mt-0.5 truncate text-[10px] font-bold text-emerald-700">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.bid.landedTotal)} total received</p> : null}{row.note ? <p title={row.note} className="mt-0.5 truncate text-[10px] text-slate-500">{row.note}</p> : null}</div>
              <div role="cell" className="col-span-2 sm:col-span-1"><label className="sr-only" htmlFor={`supplier-status-${row.supplier?.id || row.name}`}>Status for {row.name}</label><select id={`supplier-status-${row.supplier?.id || row.name}`} value={contactStatus} disabled={!row.supplier || pending || Boolean(row.bid)} onChange={(event) => row.supplier && updateSupplierContactStatus(row.supplier.id, event.target.value as RequestSupplierContactStatus)} className={`min-h-10 w-full rounded-lg border px-2.5 text-xs font-bold ${contactStatus === "quote_received" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : contactStatus === "not_contacted" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}>{SUPPLIER_CONTACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
              <div role="cell" className="row-start-1 flex justify-end gap-1.5 sm:col-start-3">
              {row.supplier?.phone ? <a href={`tel:${row.supplier.phone}`} aria-label={`Call ${row.name}`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700"><Phone className="h-4 w-4" /></a> : null}
              {row.supplier?.email ? <a href={`mailto:${row.supplier.email}`} aria-label={`Email ${row.name}`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700"><Mail className="h-4 w-4" /></a> : null}
              </div>
            </article>
          })}</div></div> : <p className="mb-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">Choose suppliers in Step 1 to begin pricing.</p>}

          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 mb-3 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,23,42,.14)] backdrop-blur">{renderStep2PrimaryAction()}</div>

          {!workflow.step2Complete && workflow.step2Action !== "add-supplier-quote" ? <button type="button" onClick={() => setQuoteEntryOpen((open) => !open)} aria-expanded={quoteEntryOpen} className={secondaryWorkflowClass}><Plus className="h-4 w-4" />Add Supplier Quote</button> : null}
          {!workflow.step2Complete && quoteEntryOpen ? <div className="mt-2 grid gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2 sm:grid-cols-2">
            <a href={`/admin/supplier-quotes?request=${requestId}#supplier-quote-upload`} className={secondaryWorkflowClass}><Paperclip className="h-4 w-4" />Upload File or Photo</a>
            <button type="button" onClick={() => { setQuoteEntryOpen(false); openManualPricing() }} disabled={pending} className={secondaryWorkflowClass}><Plus className="h-4 w-4" />Enter Pricing Manually</button>
          </div> : null}

          <details className="group/request mt-2 rounded-lg border border-slate-200 bg-slate-50">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-bold"><span>Request Details &amp; Notes</span><span className="inline-flex items-center gap-2 text-[10px] font-normal text-slate-400">{managerNotes ? "Note saved" : `${pricingSummaryItems.length} items`}<ChevronDown className="h-4 w-4 transition group-open/request:rotate-180" /></span></summary>
            <div className="border-t border-slate-200 p-2">
              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[.08em] text-slate-500">Request Notes<textarea value={managerNotes} onChange={(event) => { const value = event.target.value; setManagerNotes(value); notesAutosave.queue(value) }} rows={2} maxLength={5000} placeholder="Add a note for this request…" className="min-h-20 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-950" /></label>
              <AutosaveStatus status={notesAutosave.status} error={notesAutosave.error} retry={notesAutosave.retry} />
              <div className="mt-2 grid gap-1 sm:hidden">{pricingSummaryItems.slice(0, 8).map((item) => <div key={item.id} className="rounded-md border border-slate-200 bg-white p-2"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-black text-slate-900">{requestItems.find((candidate) => candidate.id === item.id)?.quantity || "—"} · {item.organized}</p><p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">Original: {item.original}</p></div></div><div className="mt-2"><RequestSupplierRouteEditor key={`${item.id}-${supplierRouteVersion(item.metadata)}`} requestId={requestId} itemId={item.id} metadata={item.metadata} suppliers={availableSuppliers} /></div></div>)}</div>
              <div className="mt-2 hidden overflow-x-auto rounded-md border border-slate-200 bg-slate-100 sm:block" data-testid="request-step-2-scroll-region"><table className="w-full min-w-[42rem] table-fixed text-left text-[11px]"><thead className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-500"><tr><th className="w-16 px-2 py-1.5">Qty</th><th className="px-2 py-1.5">Original</th><th className="px-2 py-1.5">Organized Item</th><th className="px-2 py-1.5">Supplier Route &amp; Note</th></tr></thead><tbody className="divide-y divide-slate-200 bg-slate-50">{pricingSummaryItems.slice(0, 8).map((item) => <tr key={item.id}><td className="px-2 py-1.5 font-bold">{requestItems.find((candidate) => candidate.id === item.id)?.quantity || "—"}</td><td title={item.original} className="truncate px-2 py-1.5 text-slate-500">{item.original}</td><td title={item.organized} className="truncate px-2 py-1.5 font-semibold">{item.organized}</td><td className="px-2 py-1.5"><RequestSupplierRouteEditor key={`${item.id}-${supplierRouteVersion(item.metadata)}`} requestId={requestId} itemId={item.id} metadata={item.metadata} suppliers={availableSuppliers} /></td></tr>)}</tbody></table></div>
            </div>
          </details>

          <details id="supplier-routing" open={supplierRoutingOpen} onToggle={(event) => setSupplierRoutingOpen(event.currentTarget.open)} className="group/route mt-2 scroll-mt-24 rounded-md border border-slate-200 bg-slate-50">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold"><span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-sky-700" />Add or change suppliers</span><ChevronDown className="h-4 w-4 text-slate-400 transition group-open/route:rotate-180" /></summary>
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
            <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => startTransition(async () => { await saveSupplierPlan() })} disabled={pending} className={secondaryWorkflowClass}>Save Supplier Choices</button><button type="button" onClick={createSupplierRequest} disabled={!supplierIds.length || pending} className={primaryWorkflowClass}><Route className="h-4 w-4" />Contact {supplierIds.length || ""} Supplier{supplierIds.length === 1 ? "" : "s"}</button></div>
            <div className="rounded-md border border-violet-200 bg-violet-50 p-2"><button type="button" onClick={() => setOnlineSupplierSearchOpen((value) => !value)} className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-md bg-white px-3 text-left text-xs font-bold text-violet-900"><span className="inline-flex items-center gap-2"><Search className="h-4 w-4" />AI · Look for suppliers online</span><ChevronDown className={`h-4 w-4 transition ${onlineSupplierSearchOpen ? "rotate-180" : ""}`} /></button>{onlineSupplierSearchOpen ? <MaterialPriceCheck requestId={requestId} query={onlineSupplierQuery || requestTitle} department={routeDepartment} defaultZipCode={(projectAddress.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || "11516")} onClose={() => setOnlineSupplierSearchOpen(false)} /> : null}</div>
          </div>
          {packages.length ? <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current routes</p><div className="mt-2 grid gap-2">{packages.map((pkg) => <div key={pkg.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{pkg.department}</span><span className="text-right text-slate-600">{suppliers.find((entry) => entry.id === pkg.supplier_id)?.name || "Not assigned"} · {pkg.status.replaceAll("_", " ")}</span></div>)}</div></div> : null}
            </div>
          </details>
          <button type="button" onClick={openManualPricing} disabled={pending || !selectedSupplierNames.length} className={`${primaryWorkflowClass} mt-2`}><Award className="h-4 w-4" />Compare Client Price &amp; Supplier Quotes</button>
        </div>
      </details>

      <details open={paymentDeliveryStatus === "active"} className={workflowStepCardClass()}>
        <RequestWorkflowStepHeader requestId={requestId} step={3} title="Client, payment & delivery" detail={fulfillmentDetail} status={paymentDeliveryStatus} icon="payment" allowManualCompletion={false} />
        <div className="border-t border-slate-200 p-3" data-testid="request-step-3">
          <ol className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {[
              { key: "estimate", label: "Estimate & approval", done: estimateSent && clientApproved, active: ["send-estimate", "wait-for-approval"].includes(workflow.step3Action), detail: !estimateSent ? "Not sent" : clientApproved ? "Client approved" : "Waiting for approval", icon: FileCheck2 },
              { key: "invoice", label: "Invoice & payment link", done: invoiceSent && paymentLinkSent, active: ["create-invoice", "send-payment-link"].includes(workflow.step3Action), detail: !invoiceSent ? "Invoice not sent" : paymentLinkSent ? "Payment link sent" : "Send payment link", icon: FileText },
              { key: "receipt", label: "Payment & receipt", done: paymentReceived && receiptSent, active: ["mark-paid", "create-receipt"].includes(workflow.step3Action), detail: !paymentReceived ? "Payment pending" : receiptSent ? "Receipt sent" : "Create receipt", icon: ReceiptText },
              { key: "delivery", label: "Delivery", done: deliveryScheduled, active: workflow.step3Action === "schedule-delivery", detail: deliveryScheduled ? "Scheduled" : "Not scheduled", icon: CalendarClock },
            ].map((item, index) => <li key={item.key} data-fulfillment-action={item.key} className={`flex min-h-14 items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 ${item.active ? "bg-sky-50" : ""}`}>
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : item.active ? "border-sky-200 bg-white text-sky-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{item.done ? <Check className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-black text-[#12263f]">{index + 1}. {item.label}</span><span className={`mt-0.5 block text-[10px] font-semibold ${item.done ? "text-emerald-700" : item.active ? "text-sky-700" : "text-slate-500"}`}>{item.detail}</span></span>
            </li>)}
          </ol>

          {latestClientDocument ? <div className="mt-2 flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><FileCheck2 className="h-4 w-4 shrink-0 text-[#0066cc]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[#12263f]">{latestClientDocument.documentType[0].toUpperCase() + latestClientDocument.documentType.slice(1)} {latestClientDocument.documentNumber}</p><p className="text-[10px] text-slate-500">Version {latestClientDocument.version} · live link always shows the latest saved version</p></div>{documentLinks[latestClientDocument.documentType] ? <a href={documentLinks[latestClientDocument.documentType]} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] font-bold text-[#0066cc] underline">Open</a> : null}</div> : null}

          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 mt-3 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,23,42,.14)] backdrop-blur">{renderStep3PrimaryAction()}</div>

          <details className="group/docs mt-2 rounded-lg border border-slate-200 bg-slate-50"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-bold"><span>All Documents</span><span className="inline-flex items-center gap-1 text-[10px] font-normal text-slate-500">Edit, send, or download<ChevronDown className="h-4 w-4 transition group-open/docs:rotate-180" /></span></summary><div className="grid grid-cols-3 gap-1.5 border-t border-slate-200 p-2"><button type="button" onClick={() => openDocument("estimate")} className={secondaryWorkflowClass}><FileCheck2 className="h-3.5 w-3.5" />Estimate</button><button type="button" onClick={() => openDocument("invoice")} className={secondaryWorkflowClass}><FileText className="h-3.5 w-3.5" />Invoice</button><button type="button" onClick={() => openDocument("receipt")} className={secondaryWorkflowClass}><ReceiptText className="h-3.5 w-3.5" />Receipt</button></div></details>
          {feedback ? <p className={`mt-2 rounded-lg border px-3 py-2 text-xs font-semibold ${feedbackError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status" aria-live="polite">{feedback}</p> : null}
        </div>
      </details>

      {contactOpen && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[145] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="request-client-contact-title" onMouseDown={(event) => { if (event.currentTarget === event.target) closeContact() }}>
          <section ref={contactDialogRef} id="request-client-contact-dialog" className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">Available at every stage</p><h2 id="request-client-contact-title" className="truncate text-lg font-bold">Contact client</h2><p className="text-xs text-slate-500">{replyComplete ? "Client contacted · send another update when needed" : "Message, estimate, or delivery"}</p></div>
              <button type="button" onClick={closeContact} disabled={pending} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white disabled:opacity-40" aria-label="Close contact client"><X className="h-4 w-4" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
          <RelatedEmailTimeline title="Client email" emails={clientEmails} />
          <div>
            {missingQuestions.length ? <p className="mt-1 text-xs font-semibold text-amber-700">{missingQuestions.length} missing details can be added to the reply automatically.</p> : null}

            <details open={deliveryOpen} onToggle={(event) => setDeliveryOpen(event.currentTarget.open)} className="mt-3 rounded-lg border border-slate-200 bg-slate-50">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold"><span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-emerald-700" />Schedule delivery</span><ChevronDown className="h-4 w-4 text-slate-400" /></summary>
              <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1 text-xs font-bold text-slate-600">Date<input type="date" min={siteBusinessDateKey() ?? undefined} value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-600">Window starts (Eastern)<input type="time" value={deliveryWindowStart} onChange={(event) => setDeliveryWindowStart(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
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
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold"><input type="checkbox" checked={requestPayment} onChange={(event) => { setRequestPayment(event.target.checked); if (event.target.checked && !paymentAmountDue) setPaymentAmountDue(quoteTotal.toFixed(2)) }} className="h-4 w-4 accent-[#0071e3]" />Request payment from client</label>
                {requestPayment ? <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 sm:p-4">
                  <p className="text-xs font-bold leading-5 text-slate-700">Add only payment-request details. Never enter card numbers, CVV/security codes, routing numbers, or bank account numbers.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-bold">Payment method<select value={paymentMethod} onChange={(event) => { const method = event.target.value as RequestPaymentMethod; setPaymentMethod(method); if (method !== "credit_card" && hostedPaymentUrl === AVANTIA_PAYMENT_LINK) setHostedPaymentUrl(""); if (method === "credit_card" && !hostedPaymentUrl) setHostedPaymentUrl(AVANTIA_PAYMENT_LINK) }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="credit_card">Credit card</option><option value="ach">ACH</option><option value="check">Check</option></select></label>
                    <label className="grid gap-1 text-xs font-bold">Amount due<input type="number" min="0.01" max="10000000" step="0.01" inputMode="decimal" value={paymentAmountDue} onChange={(event) => setPaymentAmountDue(event.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" /></label>
                    <label className="grid gap-1 text-xs font-bold sm:col-span-2">Optional instructions<textarea value={paymentInstructions} onChange={(event) => setPaymentInstructions(event.target.value)} maxLength={500} rows={2} placeholder="For example: Please call us to coordinate payment." className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>
                    <label className="grid gap-1 text-xs font-bold sm:col-span-2">Hosted secure payment URL <span className="font-normal text-slate-500">(optional)</span><input type="url" inputMode="url" autoComplete="url" value={hostedPaymentUrl} onChange={(event) => setHostedPaymentUrl(event.target.value)} placeholder="Paste an existing HTTPS payment link" className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" /><span className="font-normal leading-5 text-slate-500">Use only an existing HTTPS checkout URL. Leave blank when payment must be coordinated by phone.</span></label>
                  </div>
                  <p className="mt-3 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700">{requestPaymentGuidance({ method: paymentMethod, securePaymentUrl: hostedPaymentUrl.trim() || undefined })}</p>
                </div> : null}
              </div>
              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteSubtotal)}</strong></div><label className="mt-3 flex items-center justify-between gap-3 text-sm"><span>Delivery</span><input type="number" min="0" step="0.01" value={deliveryCharge} onChange={(event) => setDeliveryCharge(Number(event.target.value))} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label><label className="mt-2 flex items-center justify-between gap-3 text-sm"><span>Sales tax % <span className="block text-[10px] font-normal text-slate-500">Destination rate</span></span><input type="number" min="0" max="20" step="0.001" value={salesTaxRate} onChange={(event) => { setSalesTaxRate(Number(event.target.value)); setTaxRecommendation("Rate edited manually") }} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label><label className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={taxableDelivery} onChange={(event) => setTaxableDelivery(event.target.checked)} className="mt-1" /><span>Include Avantia-billed delivery in the taxable amount</span></label>{taxRecommendation ? <p className="mt-2 text-xs font-semibold text-emerald-700">{taxRecommendation}</p> : <p className="mt-2 text-xs text-slate-500">Tax is calculated on materials and, when checked, Avantia-billed delivery.</p>}<div className="mt-3 flex justify-between border-t border-slate-300 pt-3 text-lg"><strong>Total</strong><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteTotal)}</strong></div></aside>
            </div>
            {quoteFeedback ? <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold" role="status">{quoteFeedback}</p> : null}
          </div>
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">{documentLinks[documentType] ? <a href={documentLinks[documentType]} target="_blank" rel="noreferrer" className="mr-auto text-xs font-bold text-[#0066cc] underline">Open live client link</a> : null}<button type="button" onClick={saveDocument} disabled={pending || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 disabled:opacity-40"><FileCheck2 className="h-4 w-4" />Save changes</button><button type="button" onClick={downloadQuote} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold disabled:opacity-40"><Download className="h-4 w-4" />Download PDF</button><button type="button" onClick={textQuote} disabled={pending || !client.phone || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0071e3] bg-white px-4 text-sm font-bold text-[#0066cc] disabled:opacity-40"><MessageSquareText className="h-4 w-4" />Text live link</button><button type="button" onClick={sendQuote} disabled={pending || !client.email || !quoteLines.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />{pending ? "Working..." : `Email live link`}</button></footer>
        </section>
      </div>, document.body) : null}
    </div>
  )
}
