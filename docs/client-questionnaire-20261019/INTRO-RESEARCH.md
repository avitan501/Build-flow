# Questionnaire introduction decision — October 19, 2026

David authorized independent online research and implementation, without repeated wording approval questions. Scope is the current introduction, not a new release or questionnaire redesign.

## Applied copy

Small label directly above the headline, left-aligned: YOUR MATERIALS CONCIERGE

Headline: Let’s plan your material purchases.

Supporting sentence: Answer a few questions so we can help with material lists, compare supplier quotes, and coordinate your approved orders and deliveries.

## Evidence and judgment

- [Nielsen Norman Group](https://www.nngroup.com/articles/homepage-design-principles/) recommends communicating what the company does using a concise, scannable tagline and concrete examples. Applied here as clear material-purchasing language; a slogan alone was insufficient.
- [Typeform survey introduction guidance](https://www.typeform.com/blog/survey-introduction-tips) recommends explaining the purpose and keeping introductions brief. The sentence explicitly tells visitors to answer questions and explains the resulting help.
- [GOV.UK question-page guidance](https://design-system.service.gov.uk/patterns/question-pages/) limits hints to useful information and avoids asking for information twice. Retained the previous removal of repeated introductions; no broader navigation changes based solely on generic guidance.
- [Carter Lumber](https://www.carterlumber.com/builder-services/outside-sales) uses concierge to describe personal service involving estimates, ordering and delivery scheduling. This supports concierge as a service descriptor in this industry; it does not establish Avantia staffing or guarantees.
- [Timberlake Building Center](https://www.timberlakebuildingcenter.com/) explains procurement support through sharing project needs, sourcing and supplier coordination. That task-level language fits the earlier Avantia17-department prototype.
- [HyperQuote](https://www.hyperquote.net/) describes supplier pricing and delivery coordination concretely. [Agate & Oak](https://www.agateandoak.com/) positions concierge around luxury global sourcing; that luxury positioning is not appropriate evidence for Avantia promises.

Decision: retain the headline David liked. After David questioned the top-right position, move the concierge label out of the masthead and directly above the headline; the service label, invitation and explanation now form one left-aligned block. Explain concierge with practical tasks, and retain client approval of orders. No claims of handling everything, guaranteed savings, delivery certainty, dedicated staffing or an unmeasured completion time. This is an editorial judgment informed by sources, not an A/B-tested conversion improvement.

## Verification and state

Changed form.html and regenerated form.html.json only. Desktop1153 Chromium, iPhone13 WebKit and narrow320 Chromium checked; current label and copy asserted after dev recompilation, screenshots inspected, no horizontal overflow. Intro still hides after step one; no page errors. git diff --check passed. No functional changes; prior10 flow cases remain applicable. First desktop capture was stale during dev recompilation, so final snapshots/assertions were rerun against updated content.

Preview only; production remains f9c523b1. No push, deployment, database writes or messages. Local preview http://localhost:64484/questionnaire.

Placement revision: desktop Chromium and iPhone WebKit checked with screenshots, no overflow, label present inside hero and hides with intro after step one; diff check passed. Preview only.
