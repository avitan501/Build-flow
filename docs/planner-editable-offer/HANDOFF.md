# Editable service offer — October 7, 2026

Codex sole publisher. Worktree /root/avantia-planner-editable-offer-20261007, branch codex/planner-editable-offer-20261007, baseline 137ba5a2.

User explicitly chose prices shown on customer flyer. One top Service & fee planning section has editable name, price and description for all four services. Get supplier quotes replaces Compare prices; Order through Avantia replaces Order materials. All descriptions visible immediately; removed tooltip controls. Table headings/check labels and customer preview/print use the same saved offer names/prices/descriptions.

Optional bounded serviceOffers array (four strict objects) added to existing state schema. Older saved states/history use current approved defaults until next user save; no deployment data writes/migration. Existing fees/communicationFee retained as editable Earlier private fee notes, hidden from customers and print. Autosave, conflict handling, history, restore and backups include serviceOffers; original rows/flags preserved.

Checks: 12 browser scenarios across desktop Chromium/mobile WebKit, including offer edits/save/reload/live heading names/customer preview/print, history restores, conflict pauses, merged legacy fields. Three API/store security tests passed. Scoped lint/diff, desktop/phone screenshots inspected; sample flyer one Letter landscape page. Full production webpack build and TypeScript passed.

Pre-release authenticated read: revision102, state SHA256 d2b5c37e75aa62c28669f37ae46285edd436b4f99a654eba2f030bb319fee475. No test business writes or messages. Publication pending existing authorized hook.
