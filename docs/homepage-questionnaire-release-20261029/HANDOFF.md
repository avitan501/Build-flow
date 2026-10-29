# Homepage and questionnaire release — October 29, 2026

Explicit user authorization: deploy the approved changes. Codex sole editor/publisher in isolated codex/homepage-questionnaire-release-20261029, based on verified live and both remote mains 44481f3ed726f08f6b2d8be63af6fec8582db020.

Integrated approved questionnaire runtime/tests from adbcc182: remove project-type step, narrowed material choices, split flooring/doors, dumpster services, optional details, compact quick-tap cards/illustrations/count, three-step flow, legacy draft migration. Existing saved answers, submission API/email, consent/review and optional post-submit location retained. No changes to Google Calendar booking configuration; inspected form has only first name, last name and email.

Implemented approved homepage mockup in real React components: clearer material-shopping invitation, Book a Free 15-Minute Meeting CTA preserving /consultation, three-point meeting overview below hero, cream Why Avantia/footer with readable navy text and existing animated navy logo. Existing contacts/policies, hero images, chat and booking functionality retained.

Verification: 20 API/email/deployment-guard unit tests;18 Chromium/WebKit questionnaire browser cases; desktop/phone homepage, footer color, booking navigation, questionnaire start and no-overflow checks. Screenshots inspected. ESLint/diff checks pass. Initial local Turbopack rejected external node_modules symlink; restarted local preview with webpack, all browser tests rerun and passed. Full webpack production build pending at handoff creation.

Target authenticated: existing Vercel project/team and canonical avantiabuild.com domain; approved Avantia primary production hook U8IJX9nbyf/main. Prior latest deployment READY; no competing release observed. No real submissions, appointments, emails or database mutations.
