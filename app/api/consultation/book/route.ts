import { createHash,createHmac } from 'node:crypto';
import { bookingSchema,validSlot } from '@/lib/consultation-booking/schema';
import { newYorkStart } from '@/lib/consultation-calendar';
import { busyBetween,findEvent,insertBooking,meetingLink,CalendarFailure,ORGANIZER } from '@/lib/consultation-booking/google';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasSameOrigin,json,readBody } from '@/lib/client-questionnaire/http';
export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(request:Request){
 if(!hasSameOrigin(request))return json({error:'Please book from our website.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required.'},415);
 let body;try{body=bookingSchema.parse(await readBody(request))}catch{return json({error:'Enter your name and a valid email address.'},400)}
 if(!validSlot(body.date,body.hour))return json({error:'Please choose another appointment time.'},409);
 const start=newYorkStart(body.date,body.hour).toISOString(),end=new Date(Date.parse(start)+900000).toISOString();
 const hash=createHash('sha256').update(JSON.stringify([start,body.name,body.email])).digest('hex');
 const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)return json({error:'Booking is temporarily unavailable.'},503);
 const ip=process.env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]||'unknown':'local';
 const bucket=createHmac('sha256',secret).update(`${new Date().toISOString().slice(0,10)}:${ip}`).digest('hex');
 const db=createAdminClient();
 try{
 const {data:reservation,error}=await db.rpc('reserve_consultation',{p_id:body.id,p_starts_at:start,p_content_hash:hash,p_bucket:bucket});if(error)throw error;
 if(reservation==='limited')return json({error:'Too many booking attempts. Please contact us or try tomorrow.'},429);
 if(reservation==='conflict')return json({error:'This time is no longer available, or the booking details changed. Please choose another time.'},409);
 if(!['reserved','duplicate'].includes(reservation))throw Error('Reservation failed');
 let event=await findEvent(body.id);
 if(!event){
 const busy=await busyBetween(start,end);if(busy.length)event=await findEvent(body.id);if(busy.length&&!event){await db.from('consultation_booking_reservations').delete().eq('id',body.id).eq('status','pending');return json({error:'That time was just taken. Please choose another time.'},409)}
 if(!event)event=await insertBooking({...body,start,end,hash});
 }
 if(event.status==='cancelled'||event.organizer?.email!==ORGANIZER||event.extendedProperties?.private?.avantiaContentHash!==hash)throw Error('Event verification failed');
 const {error:saveError}=await db.from('consultation_booking_reservations').update({status:'confirmed'}).eq('id',body.id);if(saveError)throw saveError;
 let link=meetingLink(event);if(!link){const updated=await findEvent(body.id);if(updated)link=meetingLink(updated)}
 return json({ok:true,id:body.id,start,end,meetingUrl:link});
 }catch(error){
 // Unknown network outcomes keep the reservation. A retry with the same ID reads
 // the deterministic Google event instead of sending a second invitation.
 if(error instanceof CalendarFailure && [400,401,403].includes(error.status))await db.from('consultation_booking_reservations').delete().eq('id',body.id).eq('status','pending');
 return json({error:'We couldn’t confirm the booking yet. Keep this page open and retry with the same details; we’ll check before creating another appointment.'},503);
 }
}
