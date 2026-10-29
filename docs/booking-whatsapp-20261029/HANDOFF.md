# WhatsApp throughout booking — October 29, 2026

User requested WhatsApp5169398484 on each booking screen. Codex sole editor/publisher; isolated codex/booking-whatsapp-20261029 from live31f3d09e.

Added a persistent secondary contact row after the calendar component in app/consultation/page.tsx, with existing WhatsApp brand icon, visible formatted number and https://wa.me/15169398484. Opens a separate tab (noopener/noreferrer), preserving booking state. Styling in consultation.module.css matches the approved cream/green palette, wraps on small screens and has44px minimum touch height. Booking APIs and logic unchanged.

Verification: checked exactly one correct WhatsApp link/icon/new-tab target in calendar, details and mocked confirmation on desktop Chromium and phone WebKit; no horizontal overflow. Phone screenshot inspected; screenshots here use synthetic mocked confirmation, no actual booking or messages. ESLint and diff checks passed. Full production build/release pending; final release evidence will be recorded in the master context.
