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

export default async function WebsiteDefectsPage() {
  const { supabase, access } = await requireManagerPortalProfile()
  if (!canReportWebsiteDefects(access)) redirect("/")
  const { data } = await supabase.from("website_defects").select("id,issue_number,title,description,page_url,status,priority,file_name,file_path,mime_type,file_size,assigned_to,review_notes,created_at").order("created_at", { ascending: false }).limit(100).returns<WebsiteDefectRow[]>()
  const issues: WebsiteDefectRecord[] = await Promise.all((data ?? []).map(async (row) => {
    const { data: signed } = await supabase.storage.from("website-defects").createSignedUrl(row.file_path, 60 * 60)
    return { id: row.id, issueNumber: row.issue_number, title: row.title, description: row.description, pageUrl: row.page_url, status: row.status, priority: row.priority, fileName: row.file_name, mimeType: row.mime_type, fileSize: row.file_size, mediaUrl: signed?.signedUrl ?? null, assignedTo: row.assigned_to, reviewNotes: row.review_notes, createdAt: row.created_at }
  }))
  const { data: qaRows } = await supabase.from("website_qa_checks").select("id,title,instructions,last_result,last_notes,last_checked_at").order("journey_order", { ascending: true }).returns<Array<{ id: string; title: string; instructions: string; last_result: string; last_notes: string; last_checked_at: string | null }>>()
  const checks: WebsiteQaCheckRecord[] = (qaRows ?? []).map((row) => ({ id: row.id, title: row.title, instructions: row.instructions, lastResult: row.last_result, lastNotes: row.last_notes, lastCheckedAt: row.last_checked_at }))
  return <main className="min-h-screen bg-[#f5f5f7] px-3 pb-20 pt-4 text-slate-950 sm:px-6 sm:pt-6"><div className="mx-auto max-w-6xl"><Link href="/admin/ai-tools" className="mb-3 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#0066cc] hover:text-sky-800"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Manager Tools</Link><WebsiteDefectInbox issues={issues} checks={checks} canManage={canManageWebsiteDefects(access)} /></div></main>
}
