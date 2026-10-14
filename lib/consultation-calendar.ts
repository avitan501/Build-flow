import { CONSULTATION_BOOKING_URL } from "./consultation";

export const CONSULTATION_TIME_ZONE = "America/New_York";
export const CONSULTATION_HOURS = [12, 13, 14, 15, 16] as const;
export const CONSULTATION_NOTICE_HOURS = 4;
export const CONSULTATION_MAX_OFFSET = 42;

// Actual recurring windows in the business Google appointment schedule.
// Booking hours only, NOT a live free/busy feed. Google rechecks the selected
// time before opening its form and again when the visitor books.
// Keep in sync with Google; closed windows must not be sold as bookings.
export const CONSULTATION_WEEKLY_HOURS: Record<number, readonly number[]> = {
  0: [], 1: [12, 14, 15, 16], 2: [12, 13, 14, 16],
  3: [12, 13, 15], 4: [12, 14, 16], 5: [12, 14, 16], 6: [],
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CONSULTATION_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});

export function newYorkDate(now: Date) {
  const parts = dateFormatter.formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function newYorkStart(date: string, hour: number) {
  // Noon is safely after DST changes; never hardcode UTC-4 or UTC-5.
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: CONSULTATION_TIME_ZONE, timeZoneName: "longOffset",
  }).formatToParts(new Date(`${date}T12:00:00Z`))
    .find((part) => part.type === "timeZoneName")!.value.replace("GMT", "");
  return new Date(`${date}T${String(hour).padStart(2, "0")}:00:00${offset}`);
}

export function isConsultationWindow(date: string, hour: number, now: Date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return CONSULTATION_WEEKLY_HOURS[weekday].includes(hour)
    && newYorkStart(date, hour).getTime() >= now.getTime() + CONSULTATION_NOTICE_HOURS * 3600000;
}

export function consultationDays(now: Date, offset = 0) {
  const first = addCalendarDays(newYorkDate(now), Math.max(0, Math.min(CONSULTATION_MAX_OFFSET, offset)));
  return Array.from({ length: 14 }, (_, index) => {
    const date = addCalendarDays(first, index);
    const value = new Date(`${date}T12:00:00Z`);
    return {
      date, day: String(value.getUTCDate()),
      weekday: value.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      label: value.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
      canChoose: CONSULTATION_HOURS.some((hour) => isConsultationWindow(date, hour, now)),
    };
  });
}

export function consultationSlotUrl(date: string, hour: number, embed = false) {
  const [year, month, day] = date.split("-").map(Number);
  const url = new URL(`${CONSULTATION_BOOKING_URL}/${year}/${month}/${day}`);
  url.searchParams.set("hl", "en");
  url.searchParams.set("ctz", CONSULTATION_TIME_ZONE);
  url.searchParams.set("slotStartTime", String(newYorkStart(date, hour).getTime()));
  url.searchParams.set("slotDurationMinutes", "15");
  if (embed) url.searchParams.set("gv", "true");
  return url.toString();
}

export function consultationTimeLabel(hour: number) {
  return `${hour === 12 ? 12 : hour - 12}:00 PM`;
}
