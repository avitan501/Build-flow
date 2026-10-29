"use client";

import { ChevronLeft, ChevronRight, ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CONSULTATION_HOURS, CONSULTATION_MAX_OFFSET, consultationDays,
  consultationTimeLabel, isConsultationWindow,
} from "@/lib/consultation-calendar";
import styles from "./consultation.module.css";

export function ConsultationCalendar({ initialNow }: { initialNow: string }) {
  const [now, setNow] = useState(initialNow);
  const [offset, setOffset] = useState(0);
  const days = consultationDays(new Date(now), offset);
  const [date, setDate] = useState(() => consultationDays(new Date(initialNow)).find((day) => day.canChoose)?.date ?? "");
  const selected = days.find((day) => day.date === date);
  const [booking, setBooking] = useState<{ date: string; hour: number; label: string } | null>(null);
  const [hours, setHours] = useState<number[]>([]);
  const [availability, setAvailability] = useState("loading");
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requestId, setRequestId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [confirmed, setConfirmed] = useState<{meetingUrl: string | null} | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/consultation/availability?date=${date}`, {signal:controller.signal, cache:"no-store"})
      .then(async response => { if (!response.ok) throw Error(); return response.json(); })
      .then(result => { setHours(result.hours); setAvailability("ready"); })
      .catch(() => { if (!controller.signal.aborted) setAvailability("error"); });
    return () => controller.abort();
  }, [date, refresh, now]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!booking || submitting) return;
    setSubmitting(true); setError(""); setUncertain(true);
    try {
      const response = await fetch("/api/consultation/book", {method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:requestId,date:booking.date,hour:booking.hour,name,email,website:new FormData(event.currentTarget).get("website") || ""})});
      const result = await response.json();
      if (!response.ok) {
        setUncertain(response.status >= 500);
        throw Error(result.error || "Please try again.");
      }
      setConfirmed({meetingUrl:result.meetingUrl}); setUncertain(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "We couldn’t confirm your booking. Please retry with the same details.");
    } finally { setSubmitting(false); }
  }
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
    setAvailability("loading"); setHours([]);
    setDate(consultationDays(current, nextOffset).find((day) => day.canChoose)?.date ?? "");
  }

  function chooseTime(hour: number) {
    const current = new Date();
    setNow(current.toISOString());
    if (!selected || !isConsultationWindow(date, hour, current)) return;
    if (!hours.includes(hour)) return;
    setRequestId(crypto.randomUUID()); setError(""); setConfirmed(null); setUncertain(false);
    setBooking({ date, hour, label: selected.label });
  }

  if (booking) {
    return (
      <div className={styles.booking}>
        {!confirmed && <button disabled={submitting || uncertain} className={styles.back} onClick={() => { needsPickerFocus.current = true; setBooking(null); setAvailability("loading"); setRefresh(value => value + 1); }}>
          <ArrowLeft size={16} aria-hidden="true" />Change day or time
        </button>}
        <h2 ref={formHeading} tabIndex={-1} className={styles.formTitle}>{confirmed ? "You’re booked." : "Your details"}</h2>
        <p className={styles.selection}>{booking.label} · {consultationTimeLabel(booking.hour)} · New York time · 15 minutes</p>
        {!confirmed ? <form className={styles.nativeForm} onSubmit={submit}>
          <label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} disabled={submitting || uncertain} onChange={event => setName(event.target.value)} /></label>
          <label>Email<input aria-label="Email" aria-describedby="booking-email-help" name="email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={submitting || uncertain} onChange={event => setEmail(event.target.value)} /><span id="booking-email-help">For your calendar invitation and Google Meet link.</span></label>
          <div className={styles.honeypot} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button className={styles.confirmButton} disabled={submitting} type="submit">{submitting ? "Confirming…" : uncertain ? "Check my booking" : "Confirm free meeting"}</button>
          <p className={styles.note}>Free · 15 minutes · No account needed</p>
        </form> : <>
          <p className={styles.success} role="status">Your meeting is saved. Google Calendar will send an invitation to {email}.</p>
          {confirmed.meetingUrl && <a className={styles.questionnaireLink} href={confirmed.meetingUrl} target="_blank" rel="noopener noreferrer">Your Google Meet link <ExternalLink size={14} aria-hidden="true" /></a>}
          <div className={styles.preparation}>
            <div><h2>Help us prepare <span>Optional</span></h2><p>Tell us which materials you need help with.</p></div>
            <a className={styles.questionnaireLink} href="/questionnaire">Share your material needs <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
        </>}
      </div>
    );
  }

  const formatRange = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div className={styles.calendarCard}>
      <div className={styles.datePanel}>
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
          aria-pressed={day.date === date} className={styles.day} onClick={() => { setAvailability("loading"); setHours([]); setDate(day.date); setRefresh(value => value + 1); }}>
          <span>{day.weekday}</span><strong>{day.day}</strong>
        </button>)}
      </div>
      </div>
      <div className={styles.timesSection}>
        <h3>{selected ? "Choose a time" : "Choose another day"}</h3>
        {selected && <p className={styles.dateLabel}>{selected.label}</p>}
        {selected ? <div className={styles.times}>
          {CONSULTATION_HOURS.map((hour) => {
            const enabled = availability === "ready" && hours.includes(hour) && isConsultationWindow(date, hour, new Date(now));
            return <button key={hour} type="button" disabled={!enabled} className={styles.time} onClick={() => chooseTime(hour)}
              aria-label={`${consultationTimeLabel(hour)}${enabled ? "" : ", unavailable"}`}>
              <strong>{consultationTimeLabel(hour)}</strong>{!enabled && <span>{availability === "loading" ? "Checking…" : "Unavailable"}</span>}
            </button>;
          })}
        </div> : <p className={styles.dateLabel}>Pick a day above or view the next two weeks.</p>}
        {availability === "error" && <p className={styles.error} role="alert">We couldn’t check available times. <button onClick={() => { setAvailability("loading"); setRefresh(value => value + 1); }}>Try again</button></p>}
        {availability === "ready" && hours.length === 0 && <p className={styles.note}>No times left on this day. Please choose another day.</p>}
        <p className={styles.note}>Times are checked against our calendar.</p>
      </div>
      <noscript>Please enable JavaScript to view appointment times.</noscript>
    </div>
  );
}
