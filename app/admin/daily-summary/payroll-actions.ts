"use server"
import {revalidatePath} from "next/cache"
import {requireManagerPortalProfile} from "@/lib/auth"
import {isValidDailyWorkDateKey} from "@/lib/daily-work-summary"

export async function requestCarlosPayAction(dates:string[],requestId:string) {
 const {supabase,user}=await requireManagerPortalProfile()
 if(user.email?.trim().toLowerCase()!=="buildavantiap@gmail.com") return {ok:false,error:"Only Carlos can request his pay."}
 if(!dates.length||dates.length>90||dates.some(date=>!isValidDailyWorkDateKey(date))||!/^[0-9a-f-]{36}$/i.test(requestId)) return {ok:false,error:"Choose completed unpaid days."}
 const {data,error}=await supabase.rpc("request_carlos_payroll",{p_dates:dates,p_request_id:requestId})
 if(error) return {ok:false,error:"One of these days changed or was already requested. Refresh and check your selection."}
 revalidatePath("/admin/daily-summary")
 return {ok:true,totalCents:Number(data?.totalCents||0)}
}
export async function setCarlosPaidAction(date:string,paid:boolean,version:number) {
 const {supabase,user}=await requireManagerPortalProfile()
 if(user.email?.trim().toLowerCase()!=="avitanneto@gmail.com") return {ok:false,error:"Only David can change paid or unpaid status."}
 if(!isValidDailyWorkDateKey(date)||typeof paid!=="boolean"||!Number.isSafeInteger(version)||version<0) return {ok:false,error:"Choose a valid workday."}
 const {error}=await supabase.rpc("set_carlos_day_paid",{p_date:date,p_paid:paid,p_version:version})
 if(error) return {ok:false,error:"Payment status changed. Refresh before trying again."}
 revalidatePath("/admin/daily-summary");revalidatePath("/admin/build-map")
 return {ok:true}
}
