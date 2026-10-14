import { expect, test } from '@playwright/test';
import { addCalendarDays, consultationDays, consultationSlotUrl, consultationTimeLabel, CONSULTATION_WEEKLY_HOURS, isConsultationWindow, newYorkDate, newYorkStart } from '@/lib/consultation-calendar';

test('14 consecutive days start from New York today, including weekends and month changes', () => {
  const now = new Date('2026-11-01T02:00:00Z');
  expect(newYorkDate(now)).toBe('2026-10-31');
  const days = consultationDays(now);
  expect(days).toHaveLength(14);
  expect(days[0].date).toBe('2026-10-31');
  expect(days[13].date).toBe('2026-11-13');
  expect(days.filter(day => /Sat|Sun/.test(day.weekday)).every(day => !day.canChoose)).toBe(true);
  expect(consultationDays(now, 14)[0].date).toBe('2026-11-14');
  expect(consultationDays(now, -14)[0].date).toBe('2026-10-31');
  expect(consultationDays(now, 100)[0].date).toBe(addCalendarDays('2026-10-31', 42));
});

test('New York times keep the local hour through both daylight saving changes', () => {
  expect(newYorkStart('2026-10-30', 16).toISOString()).toBe('2026-10-30T20:00:00.000Z');
  expect(newYorkStart('2026-11-02', 16).toISOString()).toBe('2026-11-02T21:00:00.000Z');
  expect(newYorkStart('2026-03-06', 12).toISOString()).toBe('2026-03-06T17:00:00.000Z');
  expect(newYorkStart('2026-03-09', 12).toISOString()).toBe('2026-03-09T16:00:00.000Z');
});

test('genuine recurring blocks leave about 30 percent closed; notice and weekends are respected', () => {
  const count = Object.values(CONSULTATION_WEEKLY_HOURS).reduce((sum, hours) => sum + hours.length, 0);
  expect((25 - count) / 25).toBe(.32);
  expect(isConsultationWindow('2026-10-16', 16, new Date('2026-10-16T16:00:00Z'))).toBe(true);
  expect(isConsultationWindow('2026-10-16', 16, new Date('2026-10-16T16:01:00Z'))).toBe(false);
  expect(isConsultationWindow('2026-10-17', 12, new Date('2026-10-15'))).toBe(false);
  expect(isConsultationWindow('2026-10-21', 14, new Date('2026-10-15'))).toBe(false);
});

test('booking keeps the business Google schedule, selected 15-minute slot, English and New York', () => {
  const url = new URL(consultationSlotUrl('2026-11-02', 16, true));
  expect(url.hostname).toBe('calendar.google.com');
  expect(url.pathname).toContain('AcZssZ37unU4FOaHd0UDjU3GI4WM4-swkF3hW_f9KTf5Bztx-ZeJO60Rq_5POmlv9oAv0ElWVP-JRqkV/2026/11/2');
  expect(url.searchParams.get('slotStartTime')).toBe(String(Date.parse('2026-11-02T21:00:00Z')));
  expect(url.searchParams.get('slotDurationMinutes')).toBe('15');
  expect(url.searchParams.get('ctz')).toBe('America/New_York');
  expect(url.searchParams.get('hl')).toBe('en');
  expect(url.searchParams.get('gv')).toBe('true');
  expect([12,13,14,15,16].map(consultationTimeLabel)).toEqual(['12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM']);
});
