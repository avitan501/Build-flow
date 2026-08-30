"use client"

import { ArrowLeft, Bot, CheckCheck, ChevronDown, CircleAlert, ClipboardList, Clock3, Mail, MapPin, MessageCircle, Paperclip, Phone, Plus, Search, Send, Smartphone, Sparkles, UserRound, X } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"

import { prepareQuoAttachmentMessageAction, sendAuraMessageAction } from "@/app/owner/aura/actions"
import { completeSmsReplyDraftAction, createSmsMaterialRequestAction, generateSmsReplyAction, linkCommunicationContactAction, linkEmailConversationAction, markEmailConversationReadAction, quickTagPhoneContactAction, reviewSmsRequestAction, saveSmsAutomationAction, type SmsReplyDraft, type SmsRequestProposal } from "@/app/admin/communications/actions"
import { TwoChatSoftphone } from "@/components/buildflow/two-chat-softphone"
import type { AuraCommunicationRow, AuraContactRow } from "@/lib/aura/dashboard"
import { normalizeAuraPhone, type AuraCustomerIdentity } from "@/lib/aura/identity"
import { looksLikeMaterialRequestMessage } from "@/lib/aura/material-request-detection"
import { SMS_CORRECTION_REASONS, type SmsCorrectionReason } from "@/lib/ai/sms-training-privacy"
import type { SupplierRoutingOption } from "@/lib/shop-qualification"

export type AuraLeadRecipient = {
  id: string
  full_name: string
  company_name: string | null
  phone: string | null
  email: string | null
}
type MaterialRequestRecipient = { id: string; title: string; status: string }

type Connections = {
  voice?: { receive: boolean; send: boolean; recording: boolean; phone: string | null }
  quo: { receive: boolean; send: boolean }
  whatsapp: { receive: boolean; send: boolean }
  email: { receive: boolean; send: boolean }
}

type Channel = "call" | "sms" | "whatsapp" | "email"
type ContactKind = "customer" | "lead" | "supplier" | "contact"
type ContactFilter = "all" | ContactKind

type DirectoryEntry = {
  key: string
  id: string
  name: string
  company: string
  phone: string
  whatsapp: string
  email: string
  kind: ContactKind
}

type Conversation = {
  key: string
  name: string
  company: string
  phone: string
  email: string
  kind: ContactKind
  messages: AuraCommunicationRow[]
  latest: AuraCommunicationRow
  channels: AuraCommunicationRow["channel"][]
}

const QUICK_REPLIES = ["Received, thank you.", "I need a few more details.", "I am checking current pricing.", "A manager will confirm the next step."]
const CORRECTION_REASON_LABELS: Record<SmsCorrectionReason, string> = {
  tone: "Tone",
  too_long: "Too long",
  repeated_question: "Repeated question",
  wrong_or_missing_fact: "Wrong / missing fact",
  wrong_item_or_quantity: "Wrong item / quantity",
  safety_or_commitment: "Safety / commitment",
}

function identityKey(phone?: string | null, email?: string | null) {
  return normalizeAuraPhone(phone) || email?.trim().toLowerCase() || ""
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date)
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?"
}

function contactKindLabel(kind: ContactKind) {
  if (kind === "supplier") return "Supplier / Vendor"
  return kind[0].toUpperCase() + kind.slice(1)
}

function contactKindTone(kind: ContactKind) {
  if (kind === "supplier") return "bg-amber-100 text-amber-800"
  if (kind === "lead") return "bg-violet-100 text-violet-700"
  if (kind === "customer") return "bg-emerald-100 text-emerald-700"
  return "bg-slate-100 text-slate-600"
}

function channelIcon(channel: AuraCommunicationRow["channel"], className = "h-3.5 w-3.5") {
  if (channel === "whatsapp") return <MessageCircle className={`${className} text-emerald-600`} />
  if (channel === "email") return <Mail className={`${className} text-violet-600`} />
  if (channel === "call") return <Phone className={`${className} text-amber-600`} />
  return <Smartphone className={`${className} text-sky-600`} />
}

function statusIcon(status: string | null) {
  if (["failed", "undelivered"].includes(status || "")) return <CircleAlert className="h-3 w-3 text-rose-600" />
  if (["delivered", "read"].includes(status || "")) return <CheckCheck className="h-3 w-3 text-emerald-600" />
  return <Clock3 className="h-3 w-3 text-slate-400" />
}

function safeText(value: unknown) {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return ""
    }
  }
  return ""
}

function messageText(message: AuraCommunicationRow) {
  for (const value of [message.body, message.transcript, message.summary, message.subject]) {
    const text = safeText(value)
    if (text) return text
  }
  return message.channel === "call" ? "Phone call" : "Message"
}

function messageCanStartMaterialRequest(message: AuraCommunicationRow) {
  return looksLikeMaterialRequestMessage(message.channel, message.direction, messageText(message))
}

