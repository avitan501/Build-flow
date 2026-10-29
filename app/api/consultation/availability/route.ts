import { CONSULTATION_HOURS, newYorkStart } from '@/lib/consultation-calendar';
import { busyBetween, findEvent } from '@/lib/consultation-booking/google';
import { validSlot } from '@/lib/consultation-booking/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { json } from '@/lib/client-questionnaire/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const date=new URL(request.url).searchParams.get('date')||'';const now=new Date();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!CONSULTATION_HOURS.some(h=>validSlot(date,h,now)))return json({hours:[]});
 try{
 const start=newYorkStart(date,12).toISOString(),end=newYorkStart(date,17).toISOString();
 const [busy,reservations]=await Promise.all([busyBetween(start,end),createAdminClient().from('consultation_booking_reservations').select('id,starts_at,status').gte('starts_at',start).lt('starts_at',end)]);
 if(reservations.error)throw Error('Storage unavailable');
 const held=new Set<number>();
 // A meeting cancelled in the owner's Google Calendar must free its website slot.
 for(const reservation of reservations.data){
  const time=new Date(reservation.starts_at).getTime();
  const occupied=busy.some(b=>Date.parse(b.start)<time+900000&&Date.parse(b.end)>time);
  if(reservation.status==='confirmed'&&!occupied){
   const event=await findEvent(reservation.id);
   if(!event||event.status==='cancelled'){
    const removed=await createAdminClient().from('consultation_booking_reservations').delete().eq('id',reservation.id).eq('status','confirmed');
    if(removed.error)throw Error('Cancellation sync unavailable');
    continue;
   }
  }
  held.add(time);
 }
 const hours=CONSULTATION_HOURS.filter(hour=>{const t=newYorkStart(date,hour).getTime();return validSlot(date,hour,now)&&!held.has(t)&&!busy.some(b=>new Date(b.start).getTime()<t+900000&&new Date(b.end).getTime()>t)});
 return json({date,hours});
 }catch{return json({error:'We couldn’t check available times. Please try again.'},503)}
}
