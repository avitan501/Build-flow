import "server-only"

import { getSessionWithProfile } from "@/lib/auth"

export type CustomerPortalRequest = {
  id: string
  publicNumber: number
  title: string
  status: string
  statusLabel: string
  updatedAt: string
  deliveryAddress: string
  items: Array<{ id: string; name: string; quantity: number; unit: string; needsDetails: boolean }>
  missingQuestions: string[]
  approvalLabel: string
}

const statusLabels: Record<string, string> = {
  draft: "Being prepared",
  submitted: "Received",
  in_review: "Pricing in progress",
  quoted: "Quote ready",
  closed: "Completed",
}

function approvalLabel(status: string) {
  if (status === "in_review") return "No approval is ready yet. We will contact you when pricing is ready."
  if (status === "quoted") return "Review the quote Avantia sent before approving any purchase."
  if (status === "closed") return "This request is complete."
  return "No approval is needed right now."
}

export async function getCustomerPortalRequests(): Promise<{ signedIn: boolean; requests: CustomerPortalRequest[] }> {
  const { supabase, user } = await getSessionWithProfile()
  if (!supabase || !user) return { signedIn: false, requests: [] }

  await supabase.rpc("claim_customer_request_portal_access")
  const [{ data: accessRows }, { data: ownedRows }] = await Promise.all([
    supabase.from("customer_request_portal_access").select("request_id,delivery_address").eq("claimed_by", user.id).returns<Array<{ request_id: string; delivery_address: string }>>(),
    supabase.from("quote_requests").select("id").eq("owner_id", user.id).returns<Array<{ id: string }>>(),
  ])
  const addressByRequest = new Map((accessRows || []).map((row) => [row.request_id, row.delivery_address]))
  const requestIds = [...new Set([...(accessRows || []).map((row) => row.request_id), ...(ownedRows || []).map((row) => row.id)])]
  if (!requestIds.length) return { signedIn: true, requests: [] }

  const [{ data: requests, error: requestError }, { data: items, error: itemError }] = await Promise.all([
    supabase.from("quote_requests").select("id,public_number,title,status,updated_at").in("id", requestIds).order("updated_at", { ascending: false }).returns<Array<{ id: string; public_number: number; title: string; status: string; updated_at: string }>>(),
    supabase.from("quote_request_items").select("id,request_id,name,quantity,unit,qualification_status").in("request_id", requestIds).order("created_at").returns<Array<{ id: string; request_id: string; name: string; quantity: number; unit: string | null; qualification_status: string }>>(),
  ])
  if (requestError || itemError) throw new Error("Could not load your material requests.")

  return {
    signedIn: true,
    requests: (requests || []).map((request) => {
      const requestItems = (items || []).filter((item) => item.request_id === request.id).map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "each",
        needsDetails: item.qualification_status === "pending",
      }))
      return {
        id: request.id,
        publicNumber: request.public_number,
        title: request.title,
        status: request.status,
        statusLabel: statusLabels[request.status] || "In progress",
        updatedAt: request.updated_at,
        deliveryAddress: addressByRequest.get(request.id) || "",
        items: requestItems,
        missingQuestions: requestItems.filter((item) => item.needsDetails).map((item) => `Please confirm the remaining details for ${item.name}.`),
        approvalLabel: approvalLabel(request.status),
      }
    }),
  }
}
