import { z } from 'zod';
import { addCalendarDays, isConsultationWindow, newYorkDate } from '@/lib/consultation-calendar';
export const bookingSchema=z.object({id:z.string().uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),hour:z.number().int().min(12).max(16),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),website:z.literal('').default('')}).strict();
export function validSlot(date:string,hour:number,now=new Date()){
 const d=new Date(`${date}T12:00:00Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==date)return false;
 return date>=newYorkDate(now)&&date<=addCalendarDays(newYorkDate(now),55)&&isConsultationWindow(date,hour,now);
}
