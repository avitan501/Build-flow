# Avantia OpenClaw jobs

This service exposes one signed HTTPS job endpoint for the owner-only website tools. It accepts only `find_leads` and `find_suppliers`, validates an HMAC signature, rejects replayed requests, and rate-limits work. The website never receives OpenClaw or OAuth credentials.

The primary route uses OpenClaw's configured DuckDuckGo search and the existing `openai-codex` OAuth profile to structure source-backed results. If Codex OAuth is unavailable or fewer than ten useful results are found, the website may show an explicit Exa fallback. Exa is never called by this service.

Deployment uses a root-readable systemd encrypted credential and a dedicated Tailscale Funnel listener. No lead is saved and nobody is contacted by this service.
