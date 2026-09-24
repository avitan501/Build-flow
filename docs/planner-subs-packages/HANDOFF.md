# Planner service/outcome separation — 2026-09-24

Codex sole implementer/publisher, branch codex/planner-subs-packages-20260924, isolated /root/avantia-planner-subs-packages-20260924, parent 2f01a2b4.

- Surveys moved by stable id3 to an Additional services / packages section at bottom of editing and customer flyer. Stored row order unchanged; surveys remain editable.
- Order at website price. uses requested wording. Subcontractor check explains estimated material cost.
- Talk to your subs column: get material lists and clarify shortages. Independent of purchasing/reorders; editable checkbox plus private fee. New choices start unselected; no inferred changes to saved services.
- With David’s follow-up approval, replaces redundant solution choices with editable What this takes off your plate outcome text. Short department-specific suggestions until edited; custom empty text respected. Original solution text and selected options remain in expandable reference and saved state/history.
- Optional outcome/communicateWithSubs row fields and communicationFee field. Old seven service/fee arrays preserved. No DB migration or production data writes. Existing autosave/history/revision gates retained.

Verification: 10 Chromium/mobile WebKit tests passed including independent communication/fee save and reload, old IDs/arrays preserved, surveys moved visually but not stored order, outcome edits included in preview, restore/conflict safeguards. Three API/store security tests passed; scoped lint/diff pass. Desktop/phone/preview screenshots inspected; customer flyer remains one US Letter landscape page. Final webpack production build and TypeScript passed.

Publication pending. Existing authorized hook only. No customer/supplier messages or test business writes. Shared owner browser previously signed out; authenticated live verification depends on owner session availability.
