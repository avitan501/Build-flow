import { ArrowDown, ArrowUpRight, Check, Clock3, Video } from "lucide-react";
import { pageMetadata } from "@/lib/site-metadata";
import { CONSULTATION_BOOKING_URL } from "@/lib/consultation";
import styles from "./consultation.module.css";

export const metadata = pageMetadata({
  title: "Free 15-Minute Consultation | Avantia Construction Concierge",
  description: "Tell us what is taking up your time. Book a free consultation with Avantia to build a plan for your construction material sourcing, orders, deliveries and reorders.",
  path: "/consultation",
});

// Public appointment schedule. Google manages availability, confirmations and Meet links.
const bookingUrl = CONSULTATION_BOOKING_URL;
const embedUrl = `${bookingUrl}?gv=true`;

export default function ConsultationPage() {
  return (
    <section className={styles.page} aria-labelledby="consultation-title">
      <div className={styles.intro}>
        <div className={styles.eyebrow}>Avantia · Construction concierge</div>
        <h1 id="consultation-title">Let’s take the material<br className={styles.desktopBreak} /> work off your plate.</h1>
        <p className={styles.lead}>Supplier calls. Material orders. Last-minute shortages. Let’s find out what’s taking up your time and build a plan around the help you need.</p>
        <a className={styles.jump} href="#choose-time">Schedule a Meeting <ArrowDown size={17} aria-hidden="true" /></a>
      </div>

      <div className={styles.bookingLayout}>
        <aside className={styles.details} aria-label="About your consultation">
          <span className={styles.tag}>Your first step</span>
          <h2>A conversation.<br />A clear next step.</h2>
          <p>Meet with Avantia for a free consultation about your business and current projects.</p>
          <div className={styles.facts}><span><Clock3 size={17} aria-hidden="true" />15 minutes</span><span><Video size={17} aria-hidden="true" />Google Meet</span><span className={styles.free}>Free</span></div>
          <h3>What we’ll cover</h3>
          <ul>{[
            "What takes up your time with materials and suppliers",
            "Which tasks you want Avantia to handle",
            "A practical first step for your project",
          ].map((text) => <li key={text}><Check size={17} aria-hidden="true" /><span>{text}</span></li>)}</ul>
          <p className={styles.prep}>Have a material list or supplier quote? Keep it handy. You can also come with just your questions.</p>
          <div className={styles.hours}><strong>Consultation hours</strong><span>Monday–Thursday · 12–5 PM</span><span>Friday · 12–3 PM</span><small>New York time · 15-minute meetings. Choose from the available times below.</small></div>
        </aside>

        <div className={styles.calendarCard} id="choose-time">
          <div className={styles.calendarHeading}><div><span className={styles.eyebrow}>Free consultation</span><h2>Choose a time that works.</h2></div><span className={styles.step}>15 min</span></div>
          <>
            <iframe className={styles.calendar} src={embedUrl} title="Book your free Avantia consultation" referrerPolicy="strict-origin-when-cross-origin" />
            <a className={styles.fallback} href={bookingUrl} target="_blank" rel="noopener noreferrer">Open booking calendar in a new tab <ArrowUpRight size={16} aria-hidden="true" /></a>
          </>
          <p className={styles.confirmation}>Your booking confirmation includes a Google Meet link and options to manage your appointment.</p>
        </div>
      </div>
    </section>
  );
}
