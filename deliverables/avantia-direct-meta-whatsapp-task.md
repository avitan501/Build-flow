# Avantia Build — Direct Meta WhatsApp Integration

Saved from David's implementation request on 2026-09-06.

## Canonical existing Meta setup

- Business portfolio: `Avantia build`
- Business portfolio ID: `1588837966224485`
- WhatsApp Business Account ID: `1609047970612779`
- Business phone: `+1 516-990-1990`
- Phone Number ID: `1266268263238386`
- Meta app: `Avantia Build Communications`
- App ID: `2874339416276903`
- App dashboard: <https://developers.facebook.com/apps/2874339416276903/dashboard/?business_id=1588837966224485>

Reuse these records. Do not create duplicate apps, portfolios, WhatsApp accounts, or number registrations.

## Existing website

- Production: <https://build.avantiap.com>
- Aura: <https://build.avantiap.com/owner/aura>
- Secure connection: <https://build.avantiap.com/owner/aura/connect>
- Production repository: `AV-Design-and-Build-Org/avantia-build`
- Vercel project reported in the original request: `avantia-build`
- Vercel project independently verified for production on 2026-09-06: `build-flow-wfl3` (`prj_9YPQLnJQT8ud6NHQOCkGYBYZQTjE`)
- Production Supabase project ref: `nprfhspwdflpqlopydmp` (the dashboard name `avantia-build-preview` is misleading)

## Objective

Connect the phone ending `1990` directly through Meta WhatsApp Cloud API so David and authorized employee Carlos can read and answer customer WhatsApp messages inside the existing Avantia website.

## Constraints

- Verify live state before changing it.
- Use secure 1Password autofill for Facebook login and never expose secrets.
- Pause for CAPTCHA, MFA, identity confirmation, verification documents, or payment approval.
- Store credentials only through the existing encrypted credential system; never put Meta credentials in 2Chat fields.
- Preserve Q U O calls/SMS, other numbers, communications history, and unrelated features.
- Do not delete existing accounts or registrations.
- Do not create another website, repository, Vercel project, Meta app, portfolio, WABA, or phone registration.
- Do not modify database tables or run migrations without David's approval.
- Honor WhatsApp's customer-service window, templates, consent, idempotency, signature validation, and message/status subscriptions.
- Do not claim completion until a real inbound message and a real outbound reply both pass end to end.

## Required handoff evidence

- Correct business, app, WABA, and phone IDs
- Meta verification and publishing status
- Website connection status
- Deployment ID and production commit if deployed
- Inbound and outbound live-test results
- Remaining limitations or blockers
