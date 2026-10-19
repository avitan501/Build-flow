# Questionnaire copy cleanup — October 19, 2026

David requested a fresher opening and removal of unnecessary wording throughout the public questionnaire.

- Opening: “Less chasing. More building.” Removed the two introductory paragraphs.
- Section labels remain in step navigation and accessible landmarks, without repeated visible card headings or introductions. Questions lead directly into answers; empty hints render no space.
- Retained one short material-selection hint and the multi-select Done guidance. Removed the duplicate services notice and review subheading. Shortened review, contact, draft and receipt text.
- All approved question/answer choices, consent, purchase limitation, validation, drafts, recap and optional post-submit fields preserved. Original owner questionnaire untouched.

Files: lib/client-questionnaire/form.html, questions.json, styles.css and regenerated HTML/CSS JSON assets.

Verification: existing 10 Chromium/phone WebKit flow tests passed. Desktop1153 and iPhone13 screenshots inspected; no page errors or horizontal overflow. git diff --check passed. This is presentation/copy only; no new tests or database changes.

Status: local preview only, production remains f9c523b19e8bb33bf15d674923e94e91da8cc592. No pushes, deployments or external writes. Preview forwarded at http://localhost:64484/questionnaire. Ready for David’s wording review.
