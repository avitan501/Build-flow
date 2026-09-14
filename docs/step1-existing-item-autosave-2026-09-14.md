# Step 1 existing-item autosave

Maya; isolated `codex/original-source-cas-20260914`, follow-up to `3e45e03f`.

## Scope and behavior

- Existing original and reviewed organized item dialogs debounce valid edits, serialize requests and advance the acknowledged original snapshot or organized revision after each save.
- Opening does not persist inferred/default values. Missing quantities/units remain missing; incomplete numeric text is never coerced to zero. Incomplete drafts stay visible and unsaved.
- Conflicts stop the queue, retain text and do not retry on more typing. Ordinary network failures offer explicit Retry.
- Done flushes valid pending edits. Incomplete/error drafts block closing. An explicit confirmed discard is available without claiming to undo already-saved edits.
- Browser Back first resolves the open edit dialog. A capture-phase stable layout listener prevents Next's router from dropping the dialog before dirty-state handling. Link navigation flushes mounted queues and unload warns while dirty.
- Add item remains a single explicit creation. Organize with AI remains explicit, following acknowledged valid edits; no supplier/customer messages are sent.
- Original edit acknowledgement uses the exact CAS-applied patch, not a later read that could accidentally acknowledge somebody else's edit. Existing locked RPC remains the persistence boundary; no new migration.

## Verification

Actual React fixtures cover original and organized versions, incomplete draft preservation, serialization, conflict stop, close flush, link/unload protection, explicit discard, browser Back, explicit Add and AI ordering. Compiled Next preview checks cover original-only and mixed lists at 390/1440 pixels and browser Back on Chromium and WebKit. Preview POSTs are blocked; synthetic action fixtures do not write production data.

Screenshots: `/tmp/item-autosave-dialog-original-390-chromium-desktop.png` and corresponding original/mixed, 390/1440, Chromium/WebKit files. Screenshots show the actual compiled preview editor with automatic-save status and Done rather than Save changes.

## Release limits

This is Step 1 existing-item editing, not site-wide autosave. Root owns integration, combined production build, deployment and authenticated live browser-to-database verification. No production changes, external messages or paid AI requests performed by this task.
