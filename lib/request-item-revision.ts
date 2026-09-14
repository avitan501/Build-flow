import "server-only"
import { createHash } from "node:crypto"
import { canonicalItemValue, itemEditSnapshot } from "@/lib/request-item-continuity"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"

export function requestItemRevision(item: ReviewableMaterialItem, source: ReviewableMaterialItem | null) {
  return createHash("sha256").update(canonicalItemValue({ item: itemEditSnapshot(item), source: source ? itemEditSnapshot(source) : null })).digest("hex")
}
