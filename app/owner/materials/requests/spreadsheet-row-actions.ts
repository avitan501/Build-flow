"use server"

import { revalidatePath } from "next/cache"
import { requireStaffProfile } from "@/lib/auth"
import { requestItemRevision } from "@/lib/request-item-revision"
import { requestItemFieldsMetadata, type RequestItemField } from "@/lib/request-item-fields"
import { canonicalItemValue } from "@/lib/request-item-continuity"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"
import { validMaterialSpreadsheetFields } from "@/lib/material-spreadsheet-draft"

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const columns="id,name,department,quantity,unit,metadata,qualification_status"

export async function addSpreadsheetMaterialRow(input:{requestId:string;itemId:string;name:string;quantity:number;unit:string;details:string;fields:RequestItemField[];recognitionText:string;recognitionQuestions:string[]}) {
  if(!input||!uuid.test(input.requestId)||!uuid.test(input.itemId)||typeof input.name!=="string"||!input.name.trim()||input.name.length>300||!Number.isFinite(input.quantity)||input.quantity<=0||typeof input.unit!=="string"||!input.unit.trim()||input.unit.length>60||typeof input.recognitionText!=="string"||!input.recognitionText.trim()||input.recognitionText.length>3000||typeof input.details!=="string"||input.details.length>1200||!Array.isArray(input.fields)||input.fields.length>16||!Array.isArray(input.recognitionQuestions)||input.recognitionQuestions.length>20||input.recognitionQuestions.some(q=>typeof q!=="string"||q.length>300))return{ok:false as const,error:"Enter a source line, product, positive quantity and unit."}
  const {supabase,user}=await requireStaffProfile("customers")
  if(!validMaterialSpreadsheetFields(input.fields))return{ok:false as const,error:"Review the product fields before saving; no fields were removed or shortened."}
  const {data:request}=await supabase.from("quote_requests").select("id,project_id,owner_id").eq("id",input.requestId).maybeSingle()
  if(!request)return{ok:false as const,error:"Request not found."}
  const {data:first}=await supabase.from("quote_request_items").select("department").eq("request_id",input.requestId).order("created_at").limit(1).maybeSingle()
  const metadata={...requestItemFieldsMetadata(input.fields),ai_organized:true,source_text:input.recognitionText.trim(),recognition_text:input.recognitionText.trim(),request_details:input.details.trim(),request_item_origin:"manually_added",manually_added_by:user.id,recognition_questions:input.recognitionQuestions,review_reasons:input.recognitionQuestions,needs_review:input.recognitionQuestions.length>0,review_status:input.recognitionQuestions.length?"check":"ready"}
  const payload={id:input.itemId,request_id:request.id,project_id:request.project_id,owner_id:request.owner_id,name:input.name.trim(),quantity:input.quantity,unit:input.unit.trim(),department:first?.department||"Others",item_type:"custom_priced",qualification_status:input.recognitionQuestions.length?"pending":"not_required",metadata}
  // Stable row ID makes a retry safe; a duplicate is checked, never overwritten.
  const {error}=await supabase.from("quote_request_items").insert(payload)
  if(error&&error.code!=="23505")return{ok:false as const,error:"Row not saved. Your draft is still here."}
  const {data:item}=await supabase.from("quote_request_items").select(columns).eq("request_id",input.requestId).eq("id",input.itemId).maybeSingle<ReviewableMaterialItem>()
  if(!item)return{ok:false as const,error:"Unable to verify this row. Your draft is still here."}
  if(error&&(item.name!==payload.name||item.quantity!==payload.quantity||item.unit!==payload.unit||canonicalItemValue(item.metadata)!==canonicalItemValue(metadata)))return{ok:false as const,error:"This row was already saved with other changes. Reload before editing it."}
  revalidatePath(`/owner/materials/requests/${input.requestId}`)
  return{ok:true as const,item,source:null,revision:requestItemRevision(item,null)}
}
