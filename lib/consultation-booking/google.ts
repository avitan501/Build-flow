import { createHash } from 'node:crypto';
export const ORGANIZER = 'buildavantiap@gmail.com';
const API = 'https://www.googleapis.com/calendar/v3';
export type CalendarEvent = { id: string; status?: string; hangoutLink?: string; organizer?: {email?:string}; extendedProperties?: {private?:Record<string,string>}; conferenceData?: {entryPoints?:{entryPointType:string;uri:string}[]} };
export class CalendarFailure extends Error { constructor(public status:number){super('Calendar unavailable')} }
export const eventId = (id:string) => 'av'+createHash('sha256').update(id).digest('hex');
let cached:{token:string;until:number}|undefined;
export async function accessToken(){
 if(cached && cached.until>Date.now()) return cached.token;
 const client_id=process.env.AVANTIA_BOOKING_GOOGLE_CLIENT_ID, client_secret=process.env.AVANTIA_BOOKING_GOOGLE_CLIENT_SECRET,refresh_token=process.env.AVANTIA_BOOKING_GOOGLE_REFRESH_TOKEN;
 if(!client_id||!client_secret||!refresh_token)throw new CalendarFailure(503);
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id,client_secret,refresh_token,grant_type:'refresh_token'}),cache:'no-store',signal:AbortSignal.timeout(12000)});
 const data=await r.json();if(!r.ok||!data.access_token)throw new CalendarFailure(503);
 const verify=await fetch(`${API}/calendars/primary?fields=id`,{headers:{Authorization:`Bearer ${data.access_token}`},cache:'no-store',signal:AbortSignal.timeout(12000)});
 const cal=await verify.json();if(!verify.ok||cal.id!==ORGANIZER)throw new CalendarFailure(503);
 cached={token:data.access_token,until:Date.now()+Math.min(data.expires_in||300,3000)*1000};return cached.token;
}
async function request(path:string,init:RequestInit={}){
 const token=await accessToken();return fetch(API+path,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...init.headers},cache:'no-store',signal:AbortSignal.timeout(18000)});
}
export async function busyBetween(start:string,end:string){
 const r=await request('/freeBusy',{method:'POST',body:JSON.stringify({timeMin:start,timeMax:end,items:[{id:ORGANIZER}]})});
 const data=await r.json();const cal=data.calendars?.[ORGANIZER];if(!r.ok||!cal||cal.errors?.length)throw new CalendarFailure(503);return cal.busy as {start:string;end:string}[];
}
export async function findEvent(id:string):Promise<CalendarEvent|null>{const r=await request(`/calendars/primary/events/${eventId(id)}`);if(r.status===404)return null;if(!r.ok)throw new CalendarFailure(r.status);return r.json()}
export function meetingLink(event:CalendarEvent){const link=event.hangoutLink||event.conferenceData?.entryPoints?.find(e=>e.entryPointType==='video')?.uri;if(!link)return null;try{return new URL(link).protocol==='https:'&&new URL(link).hostname==='meet.google.com'?link:null}catch{return null}}
export async function insertBooking(input:{id:string;start:string;end:string;name:string;email:string;hash:string}){
 const r=await request('/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',{method:'POST',body:JSON.stringify({
 id:eventId(input.id),summary:'Avantia — Free 15-Minute Strategy Meeting',
 description:'A 15-minute meeting to review your material needs, supplier quotes, approved orders and deliveries. Optional preparation: https://avantiabuild.com/questionnaire',
 start:{dateTime:input.start,timeZone:'America/New_York'},end:{dateTime:input.end,timeZone:'America/New_York'},attendees:[{email:input.email,displayName:input.name}],
 guestsCanInviteOthers:false,extendedProperties:{private:{avantiaBookingId:input.id,avantiaContentHash:input.hash}},
 conferenceData:{createRequest:{requestId:input.id,conferenceSolutionKey:{type:'hangoutsMeet'}}}
 })});
 if(r.status===409){const existing=await findEvent(input.id);if(existing)return existing;}
 if(!r.ok)throw new CalendarFailure(r.status);return r.json() as Promise<CalendarEvent>;
}
