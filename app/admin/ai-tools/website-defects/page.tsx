import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { redirect } from "next/navigation"

import { WebsiteDefectInbox, type WebsiteDefectRecord, type WebsiteQaCheckRecord } from "@/components/buildflow/website-defect-inbox"
import { requireManagerPortalProfile } from "@/lib/auth"
import { canManageWebsiteDefects, canReportWebsiteDefects } from "@/lib/website-defects-access"

type WebsiteDefectRow = {
  id: string
  issue_number: number
  title: string
  description: string
  page_url: string
  status: string
  priority: string
  file_name: string
  file_path: string
  mime_type: string
  file_size: number
  assigned_to: string
  review_notes: string
  created_at: string
}

type WebsiteDefectAttachmentRow = {
  id: string
  defect_id: string
  position: number
  file_name: string
  file_path: string
  mime_type: string
  file_size: number
}

export default async function WebsiteDefectsPage() {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!canReportWebsiteDefects(access)) redirect("/")
  const { data } = await supabase.from("website_defects").select("id,issue_number,title,description,page_url,status,priority,file_name,file_path,mime_type,file_size,assigned_to,review_notes,created_at").order("created_at", { ascending: false }).limit(100).returns<WebsiteDefectRow[]>()
  const defectRows = data ?? []
  const defectIds = defectRows.map((row) => row.id)
  const { data: attachmentData } = defectIds.length
    ? await supabase.from("website_defect_attachments").select("id,defect_id,position,file_name,file_path,mime_type,file_size").in("defect_id", defectIds).order("position", { ascending: true }).returns<WebsiteDefectAttachmentRow[]>()
    : { data: [] as WebsiteDefectAttachmentRow[] }
  const attachmentRows = attachmentData ?? []
  const allPaths = [...defectRows.map((row) => row.file_path), ...attachmentRows.map((row) => row.file_path)]
  const { data: signedFiles } = allPaths.length
    ? await supabase.storage.from("website-defects").createSignedUrls(allPaths, 60 * 60)
    : { data: [] }
  const signedUrlByPath = new Map((signedFiles ?? []).map((file) => [file.path, file.signedUrl]))
  const attachmentsByDefect = new Map<string, WebsiteDefectAttachmentRow[]>()
  for (const attachment of attachmentRows) {
    const list = attachmentsByDefect.get(attachment.defect_id) ?? []
    list.push(attachment)
    attachmentsByDefect.set(attachment.defect_id, list)
  }
  const issues: WebsiteDefectRecord[] = defectRows.map((row) => ({
    id: row.id,
    issueNumber: row.issue_number,
    title: row.title,
    description: row.description,
    pageUrl: row.page_url,
    status: row.status,
    priority: row.priority,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    mediaUrl: signedUrlByPath.get(row.file_path) ?? null,
    assignedTo: row.assigned_to,
    reviewNotes: row.review_notes,
    createdAt: row.created_at,
    attachments: (attachmentsByDefect.get(row.id) ?? []).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      fileSize: attachment.file_size,
      mediaUrl: signedUrlByPath.get(attachment.file_path) ?? null,
    })),
  }))
  const { data: qaRows } = await supabase.from("website_qa_checks").select("id,title,instructions,last_result,last_notes,last_checked_at").order("journey_order", { ascending: true }).returns<Array<{ id: string; title: string; instructions: string; last_result: string; last_notes: string; last_checked_at: string | null }>>()
  const checks: WebsiteQaCheckRecord[] = (qaRows ?? []).map((row) => ({ id: row.id, title: row.title, instructions: row.instructions, lastResult: row.last_result, lastNotes: row.last_notes, lastCheckedAt: row.last_checked_at }))
  return <main className="min-h-screen bg-[#f5f5f7] px-3 pb-20 pt-4 text-slate-950 sm:px-6 sm:pt-6"><div className="mx-auto max-w-6xl"><Link href="/admin/ai-tools" className="mb-3 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#0066cc] hover:text-sky-800"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Manager Tools</Link><WebsiteDefectInbox issues={issues} checks={checks} canManage={canManageWebsiteDefects(access)} /></div></main>
}
