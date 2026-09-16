"use server"
import { requireStaffProfile } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { requestItemRevision } from "@/lib/request-item-revision"
import { requestItemFieldsFromMetadata } from "@/lib/request-item-fields"
import { validateRecognizedRows } from "@/lib/material-row-recognition"
import type { ReviewableMaterialItem } from "@/lib/client-material-review"

export async function recognizeRequestProductLine(input:{requestId:string;itemId:string;revision:string;text:string}) {
  const uuid=/^[0-9a-f-]{36}$/i
  if(!input||!uuid.test(input.requestId)||!uuid.test(input.itemId)||typeof input.text!=="string"||!input.text.trim()||input.text.length>3000)return{ok:false as const,error:"Enter one source line, up to 3,000 characters."}
  const {supabase}=await requireStaffProfile("customers")
  const columns="id,name,department,quantity,unit,metadata,qualification_status"
  const {data:item}=await supabase.from("quote_request_items").select(columns).eq("request_id",input.requestId).eq("id",input.itemId).maybeSingle<ReviewableMaterialItem>()
  if(!item||item.metadata?.ai_organized!==true)return{ok:false as const,error:"This product is no longer available."}
  const sourceId=typeof item.metadata?.source_item_id==="string"?item.metadata.source_item_id:null
  const {data:source}=sourceId?await supabase.from("quote_request_items").select(columns).eq("request_id",input.requestId).eq("id",sourceId).maybeSingle<ReviewableMaterialItem>():{data:null}
  if((sourceId&&!source)||requestItemRevision(item,source)!==input.revision)return{ok:false as const,error:"The product or original changed. Reload before recognizing."}
  const shared=source?.metadata?.material_clarifications as {source?:string;answers?:Record<string,string>}|undefined
  const fields=shared?.source===source?.metadata?.request_details?requestItemFieldsFromMetadata(source?.metadata).filter(f=>f.id.startsWith("clarify-")):[]
  const current=Boolean(source && shared?.source===source.metadata?.request_details)
  const conventions={tjiTenIsNineHalf:current && shared?.answers?.["tji-depth"]==="TJI 10-inch means 9½-inch; preserve the specified series",lvlTenIsNineHalf:current && shared?.answers?.["lvl-depth"]==="LVL 10-inch means 9½-inch; retain thickness and length"}
  try{
    const {data,error}=await createAdminClient().functions.invoke("material-row-recognition",{body:{rows:[{id:item.id,text:input.text}],sharedAnswers:fields.map(f=>`${f.label}: ${f.value}`).join("\n"),conventions}})
    if(error||!data?.ok)return{ok:false as const,error:"Recognition is unavailable. Your existing product is unchanged."}
    return{ok:true as const,row:validateRecognizedRows(data,[{id:item.id,text:input.text}],conventions)[0]}
  }catch{return{ok:false as const,error:"Recognition did not validate. Your existing product is unchanged."}}
}