function ExpandableMessage({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 520 || text.split("\n").length > 8
  return <div><p className={`whitespace-pre-wrap break-words text-sm leading-5 ${long && !expanded ? "max-h-32 overflow-hidden" : ""}`}>{text}</p>{long ? <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#0066cc]">{expanded ? "Show less" : "Show more"}<ChevronDown className={`h-3 w-3 transition ${expanded ? "rotate-180" : ""}`} /></button> : null}</div>
}

function initialCommunicationForQuery(communications: AuraCommunicationRow[], query: string, channelFilter: string) {
  const available = channelFilter === "all" ? communications : communications.filter((communication) => communication.channel === channelFilter)
  const needle = query.trim().toLowerCase()
  if (!needle) return available[0]
  return available.find((communication) => [
    communication.counterparty_phone || "",
    communication.counterparty_email || "",
    communication.subject || "",
    messageText(communication),
  ].some((value) => value.toLowerCase().includes(needle))) || available[0]
}

function replySubject(subject?: string | null) {
  const clean = String(subject || "").trim()
  if (!clean) return "Avantia Build"
  return /^re:/i.test(clean) ? clean : `Re: ${clean}`
}

function attachmentLabel(attachment: { url?: string | null; name?: string | null }, index: number) {
  if (attachment.name?.trim()) return attachment.name.trim()
  try {
    const pathname = new URL(attachment.url || "").pathname
    const filename = decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "")
    if (filename && filename.length <= 100) return filename
  } catch {
    // Provider URLs are optional; keep a useful generic label when one is malformed.
  }
  return `Attachment ${index + 1}`
}

function initialConversationKey(communication: AuraCommunicationRow | undefined, contacts: AuraContactRow[]) {
  if (!communication) return "__new__"
  const rawKey = identityKey(communication.counterparty_phone, communication.counterparty_email)
  const contact = contacts.find((item) => identityKey(item.normalized_phone, item.email) === rawKey)
  const linked = contact?.notes?.match(/^Avantia link:(customer|lead|supplier):([A-Za-z0-9_-]+)$/)
  return linked ? `${linked[1]}:${linked[2]}` : rawKey || `unknown:${communication.contact_id || communication.id}`
}

export function UnifiedCommunicationInbox({ communications, contacts, customers, leads = [], suppliers = [], materialRequests = [], smsReplyDrafts = [], connections, initialChannelFilter = "all", initialQuery = "" }: {
  communications: AuraCommunicationRow[]
  contacts: AuraContactRow[]
  customers: AuraCustomerIdentity[]
  leads?: AuraLeadRecipient[]
  suppliers?: SupplierRoutingOption[]
  materialRequests?: MaterialRequestRecipient[]
  smsReplyDrafts?: SmsReplyDraft[]
  connections: Connections
  initialChannelFilter?: string
  initialQuery?: string
}) {
  const router = useRouter()
  const initialCommunication = initialCommunicationForQuery(communications, initialQuery, initialChannelFilter)
  const initialStoredDraft = smsReplyDrafts.find((draft) => draft.communication_id === initialCommunication?.id)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all")
  const [channelFilter, setChannelFilter] = useState(initialChannelFilter)
  const [activeKey, setActiveKey] = useState(() => initialConversationKey(initialCommunication, contacts))
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [channel, setChannel] = useState<Channel>(() => {
    if (initialStoredDraft) return "sms"
    const initial = initialCommunication?.channel
    return initial === "email" || initial === "sms" || initial === "whatsapp" ? initial : "whatsapp"
  })
  const [recipientType, setRecipientType] = useState<Exclude<ContactKind, "contact">>("customer")
  const [selectedRecipientId, setSelectedRecipientId] = useState("")
  const [recipient, setRecipient] = useState(() => initialCommunication?.channel === "email" ? initialCommunication.counterparty_email || "" : initialCommunication?.counterparty_phone || "")
  const [subject, setSubject] = useState(() => initialCommunication?.channel === "email" ? replySubject(initialCommunication.subject) : "")
  const [message, setMessage] = useState(initialStoredDraft?.reply_text || "")
  const [attachment, setAttachment] = useState<File | null>(null)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [softphone, setSoftphone] = useState<{ phone: string; name: string } | null>(null)
  const [linkTarget, setLinkTarget] = useState("")
  const [emailLinkTarget, setEmailLinkTarget] = useState("")
  const [smsAiMode, setSmsAiMode] = useState<"off" | "draft" | "auto_safe">(() => contacts.find((item) => identityKey(item.normalized_phone, item.email) === identityKey(initialCommunication?.counterparty_phone, initialCommunication?.counterparty_email))?.sms_ai_mode || "auto_safe")
  const [smsAiStyle, setSmsAiStyle] = useState<"professional" | "friendly" | "brief">(() => contacts.find((item) => identityKey(item.normalized_phone, item.email) === identityKey(initialCommunication?.counterparty_phone, initialCommunication?.counterparty_email))?.sms_ai_style || "friendly")
  const [requestReview, setRequestReview] = useState<SmsRequestProposal | null>(null)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(initialStoredDraft?.id || null)
  const [teachAi, setTeachAi] = useState(false)
  const [correctionReasons, setCorrectionReasons] = useState<SmsCorrectionReason[]>([])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh() }
    const timer = window.setInterval(refresh, 10_000)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh) }
  }, [router])

  const directory = useMemo(() => {
    const entries: DirectoryEntry[] = [
      ...customers.map((item) => ({ key: `customer:${item.id}`, id: item.id, name: item.full_name || item.company_name || item.email || item.phone || "Unnamed customer", company: item.company_name || "", phone: item.phone || "", whatsapp: item.phone || "", email: item.email || "", kind: "customer" as const })),
      ...leads.map((item) => ({ key: `lead:${item.id}`, id: item.id, name: item.full_name || item.company_name || item.email || item.phone || "Unnamed lead", company: item.company_name || "", phone: item.phone || "", whatsapp: item.phone || "", email: item.email || "", kind: "lead" as const })),
      ...suppliers.map((item) => ({ key: `supplier:${item.id}`, id: item.id, name: item.name || item.contactName || item.email || item.phone || "Unnamed supplier", company: item.contactName || item.contactLabel || "", phone: item.phone || "", whatsapp: item.whatsapp || "", email: item.email || "", kind: "supplier" as const })),
      ...contacts.map((item) => ({ key: `contact:${item.id}`, id: item.id, name: item.full_name || item.company || item.email || item.normalized_phone || "Unnamed contact", company: item.company || "", phone: item.normalized_phone || "", whatsapp: item.normalized_phone || "", email: item.email || "", kind: "contact" as const })),
    ]
    const alias = new Map<string, DirectoryEntry>()
    for (const entry of entries) {
      for (const value of [identityKey(entry.phone, null), identityKey(entry.whatsapp, null), identityKey(null, entry.email)]) {
        if (value && !alias.has(value)) alias.set(value, entry)
      }
    }
    for (const contact of contacts) {
      const match = contact.notes?.match(/^Avantia link:(customer|lead|supplier):([A-Za-z0-9_-]+)$/)
      if (!match) continue
      const target = entries.find((entry) => entry.kind === match[1] && entry.id === match[2])
      if (!target) continue
      for (const value of [identityKey(contact.normalized_phone, null), identityKey(null, contact.email)]) {
        if (value) alias.set(value, target)
      }
    }
    return { entries, alias }
  }, [contacts, customers, leads, suppliers])

  const conversations = useMemo(() => {
    const grouped = new Map<string, AuraCommunicationRow[]>()
    for (const communication of communications) {
      if (channelFilter !== "all" && communication.channel !== channelFilter) continue
      const rawKey = identityKey(communication.counterparty_phone, communication.counterparty_email) || `unknown:${communication.contact_id || communication.id}`
      const canonical = directory.alias.get(rawKey)?.key || rawKey
      grouped.set(canonical, [...(grouped.get(canonical) || []), communication])
    }
    return [...grouped.entries()].map(([key, items]) => {
      const ordered = [...items].sort((left, right) => Date.parse(left.occurred_at) - Date.parse(right.occurred_at))
      const latest = ordered[ordered.length - 1]
      const rawKey = identityKey(latest.counterparty_phone, latest.counterparty_email)
      const entry = directory.entries.find((item) => item.key === key) || directory.alias.get(rawKey)
      return {
        key,
        name: entry?.name || latest.counterparty_phone || latest.counterparty_email || "Unknown contact",
        company: entry?.company || "",
        phone: entry?.phone || latest.counterparty_phone || "",
        email: entry?.email || latest.counterparty_email || "",
        kind: entry?.kind || "contact",
        messages: ordered,
        latest,
        channels: [...new Set(ordered.map((item) => item.channel))],
      } satisfies Conversation
    }).sort((left, right) => Date.parse(right.latest.occurred_at) - Date.parse(left.latest.occurred_at))
  }, [channelFilter, communications, directory])

  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return conversations.filter((conversation) => {
      if (contactFilter !== "all" && conversation.kind !== contactFilter) return false
      if (!needle) return true
      return [conversation.name, conversation.company, conversation.phone, conversation.email, ...conversation.messages.map(messageText)].some((value) => value.toLowerCase().includes(needle))
    })
  }, [contactFilter, conversations, query])

  const activeConversation = conversations.find((conversation) => conversation.key === activeKey) || (activeKey !== "__new__" ? conversations[0] : undefined)
  const recipientOptions = directory.entries.filter((entry) => entry.kind === recipientType)
  const selectedChannelReady = channel === "call" || (channel === "sms" ? connections.quo.send : channel === "whatsapp" ? connections.whatsapp.send : connections.email.send)

  function openConversation(conversation: Conversation) {
    setActiveKey(conversation.key)
    setMobileThreadOpen(true)
    const latestChannel = [...conversation.messages].reverse().find((item) => ["sms", "whatsapp", "email"].includes(item.channel))?.channel
    const nextChannel: Channel = latestChannel === "email" || latestChannel === "sms" || latestChannel === "whatsapp" ? latestChannel : "whatsapp"
    setChannel(nextChannel)
    setRecipient(nextChannel === "email" ? conversation.email : conversation.phone)
    const latestEmail = [...conversation.messages].reverse().find((item) => item.channel === "email")
    setSubject(latestEmail ? replySubject(latestEmail.subject) : "")
    setSelectedRecipientId("")
    const storedDraft = smsReplyDrafts.find((draft) => conversation.messages.some((item) => item.id === draft.communication_id))
    setMessage(storedDraft?.reply_text || "")
    setActiveDraftId(storedDraft?.id || null)
    setTeachAi(false)
    setCorrectionReasons([])
    if (storedDraft) setChannel("sms")
    setFeedback(null)
    const auraContact = contacts.find((item) => identityKey(item.normalized_phone, item.email) === identityKey(conversation.phone, conversation.email))
    setSmsAiMode(auraContact?.sms_ai_mode || "auto_safe")
    setSmsAiStyle(auraContact?.sms_ai_style || "professional")
    if (conversation.email && conversation.messages.some((item) => item.channel === "email" && item.direction === "incoming" && !item.read_at)) {
      startTransition(async () => {
        await markEmailConversationReadAction({ conversationEmail: conversation.email })
        router.refresh()
      })
    }
  }

  function changeChannelFilter(nextFilter: string) {
    setChannelFilter(nextFilter)
    const currentMatch = activeConversation?.messages.find((item) => nextFilter === "all" || item.channel === nextFilter)
    const nextCommunication = currentMatch || initialCommunicationForQuery(communications, query, nextFilter)
    if (!nextCommunication) return
    setActiveKey(initialConversationKey(nextCommunication, contacts))
    const nextChannel = nextCommunication.channel === "email" || nextCommunication.channel === "sms" || nextCommunication.channel === "whatsapp"
      ? nextCommunication.channel
      : "whatsapp"
    setChannel(nextChannel)
    setRecipient(nextChannel === "email" ? nextCommunication.counterparty_email || "" : nextCommunication.counterparty_phone || "")
    setSubject(nextChannel === "email" ? replySubject(nextCommunication.subject) : "")
    setSelectedRecipientId("")
    const nextStoredDraft = smsReplyDrafts.find((draft) => draft.communication_id === nextCommunication.id)
    setMessage(nextStoredDraft?.reply_text || "")
    setActiveDraftId(nextStoredDraft?.id || null)
    setTeachAi(false)
    setCorrectionReasons([])
    setFeedback(null)
  }

  function saveSmsAiSettings() {
    if (!activeConversation?.phone) return
    startTransition(async () => {
      const result = await saveSmsAutomationAction({ phone: activeConversation.phone, mode: smsAiMode, style: smsAiStyle, autoCreateRequestDrafts: true })
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      setFeedback({ tone: "success", text: smsAiMode === "off" ? "AI replies are off for this contact." : smsAiMode === "draft" ? "AI will prepare drafts for this contact." : "AI will answer only safe, simple messages; everything else stays a draft." })
      router.refresh()
    })
  }

  function prepareAiReply() {
    const incoming = activeConversation ? [...activeConversation.messages].reverse().find((item) => item.channel === "sms" && item.direction === "incoming" && item.body) : null
    if (!incoming) { setFeedback({ tone: "error", text: "Choose a conversation with an incoming text message." }); return }
    startTransition(async () => {
      setFeedback(null)
      const result = await generateSmsReplyAction({ communicationId: incoming.id })
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      setChannel("sms")
      setRecipient(activeConversation?.phone || "")
      setMessage(result.reply)
      setFeedback({ tone: "success", text: `${result.safetyReason}${result.requestDetected ? " A material-request draft was also added to the request queue." : ""}` })
    })
  }

  function reviewMessageForRequest(communicationId: string) {
    startTransition(async () => {
      setFeedback(null)
      const result = await reviewSmsRequestAction({ communicationId })
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      setRequestReview(result.proposal)
    })
  }

  function createRequestFromReview() {
    if (!requestReview) return
    startTransition(async () => {
      setFeedback(null)
      const result = await createSmsMaterialRequestAction(requestReview)
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      setRequestReview(null)
      setFeedback({ tone: "success", text: "New material request created and assigned to Carlos." })
      router.push(`/owner/materials/requests/${result.requestId}`)
    })
  }

  function quickTag(kind: Exclude<ContactKind, "contact">) {
    if (!activeConversation?.phone) return
    startTransition(async () => {
      const result = await quickTagPhoneContactAction({ phone: activeConversation.phone, kind, name: activeConversation.name === activeConversation.phone ? undefined : activeConversation.name })
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      setFeedback({ tone: "success", text: `Added to ${kind === "customer" ? "Customers" : kind === "lead" ? "Leads" : "Suppliers"} and linked to this conversation.` })
      router.refresh()
    })
  }

  function newConversation() {
    setActiveKey("__new__")
    setMobileThreadOpen(true)
    setSelectedRecipientId("")
    setRecipient("")
    setMessage("")
    setActiveDraftId(null)
    setTeachAi(false)
    setCorrectionReasons([])
    setFeedback(null)
  }

  function selectNewRecipient(id: string) {
    setSelectedRecipientId(id)
    const entry = recipientOptions.find((item) => item.id === id)
    setRecipient(channel === "email" ? entry?.email || "" : channel === "whatsapp" ? entry?.whatsapp || entry?.phone || "" : entry?.phone || entry?.whatsapp || "")
  }

  function changeChannel(nextChannel: Channel) {
    setChannel(nextChannel)
    const entry = recipientOptions.find((item) => item.id === selectedRecipientId)
    if (activeConversation) setRecipient(nextChannel === "email" ? activeConversation.email : activeConversation.phone)
    else if (entry) setRecipient(nextChannel === "email" ? entry.email : nextChannel === "whatsapp" ? entry.whatsapp || entry.phone : entry.phone || entry.whatsapp)
    setFeedback(null)
  }

  function sendMessage() {
    if (channel === "call") return
    const messageChannel = channel
    const sentDraftId = messageChannel === "sms" ? activeDraftId : null
    const teachSentReply = Boolean(sentDraftId && teachAi)
    setFeedback(null)
    startTransition(async () => {
      if (messageChannel === "sms" && attachment) {
        const formData = new FormData()
        formData.set("phone", recipient)
        formData.set("message", message)
        formData.set("attachment", attachment)
        const prepared = await prepareQuoAttachmentMessageAction(formData)
        if (!prepared.ok) { setFeedback({ tone: "error", text: prepared.error }); return }
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) window.location.href = prepared.deepLink
        else {
          await navigator.clipboard?.writeText(message).catch(() => undefined)
          window.open(prepared.quoWebUrl, "_blank", "noopener,noreferrer")
          window.open(prepared.attachmentUrl, "_blank", "noopener,noreferrer")
          setFeedback({ tone: "success", text: "Q U O opened. Attach the prepared file from the second tab." })
        }
        setAttachment(null)
        if (attachmentInputRef.current) attachmentInputRef.current.value = ""
        return
      }
      const result = await sendAuraMessageAction({ channel: messageChannel, recipient, subject, message })
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      if (sentDraftId) {
        const completed = await completeSmsReplyDraftAction({ draftId: sentDraftId, reply: message, teachAi: teachSentReply, correctionReasons })
        setActiveDraftId(null)
        setTeachAi(false)
        setCorrectionReasons([])
        if (!completed.ok) {
          setMessage("")
          setFeedback({ tone: "error", text: completed.error })
          router.refresh()
          return
        }
      }
      setMessage("")
      setFeedback({ tone: "success", text: `${messageChannel === "sms" ? "Text" : messageChannel === "whatsapp" ? "WhatsApp" : "Email"} sent and saved.${teachSentReply ? " This manager-approved correction was added to AI training examples." : ""}` })
      router.refresh()
    })
  }

  function linkConversation() {
    const entry = directory.entries.find((item) => item.key === linkTarget)
    if (!entry || entry.kind === "contact" || !activeConversation) return
    const linkedKind: Exclude<ContactKind, "contact"> = entry.kind
    startTransition(async () => {
      const result = await linkCommunicationContactAction({
        kind: linkedKind,
        sourceId: entry.id,
        name: entry.name,
        company: entry.company,
        phone: entry.phone,
        email: entry.email,
        conversationPhone: activeConversation.phone,
        conversationEmail: activeConversation.email,
      })
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      setLinkTarget("")
      setFeedback({ tone: "success", text: `Conversation assigned to ${entry.name}.` })
      router.refresh()
    })
  }

  function linkEmailConversation() {
    if (!activeConversation?.email || !emailLinkTarget.includes(":")) return
    const [entityType, ...idParts] = emailLinkTarget.split(":")
    startTransition(async () => {
      const result = await linkEmailConversationAction({
        conversationEmail: activeConversation.email,
        entityType: entityType as "client" | "lead" | "supplier" | "material_request",
        entityId: idParts.join(":"),
      })
      if (!result.ok) { setFeedback({ tone: "error", text: result.error }); return }
      setEmailLinkTarget("")
      setFeedback({ tone: "success", text: "Email conversation linked." })
      router.refresh()
    })
  }

  const activeEmailLinks = activeConversation ? [...new Map(activeConversation.messages.flatMap((item) => item.links ?? []).map((link) => [`${link.entity_type}:${link.entity_id}`, link])).values()] : []
  const activeHasEmail = activeConversation?.messages.some((item) => item.channel === "email") ?? false
  const requestCandidateId = activeConversation ? [...activeConversation.messages].reverse().find((item) => messageCanStartMaterialRequest(item) && !(item.links ?? []).some((link) => link.entity_type === "material_request"))?.id ?? null : null
  const activeSmsDraft = activeDraftId ? smsReplyDrafts.find((draft) => draft.id === activeDraftId) || null : null
  const activeDraftEdited = Boolean(activeSmsDraft && message.trim() !== activeSmsDraft.reply_text.trim())

  const threadVisible = mobileThreadOpen || activeKey === "__new__"

  return <section className="h-full min-h-0 w-full max-w-full touch-pan-y overscroll-none overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-label="Unified communications inbox">
    <div className="grid h-full min-h-0 min-w-0 md:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className={`${threadVisible ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-slate-200 bg-white`}>
        <header className="shrink-0 border-b border-slate-200 p-3">
          <div className="flex items-center justify-between gap-3"><div><h1 className="text-lg font-bold">Inbox</h1><p className="text-[11px] text-slate-500">All calls and messages</p></div><div className="flex items-center gap-1"><Link href="/admin/ai-tools/sms-replies" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-700" aria-label="AI reply settings" title="AI reply settings"><Bot className="h-4 w-4" /></Link><button type="button" onClick={newConversation} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0071e3] text-white" aria-label="New conversation"><Plus className="h-4 w-4" /></button></div></div>
          <label className="relative mt-3 block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><span className="sr-only">Search conversations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-[#0071e3]" /></label>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1">{([['all', 'All'], ['customer', 'Customers'], ['lead', 'Leads'], ['supplier', 'Suppliers / Vendors']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setContactFilter(value)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${contactFilter === value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div>
          <label className="mt-2 block"><span className="sr-only">Filter channel</span><select value={channelFilter} onChange={(event) => changeChannelFilter(event.target.value)} className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold"><option value="all">All channels</option><option value="whatsapp">WhatsApp</option><option value="sms">Text</option><option value="email">Email</option><option value="call">Calls</option></select></label>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => <button key={conversation.key} type="button" onClick={() => openConversation(conversation)} className={`flex w-full items-start gap-3 border-b border-slate-100 px-3 py-3 text-left ${activeKey === conversation.key ? "bg-sky-50" : "hover:bg-slate-50"}`}><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">{initials(conversation.name)}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{conversation.name}</strong><time className="shrink-0 text-[10px] text-slate-400">{formatTime(conversation.latest.occurred_at)}</time></span><span className="mt-0.5 flex items-center gap-1.5"><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${contactKindTone(conversation.kind)}`}>{contactKindLabel(conversation.kind)}</span>{conversation.channels.slice(0, 3).map((item) => <span key={item}>{channelIcon(item, "h-3 w-3")}</span>)}</span><span className="mt-1 block truncate text-xs text-slate-500">{messageText(conversation.latest)}</span></span></button>)}
          {!filteredConversations.length ? <p className="p-6 text-center text-sm text-slate-500">No conversations found.</p> : null}
        </div>
      </aside>

      <div className={`${threadVisible ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col overflow-hidden bg-[#f5f5f7]`}>
        {activeKey !== "__new__" && activeConversation?.phone && activeConversation.kind === "contact" ? <section className="shrink-0 border-b border-sky-200 bg-sky-50 px-3 py-2" aria-label="Add contact"><div className="flex min-w-0 items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-sky-700" /><span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-800">Save this number</span>{([['customer', 'Customer'], ['lead', 'Lead'], ['supplier', 'Supplier']] as const).map(([kind, label]) => <button key={kind} type="button" onClick={() => quickTag(kind)} disabled={pending} className="h-7 shrink-0 rounded-full border border-sky-200 bg-white px-2 text-[10px] font-bold text-sky-900 disabled:opacity-50">{label}</button>)}</div></section> : null}
        {activeKey === "__new__" ? <header className="shrink-0 border-b border-slate-200 bg-white p-3"><div className="flex items-center gap-2"><button type="button" onClick={() => setMobileThreadOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button><div><h2 className="font-bold">New conversation</h2><p className="text-xs text-slate-500">Choose a person and channel</p></div></div><div className="mt-3 grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]"><select value={recipientType} onChange={(event) => { setRecipientType(event.target.value as Exclude<ContactKind, "contact">); setSelectedRecipientId(""); setRecipient("") }} className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="customer">Customers</option><option value="lead">Leads</option><option value="supplier">Suppliers / Vendors</option></select><select value={selectedRecipientId} onChange={(event) => selectNewRecipient(event.target.value)} className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Choose a contact</option>{recipientOptions.map((item) => <option key={item.key} value={item.id}>{item.name}{item.company && item.company !== item.name ? ` · ${item.company}` : ""}</option>)}</select></div></header> : activeConversation ? <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileThreadOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold">{initials(activeConversation.name)}</span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">{activeConversation.name}</h2><div className="mt-0.5 flex items-center gap-2"><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${contactKindTone(activeConversation.kind)}`}>{contactKindLabel(activeConversation.kind)}</span><span className="truncate text-[10px] text-slate-500">{activeConversation.phone || activeConversation.email}</span></div></div>{activeConversation.phone ? <button type="button" onClick={() => connections.voice?.send ? setSoftphone({ phone: activeConversation.phone, name: activeConversation.name }) : window.location.assign(`tel:${activeConversation.phone}`)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white" aria-label={`Call ${activeConversation.name}`} title={connections.voice?.send ? "Call from (347) 937-8665" : "Call from this device"}><Phone className="h-4 w-4" /></button> : null}</div>{activeConversation.phone ? <details className="mt-2 rounded-md border border-slate-200 bg-white"><summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 px-2.5 text-[10px] font-bold text-slate-700"><UserRound className="h-3.5 w-3.5 text-sky-700" /><span className="flex-1">{activeConversation.kind === "contact" ? "Save this number" : `${contactKindLabel(activeConversation.kind)} contact`}</span><span className="text-sky-700">{activeConversation.kind === "contact" ? "Add" : "Change"}</span></summary><div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 p-2"><span className="mr-1 text-[10px] font-bold text-slate-600">Save as</span>{([['customer', 'Customer'], ['lead', 'Lead'], ['supplier', 'Supplier']] as const).map(([kind, label]) => <button key={kind} type="button" onClick={() => quickTag(kind)} disabled={pending || activeConversation.kind === kind} className={`h-7 rounded-full border px-2.5 text-[10px] font-bold disabled:opacity-60 ${activeConversation.kind === kind ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white"}`}>{label}{activeConversation.kind === kind ? " ✓" : ""}</button>)}<details className="w-full border-t border-slate-100 pt-1"><summary className="cursor-pointer text-[10px] font-semibold text-sky-700">Link to an existing person instead</summary><div className="mt-2 flex gap-2"><select value={linkTarget} onChange={(event) => setLinkTarget(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs"><option value="">Choose existing contact</option>{directory.entries.filter((entry) => entry.kind !== "contact").map((entry) => <option key={entry.key} value={entry.key}>{contactKindLabel(entry.kind)} · {entry.name}</option>)}</select><button type="button" onClick={linkConversation} disabled={!linkTarget || pending} className="h-9 rounded-md bg-slate-950 px-3 text-xs font-bold text-white disabled:opacity-40">Link</button></div></details></div></details> : null}{activeConversation.phone ? <details className="mt-2 rounded-md bg-slate-50 p-1.5"><summary className="flex h-7 cursor-pointer list-none items-center gap-1.5 px-1 text-[10px] font-bold text-slate-700"><Bot className="h-3.5 w-3.5 text-sky-700" />AI replies · {smsAiMode === "off" ? "Off" : smsAiMode === "draft" ? "Drafts" : "Auto when safe"}<span className="ml-auto text-sky-700">Settings</span></summary><div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-1.5"><select aria-label="AI reply mode" value={smsAiMode} onChange={(event) => setSmsAiMode(event.target.value as typeof smsAiMode)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold"><option value="off">AI off</option><option value="draft">AI drafts</option><option value="auto_safe">Auto when safe</option></select><select aria-label="AI reply style" value={smsAiStyle} onChange={(event) => setSmsAiStyle(event.target.value as typeof smsAiStyle)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold"><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="brief">Very brief</option></select><button type="button" onClick={saveSmsAiSettings} disabled={pending} className="h-8 rounded-md bg-slate-950 px-3 text-[10px] font-bold text-white disabled:opacity-40">Save AI</button></div></details> : null}</header> : null}
        {activeHasEmail && activeConversation ? <section className="shrink-0 border-b border-slate-200 bg-sky-50/70 px-3 py-2" aria-label="Email links"><div className="flex flex-wrap items-center gap-1.5">{activeEmailLinks.map((link) => <Link key={`${link.entity_type}:${link.entity_id}`} href={link.entity_type === "material_request" ? `/owner/materials/requests/${link.entity_id}` : link.entity_type === "supplier" ? `/admin/vendors?q=${encodeURIComponent(link.entity_label)}` : "/admin/users"} className="rounded-full border border-sky-200 bg-white px-2 py-1 text-[10px] font-bold text-sky-800">{link.entity_type === "material_request" ? "Request" : link.entity_type === "supplier" ? "Supplier" : link.entity_type === "client" ? "Client" : "Lead"} · {link.entity_label}</Link>)}{!activeEmailLinks.length ? <span className="text-[10px] font-semibold text-slate-500">Not linked yet</span> : null}</div><div className="mt-2 flex gap-2"><select value={emailLinkTarget} onChange={(event) => setEmailLinkTarget(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-sky-200 bg-white px-2 text-[11px] font-semibold"><option value="">Link email to…</option><optgroup label="Material requests">{materialRequests.map((request) => <option key={request.id} value={`material_request:${request.id}`}>{request.title} · {request.status}</option>)}</optgroup><optgroup label="Clients">{customers.map((client) => <option key={client.id} value={`client:${client.id}`}>{client.full_name || client.company_name || client.email}</option>)}</optgroup><optgroup label="Leads">{leads.map((lead) => <option key={lead.id} value={`lead:${lead.id}`}>{lead.full_name || lead.company_name || lead.email || lead.phone}</option>)}</optgroup><optgroup label="Suppliers">{suppliers.map((supplier) => <option key={supplier.id} value={`supplier:${supplier.id}`}>{supplier.name}</option>)}</optgroup></select><button type="button" onClick={linkEmailConversation} disabled={!emailLinkTarget || pending} className="h-8 rounded-md bg-slate-950 px-3 text-[11px] font-bold text-white disabled:opacity-40">Link</button></div></section> : null}

        {activeConversation?.phone ? <span className="sr-only">Add or change contact type</span> : null}
        <div className="min-h-0 min-w-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5">
          {activeConversation ? <div className="mx-auto grid min-w-0 max-w-3xl gap-2">{activeConversation.messages.map((item) => { const outgoing = item.direction === "outgoing"; const text = messageText(item); const media = Array.isArray(item.media) ? item.media : []; return <article key={item.id} className={`flex min-w-0 ${outgoing ? "justify-end" : "justify-start"}`}><div className={`min-w-0 max-w-[88%] overflow-hidden rounded-lg border px-3 py-2 shadow-sm sm:max-w-[75%] ${outgoing ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}><ExpandableMessage text={text} />{item.channel === "call" && item.summary && item.summary !== text ? <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-5 text-slate-600"><strong>Summary:</strong> {item.summary}</p> : null}{item.next_steps?.length ? <p className="mt-1 text-xs font-semibold text-[#0066cc]">Next: {item.next_steps.join(" · ")}</p> : null}{media.length ? <div className="mt-2 flex flex-wrap gap-2">{media.map((attachment, index) => attachment.url ? attachment.type?.startsWith("audio/") ? <audio key={`${attachment.url}-${index}`} controls preload="none" className="h-9 max-w-full" src={attachment.url} /> : <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-[10px] font-bold"><Paperclip className="h-3 w-3 shrink-0" /><span className="truncate">{attachmentLabel(attachment, index)}</span></a> : null)}</div> : null}{item.id === requestCandidateId ? <button type="button" onClick={() => reviewMessageForRequest(item.id)} disabled={pending} className="mt-2 inline-flex h-7 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 text-[10px] font-bold text-sky-800 disabled:opacity-40"><ClipboardList className="h-3 w-3" />Review material request</button> : null}<div className="mt-1.5 flex items-center justify-end gap-1.5 text-[9px] text-slate-400"><span>{channelIcon(item.channel, "h-3 w-3")}</span><time>{formatMessageTime(item.occurred_at)}</time>{item.duration_seconds ? <span>{Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, "0")}</span> : null}{outgoing ? statusIcon(item.status) : null}</div></div></article>})}</div> : <div className="flex h-full min-h-48 items-center justify-center text-center"><div><MessageCircle className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Start a conversation</p></div></div>}
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-2.5 sm:p-3">
          <div className="mx-auto max-w-3xl">
            {activeSmsDraft ? <section className="mb-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2" aria-label="AI reply draft"><div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-bold text-sky-950">AI draft ready · edit before sending</p><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${activeSmsDraft.decision === "blocked" || activeSmsDraft.decision === "send_failed" ? "bg-amber-100 text-amber-800" : "bg-white text-sky-700"}`}>{activeSmsDraft.decision.replaceAll("_", " ")}</span><span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${activeSmsDraft.safety_level === "green" ? "bg-emerald-100 text-emerald-800" : activeSmsDraft.safety_level === "red" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{activeSmsDraft.safety_level || "yellow"} safety</span></div><p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-sky-800">{activeSmsDraft.safety_reason || "Manager review is required before sending."}</p>{activeDraftEdited ? <div className="mt-2"><p className="text-[9px] font-bold uppercase tracking-wide text-sky-900">Why did you edit it?</p><div className="mt-1 flex flex-wrap gap-1">{SMS_CORRECTION_REASONS.map((reason) => <button key={reason} type="button" onClick={() => setCorrectionReasons((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason])} className={`rounded-full border px-2 py-1 text-[9px] font-bold ${correctionReasons.includes(reason) ? "border-sky-700 bg-sky-700 text-white" : "border-sky-200 bg-white text-sky-800"}`}>{CORRECTION_REASON_LABELS[reason]}</button>)}</div></div> : null}<label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-sky-950"><input type="checkbox" checked={teachAi} onChange={(event) => setTeachAi(event.target.checked)} className="h-3.5 w-3.5 rounded border-sky-300 accent-sky-700" />Teach AI from my approved reply</label><p className="mt-0.5 text-[9px] text-sky-700">Nothing is learned unless you check this box and send. Customer details are redacted before reuse. Internal AI model: {activeSmsDraft.ai_model || "recorded by broker"}{activeSmsDraft.latency_ms ? ` · ${activeSmsDraft.latency_ms} ms` : ""}.</p></div></div></section> : null}
            <div className="flex gap-1.5 overflow-x-auto pb-2">{activeConversation?.phone ? <button type="button" onClick={prepareAiReply} disabled={pending} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-800 disabled:opacity-40"><Sparkles className="h-3 w-3" />AI answer</button> : null}{QUICK_REPLIES.map((reply) => <button key={reply} type="button" onClick={() => setMessage(reply)} className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">{reply}</button>)}</div>
            <div className="flex items-end gap-2 rounded-lg border border-slate-300 bg-white p-1.5 focus-within:border-[#0071e3]">
              <select value={channel} onChange={(event) => changeChannel(event.target.value as Channel)} className="h-9 w-[5.25rem] shrink-0 rounded-md border-0 bg-slate-100 px-1.5 text-[10px] font-bold sm:w-[6.6rem] sm:px-2"><option value="whatsapp">WhatsApp</option><option value="sms">Text</option><option value="email">Email</option></select>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={1} maxLength={1600} placeholder="Write a message" className="max-h-28 min-h-9 min-w-0 flex-1 resize-y border-0 bg-transparent px-1 py-2 text-sm leading-5 outline-none" />
              {channel === "sms" ? <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500" aria-label="Add attachment"><Paperclip className="h-4 w-4" /><input ref={attachmentInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.tif,.tiff,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.mp4,.mov" className="sr-only" onChange={(event) => setAttachment(event.target.files?.[0] || null)} /></label> : null}
              <button type="button" onClick={sendMessage} disabled={pending || !selectedChannelReady || !recipient.trim() || !message.trim()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white disabled:bg-slate-300" aria-label="Send message"><Send className="h-4 w-4" /></button>
            </div>
            {channel === "email" ? <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Email subject" className="mt-2 h-9 w-full rounded-md border border-slate-300 px-3 text-xs" /> : null}
            {attachment ? <div className="mt-2 flex items-center justify-between rounded-md bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold"><span className="truncate">{attachment.name} · Q U O supports up to 5 MB</span><button type="button" onClick={() => { setAttachment(null); if (attachmentInputRef.current) attachmentInputRef.current.value = "" }} aria-label="Remove attachment"><X className="h-3.5 w-3.5" /></button></div> : null}
            {!selectedChannelReady ? <p className="mt-2 text-xs font-semibold text-amber-700">This channel still needs a connection.</p> : null}
            {feedback ? <p className={`mt-2 text-xs font-semibold ${feedback.tone === "success" ? "text-emerald-700" : "text-rose-700"}`} role="status">{feedback.text}</p> : null}
          </div>
        </footer>
      </div>
    </div>
    {requestReview ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sms-request-review-title"><button type="button" className="absolute inset-0 cursor-default" onClick={() => !pending && setRequestReview(null)} aria-label="Close request review" /><aside className="relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-[#f7f7f8] shadow-2xl sm:rounded-2xl"><header className="flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-4"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><ClipboardList className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">SMS → Carlos</p><h2 id="sms-request-review-title" className="mt-0.5 text-lg font-bold text-slate-950">Review new request</h2><p className="mt-1 text-xs leading-5 text-slate-500">AI prepared the details from this conversation. Nothing is created until you confirm.</p></div><button type="button" onClick={() => setRequestReview(null)} disabled={pending} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white" aria-label="Close"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{requestReview.existingRequestId ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Open request found:</strong> {requestReview.existingRequestTitle}. Confirming below creates a separate new request.</div> : null}<section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-2 text-xs font-bold text-slate-900"><UserRound className="h-4 w-4 text-sky-700" />Customer</div><label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Name</label><input value={requestReview.customerName} onChange={(event) => setRequestReview({ ...requestReview, customerName: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /><p className="mt-1.5 text-[11px] text-slate-500">Phone stays attached: {requestReview.phone}</p><label className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"><MapPin className="h-3 w-3" />Job address</label><input value={requestReview.customerAddress} onChange={(event) => setRequestReview({ ...requestReview, customerAddress: event.target.value })} placeholder="Add if the customer provided one" className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></section><section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Request title</label><input value={requestReview.title} onChange={(event) => setRequestReview({ ...requestReview, title: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold" /><label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Department</label><input value={requestReview.department} onChange={(event) => setRequestReview({ ...requestReview, department: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></section><section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-900">Materials</h3><button type="button" onClick={() => setRequestReview({ ...requestReview, items: [...requestReview.items, { name: "", quantity: 1, unit: "each" }] })} className="h-7 rounded-full border border-slate-300 px-2.5 text-[10px] font-bold">Add item</button></div><div className="mt-2 space-y-2">{requestReview.items.map((item, index) => <div key={`${index}-${item.name}`} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_1.75rem] gap-1.5"><input aria-label={`Item ${index + 1}`} value={item.name} onChange={(event) => setRequestReview({ ...requestReview, items: requestReview.items.map((current, itemIndex) => itemIndex === index ? { ...current, name: event.target.value } : current) })} placeholder="Material" className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-xs" /><input aria-label={`Quantity ${index + 1}`} type="number" min="0.01" step="any" value={item.quantity} onChange={(event) => setRequestReview({ ...requestReview, items: requestReview.items.map((current, itemIndex) => itemIndex === index ? { ...current, quantity: Number(event.target.value) } : current) })} className="h-9 rounded-md border border-slate-300 px-2 text-xs" /><input aria-label={`Unit ${index + 1}`} value={item.unit} onChange={(event) => setRequestReview({ ...requestReview, items: requestReview.items.map((current, itemIndex) => itemIndex === index ? { ...current, unit: event.target.value } : current) })} className="h-9 rounded-md border border-slate-300 px-2 text-xs" /><button type="button" onClick={() => setRequestReview({ ...requestReview, items: requestReview.items.filter((_, itemIndex) => itemIndex !== index) })} className="inline-flex h-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100" aria-label={`Remove item ${index + 1}`}><X className="h-3.5 w-3.5" /></button></div>)}{!requestReview.items.length ? <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">No clear material lines were found. Add at least one item.</p> : null}</div></section><details className="rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700">Messages AI reviewed ({requestReview.sourceMessages.length})</summary><div className="mt-2 space-y-2">{requestReview.sourceMessages.map((source, index) => <p key={`${source}-${index}`} className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-600">{source}</p>)}</div></details></div><footer className="border-t border-slate-200 bg-white p-3"><p className="mb-2 text-[11px] text-slate-500">Assigned to <strong className="text-slate-800">Carlos</strong>. You can change the assignee later from Material Requests.</p><div className="flex gap-2"><button type="button" onClick={() => setRequestReview(null)} disabled={pending} className="h-10 flex-1 rounded-lg border border-slate-300 bg-white text-xs font-bold">Cancel</button><button type="button" onClick={createRequestFromReview} disabled={pending || !requestReview.title.trim() || !requestReview.items.some((item) => item.name.trim())} className="h-10 flex-[1.5] rounded-lg bg-slate-950 text-xs font-bold text-white disabled:bg-slate-300">{pending ? "Creating…" : "Confirm & create"}</button></div></footer></aside></div> : null}
    <TwoChatSoftphone open={Boolean(softphone)} phone={softphone?.phone || ""} name={softphone?.name || "Contact"} onClose={() => setSoftphone(null)} />
  </section>
}
