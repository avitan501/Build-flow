# Homepage services preview — October 29

Preview only; user approval needed before publication. Sole editor Codex, branch codex/homepage-services-preview-20261029, based on live f6e3a288.

Replaces Three ways with five services. Revised at user request into compact cream cards: five across desktop, photo rows on phones. Delivery and sourcing images now show actual corresponding activities from existing assets. Shorter copy, smaller heading, clear links to existing quote/request/consultation/shop pages. Delivery availability explicitly checked rather than promised. Hero and WhatsApp preserved.

Verified Chromium desktop and WebKit iPhone: five cards, images loaded, correct destinations, no horizontal overflow. Visually reviewed both screenshots. Targeted ESLint and git diff --check passed. No deployment, data writes or messages. Preview server port3172; app mapped URL localhost:54620/#ways-we-help.

## Eight-card revision
User approved compact styling and requested three additional services in two rows of four. Added Material lists & takeoffs, Reorders & missing items, and Dumpster service. All link to existing request-quote form. New local dumpster SVG illustration. Desktop screenshot confirms aligned four-column rows; phone remains compact photo rows. Eight-card image/link/overflow browser checks and targeted lint passed. Preview only, no release authorized.

## Mobile booking bar preview
Added mobile-only bottom booking/WhatsApp bar after hero CTA scrolls above viewport. Restores normal contact launcher when returning to hero; hides duplicate launcher while bar visible. Safe-area padding, accessible labels, 48px targets. Desktop unchanged. Browser verified appearance/disappearance, links, hidden duplicate, desktop exclusion; ESLint/diff check passed. Screenshot mobile-booking-bar.png. No publishing or messages.

## Phone hero clarification
User meant top hero photo, not service cards. Changed only mobile cream overlay to vertical transition with visible photo at top, cream beneath copy; mobile content lower with responsive padding. Desktop overlay/layout preserved. Hero phone screenshot visually reviewed, no horizontal overflow; targeted lint passed. Video removal not performed (earlier was a recommendation, clarification focused on photo). Preview only.

## Media simplification preview after live5c9ef4ec
Removed the entire duplicate consultation/video section and its player state. Primary hero now begins with delivery photo; mobile hero photo/content area shortened (24svh top spacing, natural height). Eight cards and booking bar retained. Dumpster illustration replaced with generated photographic-style asset dumpster-service-v2.png (illustrative, not claimed as actual Avantia job). Source generated via imagegen; local file retained. Phone hero visual reviewed, no video element; desktop/phone eight-card links/images/overflow and booking-bar regression passed, ESLint/diff passed. Preview only, not published.

Footer follow-up: WhatsApp icon now alongside telephone number on the same row (mobile email above; desktop all inline). Existing separate telephone and WhatsApp destinations retained. Removed redundant Why Avantia section. Preview only; targeted lint and phone/desktop row alignment/no overflow checks.
