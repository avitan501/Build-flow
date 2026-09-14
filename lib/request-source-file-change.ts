import type { ReviewableMaterialItem } from "@/lib/client-material-review"

/** Only a bounded filename/event, never a storage path, signed URL or document text. */
export function sourceFileChangeNotice(before: ReviewableMaterialItem, after: ReviewableMaterialItem) {
  const oldChange = before.metadata?.source_file_change as Record<string, unknown> | undefined
  const change = after.metadata?.source_file_change as Record<string, unknown> | undefined
  if (!change || typeof change.revision !== "string" || change.revision === oldChange?.revision) return null
  const name = typeof change.file_name === "string" ? change.file_name.replace(/[\u0000-\u001f\u007f]/g, "").split(/[\\/]/).pop()?.slice(0, 240) : ""
  const action = change.event === "insert" ? "added" : change.event === "delete" ? "removed" : "changed"
  return `Request file ${action}${name ? `: ${name}` : ""}. Review the source files before editing. Products have not been re-extracted.`
}
