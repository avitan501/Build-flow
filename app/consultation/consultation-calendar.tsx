"use client";

import { ChevronLeft, ChevronRight, ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CONSULTATION_BOOKING_URL } from "@/lib/consultation";
import {
  CONSULTATION_HOURS, CONSULTATION_MAX_OFFSET, consultationDays,
  consultationSlotUrl, consultationTimeLabel, isConsultationWindow,
} from "@/lib/consultation-calendar";
import styles from "./consultation.module.css";

export function ConsultationCalendar({ initialNow }: { initialNow: string }) {
  const [now, setNow] = useState(initialNow);
  const [offset, setOffset] = useState(0);
  const days = consultationDays(new Date(now), offset);
  const [date, setDate] = useState(() => consultationDays(new Date(initialNow)).find((day) => day.canChoose)?.date ?? "");
  const selected = days.find((day) => day.date === date);
  const [booking, setBooking] = useState<{ date: string; hour: number; label: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const pickerHeading = useRef<HTMLHeadingElement>(null);
  const needsPickerFocus = useRef(false);

  useEffect(() => {
    const refresh = () => { if (!document.hidden) setNow(new Date().toISOString()); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (booking) formHeading.current?.focus();
    else if (needsPickerFocus.current) {
      pickerHeading.current?.focus();
      needsPickerFocus.current = false;
    }
  }, [booking]);

  function changeWindow(nextOffset: number) {
    const current = new Date();
    setNow(current.toISOString());
    setOffset(nextOffset);
    setDate(consultationDays(current, nextOffset).find((day) => day.canChoose)?.date ?? "");
  }

  function chooseTime(hour: number) {
    const current = new Date();
    setNow(current.toISOString());
    if (!selected || !isConsultationWindow(date, hour, current)) return;
    setLoaded(false);
    setBooking({ date, hour, label: selected.label });
  }

  if (booking) {
    const url = consultationSlotUrl(booking.date, booking.hour);
    return (
      <div className={styles.booking}>
        <button className={styles.back} onClick={() => { needsPickerFocus.current = true; setBooking(null); setNow(new Date().toISOString()); }}>
          <ArrowLeft size={16} aria-hidden="true" />Change day or time
        </button>
        <h2 ref={formHeading} tabIndex={-1} className={styles.formTitle}>Finish your booking</h2>
        <p className={styles.selection}>{booking.label} · {consultationTimeLabel(booking.hour)} · New York</p>
        {!loaded && <p className={styles.loading} role="status">Opening Google booking…</p>}
        <iframe key={url} className={styles.bookingFrame}
          src={consultationSlotUrl(booking.date, booking.hour, true)}
          title="Confirm your Avantia strategy meeting with Google"
          referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoaded(true)} />
        <a className={styles.fallback} href={url} target="_blank" rel="noopener noreferrer">Having trouble? Open booking in a new tab <ExternalLink size={13} aria-hidden="true" /></a>
        <details className={styles.afterBooking}>
          <summary>I’ve completed my booking</summary>
          <div className={styles.preparation}>
            <div><h2>Want us to prepare?</h2><p>Share your material needs before we meet. This is optional.</p></div>
            <a className={styles.questionnaireLink} href="/questionnaire" target="_blank" rel="noopener noreferrer">Share your material needs <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
        </details>
      </div>
    );
  }

  const formatRange = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div className={styles.calendarCard}>
      <div className={styles.calendarHeading}>
        <h2 ref={pickerHeading} tabIndex={-1}>Choose a day</h2>
        <span className={styles.timezone}>New York time (ET)</span>
      </div>
      <div className={styles.range}>
        <button disabled={offset === 0} onClick={() => changeWindow(offset - 14)} aria-label="Previous 2 weeks"><ChevronLeft size={18} /></button>
        <span aria-live="polite">{formatRange(days[0].date)} – {formatRange(days[13].date)}</span>
        <button disabled={offset >= CONSULTATION_MAX_OFFSET} onClick={() => changeWindow(offset + 14)} aria-label="Next 2 weeks"><ChevronRight size={18} /></button>
      </div>
      <div className={styles.days} aria-label="14 days">
        {days.map((day) => <button key={day.date} type="button" disabled={!day.canChoose}
          aria-label={`${day.label}${day.canChoose ? "" : ", unavailable"}`}
          aria-pressed={day.date === date} className={styles.day} onClick={() => setDate(day.date)}>
          <span>{day.weekday}</span><strong>{day.day}</strong>
        </button>)}
      </div>
      <div className={styles.timesSection}>
        <h3>{selected ? "Choose a time" : "Choose another day"}</h3>
        {selected && <p className={styles.dateLabel}>{selected.label}</p>}
        {selected ? <div className={styles.times}>
          {CONSULTATION_HOURS.map((hour) => {
            const enabled = isConsultationWindow(date, hour, new Date(now));
            return <button key={hour} type="button" disabled={!enabled} className={styles.time} onClick={() => chooseTime(hour)}
              aria-label={`${consultationTimeLabel(hour)}${enabled ? "" : ", unavailable"}`}>
              <strong>{consultationTimeLabel(hour)}</strong>{!enabled && <span>Unavailable</span>}
            </button>;
          })}
        </div> : <p className={styles.dateLabel}>Pick a day above or view the next two weeks.</p>}
        <p className={styles.note}>Times reflect our booking hours. Google confirms availability when you select a time.</p>
      </div>
      <noscript><a href={`${CONSULTATION_BOOKING_URL}?hl=en&ctz=America%2FNew_York`}>Open the booking calendar</a></noscript>
    </div>
  );
}
