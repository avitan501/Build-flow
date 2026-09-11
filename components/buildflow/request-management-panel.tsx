"use client"

import { Award, CalendarClock, Check, CheckCircle2, ChevronDown, CircleDollarSign, Download, FileCheck2, FileText, FolderOpen, Mail, MessageCircle, MessageSquareText, Paperclip, Pencil, Phone, Plus, ReceiptText, Route, Send, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"

import { prepareQuoAttachmentMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions"
import { openRequestPricingComparisonAction } from "@/app/admin/supplier-quotes/actions"
import { addRequestAttachmentsAction, deleteRequestClientDocumentAction, prepareRequestAttachmentUploadAction, previewRequestClientQuoteAction, recordRequestClientApprovalAction, recordRequestClientDocumentSentAction, recordRequestPaymentLinkSentAction, recordRequestPaymentReceivedAction, saveRequestClientDocumentAction, saveRequestSupplierPlanAction, scheduleRequestDeliveryAction, sendClientReplyAction, sendRequestClientQuoteAction, updateRequestSupplierContactStatusAction, type ExistingRequestUploadInput, type QuoteResult, type RequestClientQuoteInput, type RequestSupplierContactStatus } from "@/app/owner/materials/requests/actions"
import { saveRequestSupplierProgressNoteAction } from "@/app/owner/materials/requests/supplier-progress-actions"
import { LocationAutocomplete } from "@/components/buildflow/location-autocomplete"
import { RelatedEmailTimeline, type RelatedEmailItem } from "@/components/buildflow/related-email-timeline"
import { OPEN_REQUEST_CLIENT_CONTACT_EVENT } from "@/components/buildflow/request-client-contact"
import { RequestSubstepFunnel } from "@/components/buildflow/request-substep-funnel"
import { RequestAttachmentSourceControl } from "@/components/buildflow/request-attachment-source-control"
import { RequestWorkflowStepHeader, workflowStepCardClass } from "@/components/buildflow/request-workflow-step-header"
import { buildClientLinkMessage, splitClientLinkMessage } from "@/lib/client-link-message"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"
import type { ManagerPipelineStage } from "@/lib/manager-dashboard"
import { DEFAULT_PROPOSAL_TERMS, includeRequiredProposalTerms, proposalTermsForEditor } from "@/lib/proposal-terms"
import { AVANTIA_PAYMENT_LINK } from "@/lib/payment-link"
import type { RequestClientDocumentType } from "@/lib/request-client-quote-pdf"
import type { RequestClientDocumentAttachment } from "@/lib/request-client-document-data"
import { requestPaymentGuidanceForMethod, type RequestPaymentMethod } from "@/lib/request-client-payment"
import type { RequestWorkflowSubstepId } from "@/lib/request-workflow-substeps"
import { requestSupplierFolderContents } from "@/lib/request-supplier-folder"
import { requestWorkflowState, type RequestWorkflowAction } from "@/lib/request-workflow-state"
import { formatSiteDate, formatSiteWallTime, siteBusinessDateKey } from "@/lib/site-date-time"
import { PRODUCTION_SITE_ORIGIN } from "@/lib/site-url"
import { findCanonicalSupplier } from "@/lib/supplier-canonical"
import { createClient } from "@/lib/supabase/client"

type PackageRoute = { id: string; department: string; supplier_id: string | null; status: string }
type QuoteLine = { key: string; description: string; quantity: number; unit: string; unitPrice: number; included: boolean }
export type RequestComparisonSummary = {
  id: string
  title: string
  status: string
  awardedBidId: string | null
  clientQuoteStatus: string
  quoteNumber: string
  updatedAt: string
  bids: Array<{ id: string; supplierId: string; supplierName: string; landedTotal: number; pricedItemCount: number; unavailableItemCount: number; itemCount: number; recommended: boolean; items: Array<{ id: string; sourceRequestItemId: string | null; name: string; status: "quoted" | "unavailable" | "waiting" }> }>
  documents: Array<{ id: string; supplierId: string | null; fileName: string; sourceUrl: string | null }>
}
export type RequestSupplierRouteSelection = { supplierId: string | null; name: string; note: string }
export type RequestClientDocumentSnapshot = {
  documentType: RequestClientDocumentType
  documentNumber: string
  publicToken: string
  managerPreviewToken: string
  version: number
  updatedAt: string
  lastOpenedAt: string | null
  documentData: {
    issueDate?: string
    clientEmail?: string
    clientAddress?: string
    shipTo?: string
    lines?: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>
    deliveryCharge?: number
    salesTaxRate?: number
    taxableDelivery?: boolean
    terms?: string
    paymentRequest?: { methods?: RequestPaymentMethod[]; method?: RequestPaymentMethod; amountDue: number; methodInstructions?: Partial<Record<RequestPaymentMethod, string>>; instructions?: string; securePaymentUrl?: string }
    paymentLink?: string
    attachments?: RequestClientDocumentAttachment[]
  }
}

type ClientReadyToPayDefaults = {
  itemUnitPrices: Record<string, number>
  deliveryCharge: number
  salesTaxRate: number
}

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50"
const supplierNameCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })
const SUPPLIER_CONTACT_STATUS_OPTIONS: Array<{ value: RequestSupplierContactStatus; label: string }> = [
  { value: "not_contacted", label: "Not contacted" },
  { value: "request_sent", label: "Request sent" },
  { value: "supplier_replied", label: "They replied" },
  { value: "awaiting_supplier_reply", label: "We replied · waiting" },
  { value: "quote_received", label: "Quote received" },
  { value: "unavailable", label: "They don’t have it" },
]

const TAX_LOCATION_PRESETS = [
  { value: "custom", label: "Custom / verified address", rate: null },
  { value: "ny-nassau", label: "NY · Nassau County", rate: 8.625 },
  { value: "ny-suffolk", label: "NY · Suffolk County", rate: 8.75 },
  { value: "nyc", label: "NY · New York City", rate: 8.875 },
  { value: "nj", label: "New Jersey", rate: 6.625 },
] as const

function taxPresetForRate(rate: number) {
  return TAX_LOCATION_PRESETS.find((option) => option.rate !== null && Math.abs(option.rate - rate) < 0.0001)?.value || "custom"
}

function supplierContactStatusClass(status: RequestSupplierContactStatus | "no_response") {
  if (status === "no_response") return "border-rose-200 bg-rose-50 text-rose-800"
  if (status === "quote_received") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "unavailable") return "border-rose-200 bg-rose-50 text-rose-800"
  if (status === "awaiting_supplier_reply") return "border-amber-200 bg-amber-50 text-amber-900"
  if (status === "supplier_replied") return "border-violet-200 bg-violet-50 text-violet-800"
  if (status === "request_sent") return "border-sky-200 bg-sky-50 text-sky-800"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function resolvedRouteSupplierIds(routeSelections: RequestSupplierRouteSelection[], suppliers: SupplierRoutingOption[]) {
  return [...new Set(routeSelections.flatMap((selection) => {
    const supplier = findCanonicalSupplier(suppliers, selection)
    return supplier ? [supplier.id] : []
  }))]
}

function SupplierNoteAutosave({ requestId, supplierId, supplierName, initialNote }: { requestId: string; supplierId: string; supplierName: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote)
  const [message, setMessage] = useState("")
  const lastSaved = useRef(initialNote)
  const versionRef = useRef(0)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (note === lastSaved.current) return
    const version = ++versionRef.current
    const timer = window.setTimeout(() => {
      const value = note
      startTransition(async () => {
        try {
          const result = await saveRequestSupplierProgressNoteAction({ requestId, supplierId, note: value })
          if (version !== versionRef.current) return
          if (result.ok) {
            lastSaved.current = value
            setMessage("Saved")
          } else {
            setMessage(result.error)
          }
        } catch {
          if (version !== versionRef.current) return
          setMessage("The supplier note was not saved. Check the connection and try again.")
        }
      })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [note, requestId, supplierId])

  const saveLabel = pending ? "Saving…" : message === "Saved" ? "Saved" : message ? "Not saved" : ""
  return <div className="relative"><input aria-label={`Note for ${supplierName}`} value={note} onChange={(event) => { setNote(event.target.value); setMessage("") }} placeholder="Supplier note" maxLength={2000} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 pr-14 text-[11px] text-slate-800" /><span aria-live="polite" aria-label={message || saveLabel} title={message || undefined} className={`pointer-events-none absolute inset-y-0 right-2 flex items-center text-[9px] font-bold ${message && message !== "Saved" ? "text-rose-700" : "text-emerald-700"}`}>{saveLabel}</span></div>
}
function savedDocumentTotal(documentData: RequestClientDocumentSnapshot["documentData"]) {
  const subtotal = (documentData.lines ?? []).reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)
  const deliveryCharge = Number(documentData.deliveryCharge || 0)
  const salesTaxRate = Number(documentData.salesTaxRate || 0)
  const tax = (subtotal + (documentData.taxableDelivery === false ? 0 : deliveryCharge)) * salesTaxRate / 100
  return subtotal + deliveryCharge + tax
}

const REPLY_BLOCKS = [
  { id: "received", label: "Order received", text: "We received your order and are reviewing it now." },
  { id: "question", label: "I have a question", text: "I have a question about your request before we continue." },
  { id: "pricing", label: "Pricing is ready", text: "Your pricing is ready. Please review the attached quote." },
  { id: "missing", label: "Ask for missing details", text: "Please reply with the missing information so we can complete your request." },
  { id: "payment", label: "Secure payment link", text: "Use Avantia Build's secure payment link below." },
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
  clientReadyToPayDefaults,
  pricingSummaryItems,
  routeSelections,
  projectAddress,
  currentSubstep,
  itemsReadyForPricing = true,
  comparisons,
  clientReplyCompleted,
  step2CompletedOverride,
  step3CompletedOverride,
  initialPaymentDelivery,
  initialClientDocuments,
  initialSupplierRecommendations,
  clientEmails,
  requestAttachments,
  supplierRequestFiles,
  supplierRequestItemLinks,
}: {
  requestId: string
  requestTitle: string
  client: { name: string; email: string; phone: string }
  departments: string[]
  suppliers: SupplierRoutingOption[]
  packages: PackageRoute[]
  requestItems: Array<{ id: string; name: string; quantity: number; unit: string | null; reviewReasons: string[] }>
  clientReadyToPayDefaults: ClientReadyToPayDefaults
  pricingSummaryItems: Array<{ id: string; original: string; organized: string; route: string; metadata: Record<string, unknown> | null }>
  routeSelections: RequestSupplierRouteSelection[]
  projectAddress: string
  currentStage: ManagerPipelineStage
  currentSubstep: RequestWorkflowSubstepId
  itemsReadyForPricing?: boolean
  comparisons: RequestComparisonSummary[]
  clientReplyCompleted: boolean
  step2CompletedOverride: boolean | null
  step3CompletedOverride: boolean | null
  initialPaymentDelivery: { documentType: "invoice" | "receipt" | null; estimateSent: boolean; clientApproved: boolean; invoiceSent: boolean; receiptSent: boolean; paymentLinkSent: boolean; paymentReceived: boolean; deliveryScheduled: boolean }
  initialClientDocuments: RequestClientDocumentSnapshot[]
  initialSupplierRecommendations: Array<{ supplierId: string; isRecommended: boolean; shouldContact: boolean; contactStatus: RequestSupplierContactStatus; note: string }>
  clientEmails: RelatedEmailItem[]
  supplierEmails: RelatedEmailItem[]
  requestAttachments: RequestClientDocumentAttachment[]
  supplierRequestFiles: Array<{ id: string; fileName: string; url: string | null }>
  supplierRequestItemLinks: Array<{ supplierId: string; itemIds: string[]; channel: string }>
}) {
  const router = useRouter()
  const initialRouteSupplierIds = resolvedRouteSupplierIds(routeSelections, suppliers)
  const supplierIds = [...new Set([...initialSupplierRecommendations.filter((entry) => entry.shouldContact).map((entry) => entry.supplierId), ...initialRouteSupplierIds])]
  const recommendedSupplierIds = [...new Set([...initialSupplierRecommendations.filter((entry) => entry.isRecommended).map((entry) => entry.supplierId), ...initialRouteSupplierIds])]
  const supplierContactStatuses = useMemo<Record<string, RequestSupplierContactStatus>>(() => Object.fromEntries(initialSupplierRecommendations.map((entry) => [entry.supplierId, entry.contactStatus || "not_contacted"])), [initialSupplierRecommendations])
  const [supplierContactStatusOverrides, setSupplierContactStatusOverrides] = useState<Record<string, { base: RequestSupplierContactStatus; value: RequestSupplierContactStatus }>>({})
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
  const [quoteEntryOpen, setQuoteEntryOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [comparisonFolderSupplier, setComparisonFolderSupplier] = useState<{ supplierId: string; name: string } | null>(null)
  const [documentType, setDocumentType] = useState<RequestClientDocumentType>("estimate")
  const [quoteNumber, setQuoteNumber] = useState(() => `AVA-${(siteBusinessDateKey() ?? "").replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
  const [issueDate, setIssueDate] = useState(() => formatSiteDate(new Date(), { month: "numeric", day: "numeric", year: "numeric" }))
  const [clientAddress, setClientAddress] = useState("")
  const [shipTo, setShipTo] = useState(projectAddress)
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>(() => requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: Number(clientReadyToPayDefaults.itemUnitPrices[item.id]) || 0, included: true })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0, included: true }])
  const [deliveryItemIds, setDeliveryItemIds] = useState<string[]>(() => requestItems.map((item) => item.id))
  const [deliveryCharge, setDeliveryCharge] = useState(clientReadyToPayDefaults.deliveryCharge)
  const [salesTaxRate, setSalesTaxRate] = useState(clientReadyToPayDefaults.salesTaxRate)
  const [taxLocationPreset, setTaxLocationPreset] = useState(() => taxPresetForRate(clientReadyToPayDefaults.salesTaxRate))
  const [taxableDelivery, setTaxableDelivery] = useState(true)
  const [taxRecommendation, setTaxRecommendation] = useState("")
  const [quoteTerms, setQuoteTerms] = useState(DEFAULT_PROPOSAL_TERMS)
  const [quoteMessage, setQuoteMessage] = useState("Please review your Avantia Build estimate. Reply with any questions or approval.")
  const [requestPayment, setRequestPayment] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<RequestPaymentMethod[]>(["credit_card"])
  const [paymentAmountDue, setPaymentAmountDue] = useState("")
  const [paymentInstructions, setPaymentInstructions] = useState<Partial<Record<RequestPaymentMethod, string>>>({})
  const [hostedPaymentUrl, setHostedPaymentUrl] = useState(AVANTIA_PAYMENT_LINK)
  const [quoteFeedback, setQuoteFeedback] = useState("")
  const [preparedDocumentText, setPreparedDocumentText] = useState<{ message: string; url: string; inputSignature: string; documentType: RequestClientDocumentType; documentNumber: string } | null>(null)
  const [documentAttachments, setDocumentAttachments] = useState<RequestClientDocumentAttachment[]>([])
  const [attachmentUploadPending, setAttachmentUploadPending] = useState(false)
  const [deletedDocumentTokens, setDeletedDocumentTokens] = useState<string[]>([])
  const [deletingDocument, setDeletingDocument] = useState("")
  const [documentLinks, setDocumentLinks] = useState<Record<RequestClientDocumentType, string | undefined>>(() => Object.fromEntries(initialClientDocuments.map((entry) => [entry.documentType, `${PRODUCTION_SITE_ORIGIN}/client-document/${entry.publicToken}`])) as Record<RequestClientDocumentType, string | undefined>)
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

  const firstName = client.name.trim().split(/\s+/)[0] || "there"
  const missingQuestions = useMemo(() => requestItems.flatMap((item) => item.reviewReasons.map((reason) => `${item.name}: ${reason}`)), [requestItems])
  const deliveryWindowHoursNumber = Number(deliveryWindowHours)
  const deliveryWindowEnd = useMemo(() => deliveryWindowEndTime(deliveryWindowStart, deliveryWindowHoursNumber), [deliveryWindowHoursNumber, deliveryWindowStart])
  const deliveryWindowReady = Boolean(deliveryDate && deliveryWindowStart && deliveryWindowEnd && deliveryAddress.trim() && deliveryWindowHoursNumber >= 0.5 && deliveryWindowHoursNumber <= 12 && deliveryItemIds.length)
  const deliveryItemLabels = useMemo(() => requestItems.filter((item) => deliveryItemIds.includes(item.id)).map((item) => `${item.quantity} ${item.unit || "each"} ${item.name}`), [deliveryItemIds, requestItems])

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
        ...(deliveryItemLabels.length ? ["Materials:", ...deliveryItemLabels.map((item) => `- ${item}`)] : []),
      ]
      return [block.text]
    })
    const messageText = [greetingText, "", ...selectedText, ...(replyNote.trim() ? [replyNote.trim()] : []), "", `Request: ${requestTitle}`, "", "Thank you,", "Avantia Build"].join("\n")
    return replyBlock === "payment"
      ? buildClientLinkMessage({ messageText, url: AVANTIA_PAYMENT_LINK, fallbackMessage: "Use Avantia Build's secure payment link below." })
      : messageText
  }, [client.name, deliveryAddress, deliveryDate, deliveryItemLabels, deliveryWindowEnd, deliveryWindowHoursNumber, deliveryWindowStart, firstName, greeting, missingQuestions, replyBlock, replyNote, requestTitle])

  const clientPaymentPreview = useMemo(() => replyBlock === "payment" ? splitClientLinkMessage(clientMessage) : null, [clientMessage, replyBlock])

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

  function openDocument(nextType: RequestClientDocumentType, selectedDocument?: RequestClientDocumentSnapshot) {
    const saved = selectedDocument ?? clientDocuments.find((entry) => entry.documentType === nextType)
    const savedPayment = saved?.documentData.paymentRequest
    const savedPaymentMethods = savedPayment?.methods?.length ? savedPayment.methods : savedPayment?.method ? [savedPayment.method] : ["credit_card" as const]
    const legacyPaymentLink = saved?.documentData.paymentLink
    const prefix = nextType === "invoice" ? "INV" : nextType === "receipt" ? "REC" : "AVA"
    setDocumentType(nextType)
    setQuoteNumber(saved?.documentNumber || `${prefix}-${(siteBusinessDateKey() ?? "").replaceAll("-", "")}-${requestId.slice(0, 4).toUpperCase()}`)
    setIssueDate(saved?.documentData.issueDate || formatSiteDate(new Date(), { month: "numeric", day: "numeric", year: "numeric" }))
    setClientAddress(saved?.documentData.clientAddress || "")
    setShipTo(saved?.documentData.shipTo || projectAddress)
    setQuoteLines(saved?.documentData.lines?.length ? saved.documentData.lines.map((line) => ({ ...line, key: crypto.randomUUID(), included: true })) : requestItems.length ? requestItems.map((item) => ({ key: item.id, description: item.name, quantity: Number(item.quantity) || 1, unit: item.unit || "each", unitPrice: Number(clientReadyToPayDefaults.itemUnitPrices[item.id]) || 0, included: true })) : [{ key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0, included: true }])
    setDeliveryCharge(saved?.documentData.deliveryCharge === undefined ? clientReadyToPayDefaults.deliveryCharge : Number(saved.documentData.deliveryCharge) || 0)
    setSalesTaxRate(Number.isFinite(saved?.documentData.salesTaxRate) ? Number(saved?.documentData.salesTaxRate) : clientReadyToPayDefaults.salesTaxRate)
    setTaxLocationPreset(taxPresetForRate(Number.isFinite(saved?.documentData.salesTaxRate) ? Number(saved?.documentData.salesTaxRate) : clientReadyToPayDefaults.salesTaxRate))
    setTaxableDelivery(saved?.documentData.taxableDelivery !== false)
    setQuoteTerms(proposalTermsForEditor(saved?.documentData.terms))
    setRequestPayment(Boolean(savedPayment || legacyPaymentLink))
    setPaymentMethods(savedPaymentMethods)
    setPaymentAmountDue(savedPayment?.amountDue ? String(savedPayment.amountDue) : legacyPaymentLink ? savedDocumentTotal(saved.documentData).toFixed(2) : "")
    setPaymentInstructions(savedPayment?.methodInstructions || (savedPayment?.instructions ? { [savedPaymentMethods[0]]: savedPayment.instructions } : {}))
    setHostedPaymentUrl(savedPayment?.securePaymentUrl || legacyPaymentLink || AVANTIA_PAYMENT_LINK)
    setDocumentAttachments(saved?.documentData.attachments || [])
    setQuoteMessage(nextType === "invoice" ? "Please review your Avantia Build invoice. Reply with any questions." : nextType === "receipt" ? "Your payment was received. Please keep this Avantia Build receipt for your records." : "Please review your Avantia Build estimate. Reply with any questions or approval.")
    setPreparedDocumentText(null)
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

  function openManualPricing(comparisonId?: string) {
    setFeedback("")
    startTransition(async () => {
      try {
        const result = await openRequestPricingComparisonAction(requestId, comparisonId)
        if (!result.ok) { setFeedbackError(true); setFeedback(result.error); return }
        router.push(`/admin/quote-comparison/${result.data.comparisonId}`)
      } catch {
        setFeedbackError(true)
        setFeedback("The comparison could not be opened. Check the connection and try again.")
      }
    })
  }

  function updateSupplierContactStatus(supplierId: string, status: RequestSupplierContactStatus) {
    const base = supplierContactStatuses[supplierId] || "not_contacted"
    const previousOverride = supplierContactStatusOverrides[supplierId]
    setSupplierContactStatusOverrides((current) => ({ ...current, [supplierId]: { base, value: status } }))
    setFeedback("")
    startTransition(async () => {
      try {
        const result = await updateRequestSupplierContactStatusAction({ requestId, supplierId, status })
        if (!result.ok) {
          setSupplierContactStatusOverrides((current) => {
            if (previousOverride) return { ...current, [supplierId]: previousOverride }
            const next = { ...current }
            delete next[supplierId]
            return next
          })
          setFeedbackError(true)
          setFeedback(result.error)
          return
        }
        setFeedbackError(false)
        setFeedback("Supplier status saved.")
        router.refresh()
      } catch {
        setSupplierContactStatusOverrides((current) => {
          if (previousOverride) return { ...current, [supplierId]: previousOverride }
          const next = { ...current }
          delete next[supplierId]
          return next
        })
        setFeedbackError(true)
        setFeedback("The supplier status was not saved. Check the connection and try again.")
      }
    })
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
      if (!await saveSupplierPlan()) return
      const query = new URLSearchParams({ department: routeDepartment })
      supplierIds.forEach((supplierId) => query.append("supplier", supplierId))
      router.push(`/owner/materials/requests/${requestId}/supplier-request?${query.toString()}`)
    })
  }

  function saveDeliverySchedule() {
    startTransition(async () => {
      setFeedback("")
      const result = await scheduleRequestDeliveryAction({ requestId, date: deliveryDate, startTime: deliveryWindowStart, durationHours: deliveryWindowHoursNumber, address: deliveryAddress, itemIds: deliveryItemIds })
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

  const includedQuoteLines = quoteLines.filter((line) => line.included)
  const quoteSubtotal = includedQuoteLines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0)
  const quoteTax = (quoteSubtotal + (taxableDelivery ? deliveryCharge : 0)) * salesTaxRate / 100
  const quoteTotal = quoteSubtotal + deliveryCharge + quoteTax
  const documentLabel = documentType === "invoice" ? "Invoice" : documentType === "receipt" ? "Receipt" : "Estimate"
  const paymentOptionsInvalid = requestPayment && !paymentMethods.length

  function togglePaymentMethod(method: RequestPaymentMethod, checked: boolean) {
    setPaymentMethods((current) => checked
      ? [...new Set([...current, method])]
      : current.filter((entry) => entry !== method))
    if (checked && method === "credit_card" && !hostedPaymentUrl) setHostedPaymentUrl(AVANTIA_PAYMENT_LINK)
  }

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
      lines: includedQuoteLines.map(({ description, quantity, unit, unitPrice }) => ({ description, quantity, unit, unitPrice })),
      deliveryCharge,
      salesTaxRate,
      taxableDelivery,
      terms: includeRequiredProposalTerms(quoteTerms),
      paymentRequest: requestPayment ? {
        methods: paymentMethods,
        amountDue: Number(paymentAmountDue),
        methodInstructions: paymentInstructions,
        ...(paymentMethods.includes("credit_card") && hostedPaymentUrl.trim() ? { securePaymentUrl: hostedPaymentUrl.trim() } : {}),
      } : undefined,
      attachmentIds: documentAttachments.map((entry) => entry.id),
    }
  }

  async function runDocumentActionWithApprovalWarning(
    action: (input: RequestClientQuoteInput) => Promise<QuoteResult>,
  ) {
    const input = quoteInput()
    let result = await action(input)
    if (!result.ok && result.requiresAcceptedChangeConfirmation) {
      const approvedChange = window.confirm(
        `This ${documentLabel.toLowerCase()} was already approved by the client. Saving these changes creates a new version and the client must approve it again. Continue?`,
      )
      if (!approvedChange) {
        setQuoteFeedback("No changes were saved. The existing client approval remains valid.")
        return null
      }
      result = await action({ ...input, confirmAcceptedChange: true })
    }
    return result
  }

  async function addDocumentAttachments(files: File[]) {
    if (!files.length || attachmentUploadPending) return
    const alreadySelected = new Set(documentAttachments.map((entry) => entry.id))
    if (files.length + alreadySelected.size > 10) return setQuoteFeedback("Attach up to 10 files to one document.")
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])
    const invalid = files.find((file) => !allowed.has(file.type) || file.size <= 0 || file.size > 25 * 1024 * 1024)
    if (invalid) return setQuoteFeedback(`${invalid.name} is not supported. Use PDF, JPG, PNG, WebP, DOCX, or XLSX under 25 MB.`)
    const selectedTotal = documentAttachments.reduce((sum, entry) => sum + entry.fileSize, 0) + files.reduce((sum, file) => sum + file.size, 0)
    if (selectedTotal > 25 * 1024 * 1024) return setQuoteFeedback("Keep all attachments for this document at 25 MB or less.")
    setAttachmentUploadPending(true)
    setQuoteFeedback("")
    const uploads: ExistingRequestUploadInput[] = []
    const browserSupabase = createClient()
    let registered = false
    try {
      for (const file of files) {
        const prepared = await prepareRequestAttachmentUploadAction({ requestId, filename: file.name, type: file.type, size: file.size })
        if (!prepared.ok) throw new Error(prepared.error)
        const { storagePath, token } = prepared.data
        const { error } = await browserSupabase.storage.from("project-uploads").uploadToSignedUrl(storagePath, token, file, { contentType: file.type, upsert: false })
        if (error) throw new Error(`Could not upload ${file.name}. Please try again.`)
        uploads.push({ storagePath, filename: file.name, type: file.type, size: file.size })
      }
      const result = await addRequestAttachmentsAction({ requestId, attachments: uploads, organize: false })
      if (!result.ok) throw new Error(result.error)
      registered = true
      setDocumentAttachments((current) => [...current, ...result.attachments.filter((entry) => !alreadySelected.has(entry.id))])
      setQuoteFeedback(`${result.attachments.length} file${result.attachments.length === 1 ? "" : "s"} added. Save the document to include them on the client link.`)
    } catch (cause) {
      if (!registered && uploads.length) await browserSupabase.storage.from("project-uploads").remove(uploads.map((entry) => entry.storagePath))
      setQuoteFeedback(cause instanceof Error ? cause.message : "The files could not be attached. Please try again.")
    } finally {
      setAttachmentUploadPending(false)
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

  function prepareDocumentText() {
    setQuoteFeedback("")
    startTransition(async () => {
      const saved = await runDocumentActionWithApprovalWarning(saveRequestClientDocumentAction)
      if (!saved) return
      if (!saved.ok || !saved.shareUrl) return setQuoteFeedback(saved.ok ? "The live link could not be prepared." : saved.error)
      const message = buildClientLinkMessage({
        messageText: quoteMessage,
        url: saved.shareUrl,
        fallbackMessage: `Hello ${firstName}, your Avantia Build ${documentLabel.toLowerCase()} is ready.`,
      })
      setDocumentLinks((current) => ({ ...current, [documentType]: saved.shareUrl }))
      setPreparedDocumentText({ message, url: saved.shareUrl, inputSignature: JSON.stringify(quoteInput()), documentType, documentNumber: quoteNumber })
      setQuoteFeedback("Review the exact text below. Nothing has been sent yet.")
    })
  }

  function sendPreparedDocumentText() {
    if (!preparedDocumentText) return
    if (preparedDocumentText.inputSignature !== JSON.stringify(quoteInput())) {
      setPreparedDocumentText(null)
      setQuoteFeedback("The document changed after the preview. Prepare a new text preview before sending.")
      return
    }
    setQuoteFeedback("")
    startTransition(async () => {
      const sent = await sendAuraMessageAction({ channel: "sms", recipient: client.phone, recipientLabel: client.name, message: preparedDocumentText.message, materialRequestId: requestId, materialRequestTitle: requestTitle })
      if (!sent.ok) return setQuoteFeedback(sent.error)
      const recorded = await recordRequestClientDocumentSentAction({ requestId, documentType: preparedDocumentText.documentType, documentNumber: preparedDocumentText.documentNumber, channel: "sms" })
      if (!recorded.ok) return setQuoteFeedback(recorded.error)
      markDocumentSent(preparedDocumentText.documentType)
      setQuoteFeedback(`${documentLabel} link sent by text. Future edits will update the same link.`)
      setPreparedDocumentText(null)
    })
  }

  function saveDocument() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await runDocumentActionWithApprovalWarning(saveRequestClientDocumentAction)
      if (!result) return
      if (!result.ok || !result.shareUrl) return setQuoteFeedback(result.ok ? "The live link could not be saved." : result.error)
      setDocumentLinks((current) => ({ ...current, [documentType]: result.shareUrl }))
      setQuoteFeedback(result.documentChanged
        ? `${documentLabel} saved. The client link now shows this version.`
        : `${documentLabel} is already up to date. The existing version and approval were kept.`)
      router.refresh()
    })
  }

  function deleteClientDocument(saved: RequestClientDocumentSnapshot) {
    const label = saved.documentType === "invoice" ? "Invoice" : saved.documentType === "receipt" ? "Receipt" : "Estimate"
    if (!window.confirm(`Delete ${label} ${saved.documentNumber} version ${saved.version}? Its live client link will stop working. This cannot be undone.`)) return
    const deletionKey = `${saved.documentType}:${saved.version}`
    setDeletingDocument(deletionKey)
    setFeedback("")
    setFeedbackError(false)
    startTransition(async () => {
      try {
        const result = await deleteRequestClientDocumentAction({ requestId, documentType: saved.documentType, publicToken: saved.publicToken, version: saved.version })
        setFeedbackError(!result.ok)
        setFeedback(result.ok ? result.warning || `${label} ${saved.documentNumber} deleted.` : result.error)
        if (result.ok) {
          setDeletedDocumentTokens((current) => [...current, saved.publicToken])
          setDocumentLinks((current) => ({ ...current, [saved.documentType]: undefined }))
          router.refresh()
        }
      } catch {
        setFeedbackError(true)
        setFeedback("The document could not be deleted. Check the connection and try again.")
      } finally {
        setDeletingDocument("")
      }
    })
  }

  function sendQuote() {
    setQuoteFeedback("")
    startTransition(async () => {
      const result = await runDocumentActionWithApprovalWarning(sendRequestClientQuoteAction)
      if (!result) return
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
  const fulfillmentDetail = paymentDeliveryStatus === "upcoming"
    ? "Finish supplier pricing first"
    : workflow.step3Complete
      ? "Payment complete · Delivery scheduled"
      : `Next: ${WORKFLOW_ACTION_LABELS[workflow.step3Action]}`
  const clientDocuments = initialClientDocuments.filter((document) => !deletedDocumentTokens.includes(document.publicToken))
  const latestClientDocument = clientDocuments[0] ?? null
  const supplierProgressRows = selectedSupplierNames.map((name) => {
    const supplier = findCanonicalSupplier(availableSuppliers, { supplierId: null, name }) ?? null
    const bid = comparisons.flatMap((comparison) => comparison.bids).find((candidate) => supplierNameCollator.compare(candidate.supplierName, name) === 0) ?? null
    const supplierPackage = supplier ? packages.find((entry) => entry.supplier_id === supplier.id) ?? null : null
    const note = routeSelections.find((selection) => supplierNameCollator.compare(selection.name, name) === 0)?.note || ""
    const comparisonCount = supplier ? requestSupplierFolderContents(comparisons, supplier.id).length : 0
    const routedItems = pricingSummaryItems.filter((item) => item.route.split(",").some((routeName) => supplierNameCollator.compare(routeName.trim(), name) === 0))
    const sentItemIds = supplier ? [...new Set(supplierRequestItemLinks.filter((entry) => entry.supplierId === supplier.id).flatMap((entry) => entry.itemIds))] : []
    return { name, supplier, bid, supplierPackage, note, comparisonCount, routedItems, sentItemIds }
  })
  const comparisonFolder = comparisonFolderSupplier ? requestSupplierFolderContents(comparisons, comparisonFolderSupplier.supplierId) : []

  const primaryWorkflowClass = "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0066cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
  const secondaryWorkflowClass = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 transition hover:border-sky-400 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
  const compactWorkflowClass = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-[#0066cc] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] disabled:opacity-45 sm:min-h-9"
  const stepToolClass = "inline-flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0066cc] disabled:opacity-40"

  function continueToClientDelivery() {
    const section = document.getElementById("request-client-delivery")
    if (!(section instanceof HTMLDetailsElement)) return
    section.open = true
    section.focus({ preventScroll: true })
    section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" })
  }

  function renderStep2PrimaryAction() {
    if (workflow.step2Complete) {
      return <button type="button" onClick={continueToClientDelivery} className={compactWorkflowClass}><FileCheck2 className="h-4 w-4" />Continue to Step 3</button>
    }
    if (workflow.step2Action === "choose-suppliers") {
      return <button type="button" onClick={() => document.getElementById("request-items-heading")?.scrollIntoView({ behavior: "smooth", block: "start" })} className={primaryWorkflowClass}><Route className="h-4 w-4" />Choose suppliers for this request</button>
    }
    if (workflow.step2Action === "contact-suppliers") {
      return <button type="button" onClick={createSupplierRequest} disabled={!supplierIds.length || pending} className={compactWorkflowClass}><Route className="h-4 w-4" />Contact {selectedSupplierNames.length} supplier{selectedSupplierNames.length === 1 ? "" : "s"}</button>
    }
    if (workflow.step2Action === "add-supplier-quote") {
      return <button type="button" onClick={() => setQuoteEntryOpen((open) => !open)} aria-expanded={quoteEntryOpen} className={compactWorkflowClass}><Paperclip className="h-4 w-4" />Add Supplier Quote</button>
    }
    if (workflow.step2Action === "review-quote" || workflow.step2Action === "compare-quotes") {
      return <button type="button" onClick={() => openManualPricing(primaryComparison?.id)} disabled={pending || !primaryComparison} className={primaryWorkflowClass}><Award className="h-4 w-4" />Compare quotes for this request</button>
    }
    return <button type="button" onClick={() => openDocument("estimate")} className={compactWorkflowClass}><FileCheck2 className="h-4 w-4" />Continue to Client Estimate</button>
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
      : <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Payment complete · Delivery scheduled</span>
  }

  function renderSupplierRouteActions(row: (typeof supplierProgressRows)[number]) {
    return <>
      {row.supplier?.phone ? <a href={`tel:${row.supplier.phone}`} aria-label={`Call ${row.name}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700"><Phone className="h-4 w-4" /></a> : null}
      {row.supplier?.email ? <a href={`mailto:${row.supplier.email}`} aria-label={`Email ${row.name}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700"><Mail className="h-4 w-4" /></a> : null}
      {row.supplier && row.comparisonCount ? <button type="button" onClick={() => setComparisonFolderSupplier({ supplierId: row.supplier!.id, name: row.name })} aria-label={`Open ${row.name} files`} className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-700"><FolderOpen className="h-4 w-4" /><span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#0071e3] px-1 text-[9px] font-black text-white">{row.comparisonCount}</span></button> : null}
    </>
  }

  return (
    <div className="grid gap-2 pb-[calc(env(safe-area-inset-bottom)+9rem)] sm:pb-0">
      <details id="request-supplier-quotes" tabIndex={-1} open={itemsReadyForPricing && pricingStatus === "active"} className={`${workflowStepCardClass()} scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500`}>
        <RequestWorkflowStepHeader requestId={requestId} step={2} title="Supplier quotes" detail={pricingDetail} status={itemsReadyForPricing ? pricingStatus : "upcoming"} allowManualCompletion={itemsReadyForPricing} icon="pricing" badges={<>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">{pricingSummaryItems.length} items</span>
          <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">{selectedSupplierNames.length} suppliers</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${supplierQuoteCount ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{supplierQuoteCount} quotes</span>
        </>} tools={<>
          <RequestSubstepFunnel requestId={requestId} step={2} currentSubstep={currentSubstep} />
          <details className="rounded-lg border border-slate-200">
            <summary className={`${stepToolClass} cursor-pointer list-none`}><Plus className="h-4 w-4" />Add supplier quote<ChevronDown className="ml-auto h-4 w-4" /></summary>
            <div className="grid gap-1 border-t border-slate-200 bg-slate-50 p-1">
              <a href={`/admin/supplier-quotes?request=${requestId}#supplier-quote-upload`} className={stepToolClass}><Paperclip className="h-4 w-4 shrink-0" /><span>Upload file or photo<span className="block text-[10px] font-normal">Detect supplier and prices from a document</span></span></a>
              <button type="button" onClick={() => openManualPricing()} disabled={pending} className={stepToolClass}><Pencil className="h-4 w-4 shrink-0" /><span>Enter prices manually<span className="block text-[10px] font-normal">Choose the supplier and type the prices</span></span></button>
            </div>
          </details>
          <button type="button" onClick={() => openManualPricing(primaryComparison?.id)} disabled={pending || (!primaryComparison && !selectedSupplierNames.length)} className={stepToolClass}><Award className="h-4 w-4" />Compare supplier quotes</button>
          {!estimateSent ? <button type="button" onClick={() => openDocument("estimate")} className={stepToolClass}><FileCheck2 className="h-4 w-4" />Create direct estimate</button> : null}
        </>} />
        <div className="border-t border-slate-200 p-3" data-testid="request-step-2">
          <div className="mb-3">{renderStep2PrimaryAction()}</div>
          {supplierRequestFiles.length ? <details className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs font-black text-[#12263f] [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5 text-amber-700" />Supplier files <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px]">{supplierRequestFiles.length}</span></span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </summary>
            <div className="grid gap-1.5 border-t border-amber-200 p-2">
              {supplierRequestFiles.map((file) => <div key={file.id} className="flex min-w-0 items-center justify-between gap-1.5 rounded-md border border-amber-200 bg-white p-1">
                {file.url ? <a href={file.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate px-1 text-[10px] font-bold text-[#0066cc]">{file.fileName}</a> : <span className="min-w-0 flex-1 truncate px-1 text-[10px] font-bold text-slate-500">{file.fileName}</span>}
                <RequestAttachmentSourceControl requestId={requestId} attachmentId={file.id} currentSource="supplier" />
              </div>)}
              <p className="px-1 text-[9px] text-slate-500">Received from a supplier. Link it to the correct supplier when adding the quote.</p>
            </div>
          </details> : null}
          {supplierProgressRows.length ? <div role="table" aria-label="Suppliers selected in Step 1" className="mb-3 mt-3 overflow-visible rounded-lg border border-slate-200 bg-white"><div className="flex flex-wrap gap-1.5 rounded-t-lg border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold"><span>{selectedSupplierNames.length} suppliers</span><span className="text-slate-300">·</span><span className="text-emerald-700">{supplierQuoteCount} quotes received</span><span className="text-slate-300">·</span><span className="text-rose-700">{supplierProgressRows.filter((row) => row.bid?.unavailableItemCount).length} suppliers with unavailable lines</span></div><div role="row" className="hidden grid-cols-[minmax(0,1fr)_13rem] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-bold uppercase tracking-[.08em] text-slate-500 sm:grid"><span role="columnheader">Supplier · note · contact</span><span role="columnheader">Status</span></div><div className="divide-y divide-slate-100">{supplierProgressRows.map((row) => {
            const persistedContactStatus = row.supplier ? supplierContactStatuses[row.supplier.id] : undefined
            const statusOverride = row.supplier ? supplierContactStatusOverrides[row.supplier.id] : undefined
            const contactStatus = row.supplier
              ? row.bid
                ? "quote_received"
                : statusOverride && statusOverride.base === (persistedContactStatus || "not_contacted")
                ? statusOverride.value
                : persistedContactStatus || (row.supplierPackage ? "request_sent" : "not_contacted")
              : "not_contacted"
            const displayContactStatus = ["request_sent", "awaiting_supplier_reply"].includes(contactStatus) && row.note?.includes("No response after two follow-ups")
              ? "no_response"
              : contactStatus
            return <article role="row" key={row.name} className="grid min-h-16 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
              <div role="cell" className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 w-full"><div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center"><details className="group/supplier relative min-w-0 shrink"><summary className="inline-flex max-w-full cursor-pointer list-none items-center gap-1 text-sm font-black text-[#12263f] [&::-webkit-details-marker]:hidden"><span className="whitespace-normal break-words text-left">{row.name}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open/supplier:rotate-180" /></summary><div className="absolute left-0 top-[calc(100%+.25rem)] z-30 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">{renderSupplierRouteActions(row)}{!row.supplier?.phone && !row.supplier?.email && !row.comparisonCount ? <span className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold text-slate-500">No contact saved</span> : null}</div></details>{row.supplier ? <details className="w-full min-w-0 sm:max-w-64"><summary className="min-h-10 cursor-pointer py-2 text-xs font-semibold text-[#0066cc]">{row.note ? "View / edit note" : "Add note"}</summary><SupplierNoteAutosave requestId={requestId} supplierId={row.supplier.id} supplierName={row.name} initialNote={row.note} /></details> : null}</div><p className="mt-0.5 text-[10px] font-bold text-slate-500">{row.routedItems.length} items assigned{row.sentItemIds.length ? ` · ${row.sentItemIds.length} sent` : ""}{row.bid ? ` · Quote: ${row.bid.pricedItemCount} priced / ${row.bid.itemCount} lines${row.bid.unavailableItemCount ? ` · ${row.bid.unavailableItemCount} unavailable lines` : ""}` : ""}</p>{row.bid ? <p className="mt-1 whitespace-normal text-[10px] font-bold text-emerald-700">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.bid.landedTotal)} reported total · {row.bid.pricedItemCount} priced lines. Check tax and delivery in comparison.</p> : null}<details className="mt-1"><summary className="cursor-pointer text-[10px] font-bold text-[#0066cc]">View item status</summary><div className="mt-1 grid gap-1">{(row.bid?.items.length ? row.bid.items : row.routedItems.map((item) => ({ id: item.id, sourceRequestItemId: item.id, name: item.organized || item.original, status: "waiting" as const }))).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-[10px]"><span className="min-w-0 break-words font-semibold">{item.name}</span><span className={`shrink-0 font-bold ${item.status === "quoted" ? "text-emerald-700" : item.status === "unavailable" ? "text-rose-700" : "text-amber-700"}`}>{item.status === "quoted" ? "Price received" : item.status === "unavailable" ? "They don’t have it" : row.sentItemIds.includes(item.sourceRequestItemId || item.id) || row.supplierPackage ? "Sent · waiting" : "Routed"}</span></div>)}</div></details></div>
              </div>
              <div role="cell">{row.bid ? <p className={`rounded-lg border px-3 py-2 text-xs font-bold ${row.bid.pricedItemCount === row.bid.itemCount && row.bid.itemCount > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{row.bid.pricedItemCount === row.bid.itemCount && row.bid.itemCount > 0 ? "All quote lines priced" : row.bid.pricedItemCount > 0 ? "Partial quote received" : "No priced lines received"}</p> : <><label className="sr-only" htmlFor={`supplier-status-${row.supplier?.id || row.name}`}>Status for {row.name}</label><select id={`supplier-status-${row.supplier?.id || row.name}`} value={displayContactStatus} disabled={!row.supplier || pending || Boolean(row.bid)} onChange={(event) => row.supplier && updateSupplierContactStatus(row.supplier.id, event.target.value as RequestSupplierContactStatus)} className={`min-h-10 w-full rounded-lg border px-2.5 text-xs font-bold ${supplierContactStatusClass(displayContactStatus)}`}>{displayContactStatus === "no_response" ? <option value="no_response" disabled>No response</option> : null}{SUPPLIER_CONTACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></>}</div>
            </article>
          })}</div></div> : <p className="mb-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-500">Choose suppliers in Step 1 to begin pricing.</p>}


          {!workflow.step2Complete && quoteEntryOpen ? <div className="mt-2 grid gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2 sm:grid-cols-2">
            <a href={`/admin/supplier-quotes?request=${requestId}#supplier-quote-upload`} className={secondaryWorkflowClass}><Paperclip className="h-4 w-4" />Upload File or Photo</a>
            <button type="button" onClick={() => { setQuoteEntryOpen(false); openManualPricing() }} disabled={pending} className={secondaryWorkflowClass}><Plus className="h-4 w-4" />Enter Pricing Manually</button>
          </div> : null}
        </div>
      </details>

      <details id="request-client-delivery" tabIndex={-1} open={paymentDeliveryStatus === "active"} className={`${workflowStepCardClass()} scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500`}>
        <RequestWorkflowStepHeader requestId={requestId} step={3} title="Client, payment & delivery" detail={fulfillmentDetail} status={paymentDeliveryStatus} icon="payment" allowManualCompletion={false} tools={<>
          <RequestSubstepFunnel requestId={requestId} step={3} currentSubstep={currentSubstep} />
          <button type="button" onClick={() => setContactOpen(true)} className={stepToolClass}><MessageSquareText className="h-4 w-4" />Contact client</button>
          <button type="button" onClick={() => openDocument("estimate")} className={stepToolClass}><FileCheck2 className="h-4 w-4" />Estimate</button>
          <button type="button" onClick={() => openDocument("invoice")} className={stepToolClass}><FileText className="h-4 w-4" />Invoice</button>
          <button type="button" onClick={() => openDocument("receipt")} className={stepToolClass}><ReceiptText className="h-4 w-4" />Receipt</button>
          <button type="button" onClick={openPaymentLink} disabled={!client.phone && !client.email} className={stepToolClass}><Send className="h-4 w-4" />Payment link</button>
          <button type="button" onClick={openDeliverySchedule} className={stepToolClass}><CalendarClock className="h-4 w-4" />Delivery schedule</button>
        </>} />
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

          {clientDocuments.length ? <div className="mt-2 grid gap-2" aria-label="Saved client documents">{clientDocuments.map((saved) => {
            const label = saved.documentType === "invoice" ? "Invoice" : saved.documentType === "receipt" ? "Receipt" : "Estimate"
            const deletionKey = `${saved.documentType}:${saved.version}`
            const viewDetail = saved.documentType === "receipt"
              ? null
              : saved.lastOpenedAt
                ? `Opened · ${new Date(saved.lastOpenedAt).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" })}`
                : "Not opened"
            return <article key={saved.publicToken} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-3"><FileCheck2 className="h-4 w-4 shrink-0 text-[#0066cc]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[#12263f]">{label} {saved.documentNumber}</p><p className="text-[10px] font-medium text-slate-600">Version {saved.version} · {new Date(saved.updatedAt).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET</p>{viewDetail ? <p className={`mt-0.5 text-[10px] font-bold ${saved.lastOpenedAt ? "text-emerald-700" : "text-amber-700"}`}>{viewDetail}</p> : null}</div></div>
              <div className="mt-2 flex justify-end">
                <details className="group/document-actions relative">
                  <summary className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-[#0066cc] hover:border-sky-300 [&::-webkit-details-marker]:hidden">Actions<ChevronDown className="h-3.5 w-3.5 transition group-open/document-actions:rotate-180" /></summary>
                  <div className="absolute right-0 top-[calc(100%+.35rem)] z-30 grid w-44 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                    <a href={`${PRODUCTION_SITE_ORIGIN}/client-document/${saved.publicToken}?preview=${saved.managerPreviewToken}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-bold text-[#0066cc] hover:bg-sky-50"><FileText className="h-3.5 w-3.5" />Open</a>
                    <button type="button" onClick={() => openDocument(saved.documentType, saved)} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />Edit</button>
                    <button type="button" onClick={() => deleteClientDocument(saved)} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deletingDocument === deletionKey ? "Deleting…" : "Delete"}</button>
                  </div>
                </details>
              </div>
            </article>
          })}</div> : null}

          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 mt-3 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,23,42,.14)] backdrop-blur">{renderStep3PrimaryAction()}</div>

          {feedback ? <p className={`mt-2 rounded-lg border px-3 py-2 text-xs font-semibold ${feedbackError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role="status" aria-live="polite">{feedback}</p> : null}
        </div>
      </details>

      {comparisonFolderSupplier && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="client-price-comparisons-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setComparisonFolderSupplier(null) }}>
          <section className="flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">Exact supplier · current request</p><h2 id="client-price-comparisons-title" className="truncate text-lg font-black text-[#12263f]">{comparisonFolderSupplier.name} files</h2><p className="truncate text-xs text-slate-500">{client.name} · {requestTitle}</p></div>
              <button type="button" onClick={() => setComparisonFolderSupplier(null)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200" aria-label="Close price comparisons"><X className="h-4 w-4" /></button>
            </header>
            <div className="grid gap-2 overflow-y-auto p-3">
              {comparisonFolder.length ? comparisonFolder.map((comparison) => {
                return <article key={comparison.id} className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-[#12263f]">{comparison.title}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{comparison.quoteNumber || "No quote number"} · {comparison.bids.length} supplier quote{comparison.bids.length === 1 ? "" : "s"}</p></div><a href={`/admin/quote-comparison/${comparison.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#0071e3] px-3 text-xs font-black text-white">Open comparison</a></div>
                  {comparison.bids.length ? <div className="mt-2 grid gap-1">{comparison.bids.map((bid) => <div key={bid.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-2 text-xs"><span className="truncate font-bold text-slate-700">{bid.supplierName}</span><span className="shrink-0 font-black text-emerald-700">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(bid.landedTotal)}</span></div>)}</div> : null}
                  {comparison.documents.length ? <div className="mt-2 flex flex-wrap gap-1.5">{comparison.documents.map((file) => file.sourceUrl ? <a key={file.id} href={file.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-[#0066cc] sm:min-h-9"><FileText className="h-3.5 w-3.5" />{file.fileName}</a> : <span key={file.id} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-bold text-slate-500 sm:min-h-9"><FileText className="h-3.5 w-3.5" />{file.fileName}</span>)}</div> : null}
                </article>
              }) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"><FolderOpen className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-2 text-sm font-black text-slate-700">No price comparisons yet</p><p className="mt-1 text-xs text-slate-500">Upload a supplier quote or enter pricing manually for this request.</p></div>}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}

      {contactOpen && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[145] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="request-client-contact-title" onMouseDown={(event) => { if (event.currentTarget === event.target) closeContact() }}>
          <section ref={contactDialogRef} id="request-client-contact-dialog" className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#0066cc]">Available at every stage</p><h2 id="request-client-contact-title" className="truncate text-lg font-bold">Contact client</h2><p className="text-xs text-slate-500">{replyComplete ? "Client contacted · send another update when needed" : "Message, estimate, or delivery"}</p></div>
              <button type="button" onClick={closeContact} disabled={pending} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white disabled:opacity-40" aria-label="Close contact client"><X className="h-4 w-4" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
          <RelatedEmailTimeline title="Client messages" emails={clientEmails} party="client" />
          <div>
            {missingQuestions.length ? <p className="mt-1 text-xs font-semibold text-amber-700">{missingQuestions.length} missing details can be added to the reply automatically.</p> : null}

            <details open={deliveryOpen} onToggle={(event) => setDeliveryOpen(event.currentTarget.open)} className="mt-3 rounded-lg border border-slate-200 bg-slate-50">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-bold"><span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-emerald-700" />Schedule delivery</span><ChevronDown className="h-4 w-4 text-slate-400" /></summary>
              <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1 text-xs font-bold text-slate-600">Date<input type="date" min={siteBusinessDateKey() ?? undefined} value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-600">Window starts (Eastern)<input type="time" value={deliveryWindowStart} onChange={(event) => setDeliveryWindowStart(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-600">Window length (hours)<input type="number" min="0.5" max="12" step="0.5" value={deliveryWindowHours} onChange={(event) => setDeliveryWindowHours(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950" /></label>
                <label className="grid gap-1 text-xs font-bold text-slate-600 sm:col-span-2 lg:col-span-3">Delivery address<input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Jobsite delivery address" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950" /></label>
                <fieldset className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between gap-2"><legend className="text-xs font-black text-slate-800">Materials in this delivery</legend><button type="button" onClick={() => setDeliveryItemIds(deliveryItemIds.length === requestItems.length ? [] : requestItems.map((item) => item.id))} className="text-[11px] font-bold text-[#0066cc]">{deliveryItemIds.length === requestItems.length ? "Clear" : "Select all"}</button></div>
                  <div className="grid gap-1 sm:grid-cols-2">{requestItems.map((item) => <label key={item.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-2 text-xs font-semibold"><input type="checkbox" checked={deliveryItemIds.includes(item.id)} onChange={(event) => setDeliveryItemIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} className="h-4 w-4 accent-[#0071e3]" /><span className="min-w-0 flex-1 truncate">{item.quantity} {item.unit || "each"} · {item.name}</span></label>)}</div>
                  <p className="text-[10px] font-semibold text-slate-500">{deliveryItemIds.length} of {requestItems.length} material lines selected. You can schedule the remaining lines separately.</p>
                </fieldset>
                {deliveryWindowStart && !deliveryWindowEnd ? <p className="text-xs font-bold text-rose-700 sm:col-span-2 lg:col-span-3">Choose a shorter window that ends before midnight.</p> : null}
                <button type="button" onClick={saveDeliverySchedule} disabled={pending || !deliveryWindowReady} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2 lg:col-span-3"><CalendarClock className="h-4 w-4" />{pending ? "Saving..." : "Save window and prepare client message"}</button>
              </div>
            </details>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-slate-600">Greeting<select value={greeting} onChange={(event) => setGreeting(event.target.value as typeof greeting)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950"><option value="hi">Hi {firstName}</option><option value="hello">Hello</option><option value="morning">Good morning</option><option value="afternoon">Good afternoon</option></select></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Follow-up<select value={replyBlock} onChange={(event) => setReplyBlock(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950">{REPLY_BLOCKS.map((block) => <option key={block.id} value={block.id}>{block.label}</option>)}</select></label>
            </div>

            <label className="mt-3 grid gap-1 text-xs font-bold text-slate-600">Add a note <span className="font-normal text-slate-400">(optional)</span><textarea value={replyNote} onChange={(event) => setReplyNote(event.target.value)} rows={2} placeholder="Write a short note" className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-[#0066cc]">Preview message — full text</summary><div className="border-t border-slate-200 px-3 py-3 text-sm leading-6 text-slate-700" aria-label="Reply preview">{clientPaymentPreview ? <><p className="whitespace-pre-wrap break-words">{clientPaymentPreview.text}</p><a href={clientPaymentPreview.url} target="_blank" rel="noreferrer" className="mt-3 block break-all font-bold text-[#0066cc] underline underline-offset-4">{clientPaymentPreview.url}</a></> : <p className="whitespace-pre-wrap break-words">{clientMessage}</p>}</div></details>

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
        <section ref={quoteDialogRef} className="flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white text-slate-950 shadow-2xl [&_input]:text-slate-950 [&_input::placeholder]:text-slate-500 [&_input:disabled]:cursor-not-allowed [&_input:disabled]:bg-slate-100 [&_input:disabled]:text-slate-800 [&_input:disabled]:opacity-100 [&_input:read-only]:bg-slate-100 [&_input:read-only]:text-slate-800 [&_select]:text-slate-950 [&_textarea]:text-slate-950 [&_textarea::placeholder]:text-slate-500">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#0066cc]">Avantia Build document</p><h2 id="request-quote-title" className="mt-0.5 text-xl font-bold text-slate-950">Create client {documentLabel.toLowerCase()}</h2><p className="mt-0.5 text-xs font-medium text-slate-600">Review the PDF, then send it by email or text.</p></div><button type="button" onClick={closeQuote} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 disabled:opacity-100" aria-label="Close"><X className="h-4 w-4" /></button></header>
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
                    setTaxLocationPreset(taxPresetForRate(suggestion.taxRate))
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
              <table className="w-full min-w-[48rem] text-left text-xs"><thead className="bg-slate-950 text-white"><tr><th className="px-3 py-2">Use</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Quantity</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Unit price</th><th className="px-3 py-2 text-right">Total</th><th className="w-10" /></tr></thead><tbody>{quoteLines.map((line, index) => <tr key={line.key} className={`border-b border-slate-200 last:border-b-0 ${line.included ? "bg-white" : "bg-slate-100 opacity-60"}`}><td className="px-3 py-2"><input type="checkbox" checked={line.included} onChange={(event) => updateQuoteLine(line.key, { included: event.target.checked })} aria-label={`Include item ${index + 1} in ${documentLabel.toLowerCase()}`} className="h-4 w-4 accent-[#0071e3]" /></td><td className="px-3 py-2 font-bold">{index + 1}</td><td className="p-1.5"><input value={line.description} onChange={(event) => updateQuoteLine(line.key, { description: event.target.value })} className="h-9 w-full min-w-56 rounded-md border border-slate-300 bg-white px-2 text-slate-950" /></td><td className="p-1.5"><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateQuoteLine(line.key, { quantity: Number(event.target.value) })} className="h-9 w-24 rounded-md border border-slate-300 bg-white px-2 text-slate-950" /></td><td className="p-1.5"><input value={line.unit} onChange={(event) => updateQuoteLine(line.key, { unit: event.target.value })} className="h-9 w-24 rounded-md border border-slate-300 bg-white px-2 text-slate-950" /></td><td className="p-1.5"><input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateQuoteLine(line.key, { unitPrice: Number(event.target.value) })} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-slate-950" /></td><td className="px-3 py-2 text-right font-bold tabular-nums">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(line.quantity * line.unitPrice)}</td><td><button type="button" onClick={() => setQuoteLines((current) => current.filter((item) => item.key !== line.key))} className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:text-rose-700" aria-label={`Remove item ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-600">{includedQuoteLines.length} of {quoteLines.length} lines included in this {documentLabel.toLowerCase()}</p><div className="flex gap-2"><button type="button" onClick={() => setQuoteLines((current) => current.map((line) => ({ ...line, included: true })))} className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-xs font-bold">Select all</button><button type="button" onClick={() => setQuoteLines((current) => [...current, { key: crypto.randomUUID(), description: "", quantity: 1, unit: "each", unitPrice: 0, included: true }])} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-bold"><Plus className="h-3.5 w-3.5" />Add item</button></div></div>

            {documentType === "estimate" ? <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="Estimate attachments">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-sm font-bold text-slate-950">Photos &amp; documents for client</h3><p className="mt-0.5 text-xs text-slate-600">Selected files stay with this saved estimate version and appear together on its live link.</p></div>
                <label className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 text-xs font-bold text-[#0066cc] ${attachmentUploadPending ? "cursor-wait opacity-60" : "cursor-pointer"}`}><Paperclip className="h-4 w-4" />{attachmentUploadPending ? "Uploading…" : "Add photos or documents"}<input type="file" multiple accept="image/jpeg,image/png,image/webp,.pdf,.docx,.xlsx" disabled={attachmentUploadPending || pending} className="sr-only" onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void addDocumentAttachments(files) }} /></label>
              </div>
              {[...new Map([...requestAttachments, ...documentAttachments].map((entry) => [entry.id, entry])).values()].length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[...new Map([...requestAttachments, ...documentAttachments].map((entry) => [entry.id, entry])).values()].map((entry) => {
                  const selected = documentAttachments.some((candidate) => candidate.id === entry.id)
                  return <label key={entry.id} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${selected ? "border-sky-300 bg-white text-slate-950" : "border-slate-200 bg-slate-100 text-slate-700"}`}><input type="checkbox" checked={selected} onChange={(event) => setDocumentAttachments((current) => event.target.checked ? [...current.filter((candidate) => candidate.id !== entry.id), entry] : current.filter((candidate) => candidate.id !== entry.id))} className="mt-0.5 h-4 w-4 shrink-0 accent-[#0071e3]" /><FileText className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 break-all leading-5">{entry.fileName}</span><span className="shrink-0 text-[10px] leading-5 text-slate-500">{Math.max(1, Math.round(entry.fileSize / 1024))} KB</span></label>
                })}
              </div> : <p className="mt-3 text-xs text-slate-500">No request files yet. Add several photos or documents at once.</p>}
              <p className="mt-2 text-[11px] font-medium text-slate-500">PDF, JPG, PNG, WebP, DOCX, or XLSX · up to 10 files · 25 MB total</p>
            </section> : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-bold">Terms &amp; conditions <span className="font-normal text-slate-500">Short, complete, and shown in full to the client.</span><textarea value={quoteTerms} onChange={(event) => { setQuoteTerms(event.target.value); setPreparedDocumentText(null) }} rows={7} className="min-h-40 resize-y rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal leading-5" /></label>
                <label className="grid gap-1 text-xs font-bold">Message sent with the live link <span className="font-normal text-slate-500">The secure URL will appear by itself on the last line.</span><textarea value={quoteMessage} onChange={(event) => { setQuoteMessage(event.target.value); setPreparedDocumentText(null) }} rows={4} className="min-h-28 resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal leading-6" /></label>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold"><input type="checkbox" checked={requestPayment} onChange={(event) => { setRequestPayment(event.target.checked); if (event.target.checked && !paymentAmountDue) setPaymentAmountDue(quoteTotal.toFixed(2)) }} className="h-4 w-4 accent-[#0071e3]" />{documentType === "receipt" ? "Include payment details" : "Request payment from client"}</label>
                {requestPayment ? <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 sm:p-4">
                  <p className="text-xs font-bold leading-5 text-slate-700">These options tell the client how to pay Avantia Build. Never enter a full card number, CVV/security code, routing number, or bank account number here.</p>
                  <label className="mt-3 grid gap-1 text-xs font-bold">Amount {documentType === "receipt" ? "paid" : "due to Avantia Build"}<input type="number" min="0.01" max="10000000" step="0.01" inputMode="decimal" value={paymentAmountDue} onChange={(event) => setPaymentAmountDue(event.target.value)} className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" /></label>
                  <fieldset className="mt-3 grid gap-3">
                    <legend className="text-xs font-black text-slate-900">{documentType === "receipt" ? "Payment methods shown on the receipt" : "Payment options shown to the client"}</legend>
                    {([
                      { method: "credit_card" as const, label: "Credit card / approved payment app", placeholder: "For example: Call our office and we will process the card securely." },
                      { method: "ach" as const, label: "ACH", placeholder: "For example: Call our office to receive secure ACH instructions." },
                      { method: "check" as const, label: "Check", placeholder: "For example: Make checks payable to Avantia Build." },
                    ]).map((option) => {
                      const selected = paymentMethods.includes(option.method)
                      return <div key={option.method} className={`rounded-lg border p-3 ${selected ? "border-sky-300 bg-white" : "border-slate-200 bg-slate-50"}`}>
                        <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={selected} onChange={(event) => togglePaymentMethod(option.method, event.target.checked)} className="h-4 w-4 accent-[#0071e3]" />{option.label}</label>
                        {selected ? <div className="mt-2 grid gap-2">
                          <textarea value={paymentInstructions[option.method] || ""} onChange={(event) => setPaymentInstructions((current) => ({ ...current, [option.method]: event.target.value }))} maxLength={500} rows={2} placeholder={option.placeholder} aria-label={`${option.label} instructions shown to client`} className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
                          <p className="text-xs font-semibold leading-5 text-slate-600">{requestPaymentGuidanceForMethod(option.method, hostedPaymentUrl.trim() || undefined)}</p>
                        </div> : null}
                      </div>
                    })}
                  </fieldset>
                  {paymentMethods.includes("credit_card") ? <label className="mt-3 grid gap-1 text-xs font-bold">Hosted secure payment URL <span className="font-normal text-slate-500">(optional)</span><input type="url" inputMode="url" autoComplete="url" value={hostedPaymentUrl} onChange={(event) => setHostedPaymentUrl(event.target.value)} placeholder="Paste an existing HTTPS payment link" className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal" /><span className="font-normal leading-5 text-slate-500">Use only an existing hosted checkout URL. Card details are entered with the processor, never on this website.</span></label> : null}
                  {!paymentMethods.length ? <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900" role="alert">Choose at least one payment option before saving.</p> : null}
                </div> : null}
              </div>
              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteSubtotal)}</strong></div>
                <label className="mt-3 flex items-center justify-between gap-3 text-sm"><span>Delivery</span><input type="number" min="0" step="0.01" value={deliveryCharge} onChange={(event) => setDeliveryCharge(Number(event.target.value))} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label>
                <label className="mt-2 grid gap-1 text-xs font-bold text-slate-600">Tax location<select value={taxLocationPreset} onChange={(event) => { const value = event.target.value as (typeof TAX_LOCATION_PRESETS)[number]["value"]; setTaxLocationPreset(value); const preset = TAX_LOCATION_PRESETS.find((option) => option.value === value); if (preset?.rate !== null && preset?.rate !== undefined) { setSalesTaxRate(preset.rate); setTaxRecommendation(`${preset.rate.toFixed(3)}% · ${preset.label}`) } }} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-950">{TAX_LOCATION_PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label className="mt-2 flex items-center justify-between gap-3 text-sm"><span>Sales tax %</span><input type="number" min="0" max="20" step="0.001" value={salesTaxRate} onChange={(event) => { setSalesTaxRate(Number(event.target.value)); setTaxLocationPreset("custom"); setTaxRecommendation("Custom rate") }} className="h-9 w-28 rounded-md border border-slate-300 bg-white px-2 text-right" /></label>
                <label className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={taxableDelivery} onChange={(event) => setTaxableDelivery(event.target.checked)} className="mt-1" /><span>Tax delivery</span></label>
                {taxRecommendation ? <p className="mt-2 text-xs font-semibold text-emerald-700">{taxRecommendation}</p> : null}
                <div className="mt-3 flex justify-between border-t border-slate-300 pt-3 text-lg"><strong>Total</strong><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quoteTotal)}</strong></div>
              </aside>
            </div>
            {preparedDocumentText ? <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4" aria-label="Exact text message preview"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#0066cc]">Exact SMS preview · nothing sent yet</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{splitClientLinkMessage(preparedDocumentText.message).text}</p><a href={splitClientLinkMessage(preparedDocumentText.message).url} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm font-bold text-[#0066cc] underline underline-offset-4">{splitClientLinkMessage(preparedDocumentText.message).url}</a><button type="button" onClick={sendPreparedDocumentText} disabled={pending || !client.phone} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#17304f] px-4 text-sm font-bold text-white disabled:opacity-45"><MessageSquareText className="h-4 w-4" />{pending ? "Sending…" : "Send this exact text"}</button></section> : null}
            {quoteFeedback ? <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-6" role="status">{quoteFeedback}</p> : null}
          </div>
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">{documentLinks[documentType] ? <a href={documentLinks[documentType]} target="_blank" rel="noreferrer" className="mr-auto break-all text-xs font-bold text-[#0066cc] underline">Open live client link</a> : null}<button type="button" onClick={saveDocument} disabled={pending || !includedQuoteLines.length || paymentOptionsInvalid} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600 disabled:opacity-100"><FileCheck2 className="h-4 w-4" />Save changes</button><button type="button" onClick={downloadQuote} disabled={pending || paymentOptionsInvalid} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600 disabled:opacity-100"><Download className="h-4 w-4" />Download PDF</button><button type="button" onClick={prepareDocumentText} disabled={pending || !client.phone || !includedQuoteLines.length || paymentOptionsInvalid} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0071e3] bg-white px-4 text-sm font-bold text-[#0066cc] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600 disabled:opacity-100"><MessageSquareText className="h-4 w-4" />Text live link preview</button><button type="button" onClick={sendQuote} disabled={pending || !client.email || !includedQuoteLines.length || paymentOptionsInvalid} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0071e3] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700 disabled:opacity-100"><Send className="h-4 w-4" />{pending ? "Working..." : `Email live link`}</button></footer>
        </section>
      </div>, document.body) : null}
    </div>
  )
}
