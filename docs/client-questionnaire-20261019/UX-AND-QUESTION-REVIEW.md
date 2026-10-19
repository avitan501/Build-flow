# Client questionnaire — questions and UI/UX review

Reviewed the current preview on 2026-10-19. Application version `ed1969bd`; current HEAD before this audit was documentation-only `5f32a20a`. Review only: no form, backend, production or service changes.

## Recommendation

Keep the practical service choices, the plain inline layout and editable summaries. Improve the decision flow before adding questions. The strongest version is a short request builder: choose materials, choose help, choose delivery approach, review and send. Client details belong near sending; location stays after submission, as David explicitly requested. HVAC is excluded. Keep the roofing wording David liked.

Do not restart the design or add gamification. Clients should feel progress because the questions are relevant and their final recap is useful.

## Fix first

1. **Keep multi-select answers open until Done.** Currently each click immediately hides all remaining choices. Three services need three choice clicks plus two reopen clicks. Single-choice answers can compact immediately; multi-select should compact once after the user finishes. When compacting, move keyboard focus to the visible Change control. Browser testing found focus left inside the hidden fieldset.
2. **Use the right selection type.** Delivery is currently checkboxes, allowing stages and everything together simultaneously. Use radio buttons. Make “No major time spent” exclusive of problem selections. Project type says choose the closest match but also uses checkboxes; either use one choice or explicitly say select all relevant project types. Move “Planning a future project” out of project type because it describes stage, not project type; defer stage/timing to follow-up if keeping the initial path short.
3. **Remove the duplicated service question for clients who already answered material-level services.** Retain the approved “How can we make your next order easier?” as a fallback for people who choose Other, do not know the material category, or skip the detailed service choices. Build the review recap from their actual material-level selections. Currently the short recap reads only the repeated general help answer; specific services appear only in the long answer dump.
4. **Reduce reading and whitespace, not legibility.** The first name field starts below the visible opening screen at both tested sizes. Shorten the hero to a title and one useful sentence, reduce repeated section/introduction text, and bring the first decision into view. Follow-up text currently measures 12px; do not shrink it further. Use readable 14–16px labels with compact layout and forgiving clickable label areas. Keep the primary next action easy to reach on mobile without covering inputs.
5. **Complete the promised after-submit location step.** The success screen has no location input. Show “Request received” first, then optionally “What town or ZIP is the project in?” with Skip. Saving it should enrich the same response, not require resubmitting or creating a duplicate. The existing request must remain received if this extra step is skipped or fails.

## Question-by-question recommendations

| Area | Recommendation | Suggested answer coverage |
| --- | --- | --- |
| Project | Keep the project-type question short. Move contact fields to the final sending step so the first interaction is an easy choice. | New build; renovation; kitchen/bath; addition; commercial; Other. “Planning” is stage, not type. |
| Materials | Keep current six groups and Other. Add an explicit “Help me choose” so uncertainty does not require typing. | Foundations/concrete can be one additional category if included in the service offering; it is not necessary for this UI pass. No HVAC. |
| Lumber source | “How should we get your lumber list?” | I’ll provide it; Contact my framer; Prepare a takeoff from my plans; Help me get started; Other. This matches the actions better than a yes/no prompt. |
| Lumber services | Keep “What would you like us to handle for your lumber order?” and the multi-select approach. | Approved framer list; comparable quotes; approved order/delivery; order follow-up/reorders. “Confirm orders with my framer” overlaps with obtaining the approved list: make the distinction clear or combine. |
| Windows / doors source | “Where should we get your window and door details?” Include doors consistently. | Plans/window schedule; I have a list or supplier quote; My installer/supplier has the details; I need help getting started; Other. Avoid implying a homeowner must personally measure. |
| Windows / doors services | Keep one service question; do not restore a separate yes/no installer question. | Compare supplier quotes; coordinate size/spec confirmation; arrange approved order; delivery/replacement follow-up. “Get quotes from plans” and “Compare supplier quotes” can be one concise action unless the distinction matters operationally. |
| Roofing / siding | Preserve the wording and sequence David explicitly likes. | No need to force it into the same two-question structure just for symmetry. Keep its existing uncertainty and contact-preference choices. |
| Plumbing / electrical source | Add the missing “I already have a list” choice. Existing source question is good. | I have a list; My plumber/electrician; Plans; Help clarify what I need to buy; Other. Plumbing versus electrical can be clarified during follow-up or with a small optional scope choice. |
| Plumbing / electrical services | Keep approved product, quote and purchase coordination. | Clarify what the trade supplies; compare quotes; confirm products; arrange purchases; follow up/reorder. |
| Drywall / insulation source | Name the items instead of generic “types and quantities.” | “How should we get your drywall/insulation list?” — I have it; My installer; Plans/takeoff; Help me get started; Other. |
| Drywall / insulation services | Keep concrete actions. | Confirm list with installer; compare complete quotes; arrange approved order/delivery; follow up/reorder. Consider combining separate order and delivery options to reduce repetition. |
| Interiors source | “How should we get your finish selections?” | I have a list; My designer; I’m still choosing; Help complete my list; Other. The present yes/no prompt mixes status and actions. |
| Interiors scope | Explain the broad label with a short hint rather than another mandatory question. | Flooring/tile, cabinets/counters, doors/trim, paint. Collect exact products during follow-up. |
| Time spent | Keep David’s “What takes up most of your time when buying materials?” Make it optional or one main answer. | Current tasks are useful. Make the no-problem choice exclusive; do not require pain before allowing someone to request help. |
| General help | Keep the approved positive wording, but use it as a fallback. | Avoid asking clients to reselect the same services they already chose per material. |
| Delivery | “How would you like to receive your materials?” is appropriate. Use one selection. | In stages; Everything in one delivery; Help me plan; Other. “Everything together” and “as soon as possible” are different decisions: avoid combining delivery pattern with urgency. |
| Timing | Gather first-needed timing after submission alongside location, or during the follow-up conversation. | Needed soon; planned date; still planning. Keep it out of the minimum path if speed is the priority. |
| Review | Show a concise, editable request recap instead of repeating every question plus a second summary. | Selected materials, chosen services for each, delivery preference, contact. Keep detailed answers available under an expandable section. |
| After submission | Confirm receipt before asking any extra questions. | Optional town/ZIP and first-needed timing. Plans upload, full address, budget and trade contact details can wait for follow-up. |

## Recommended flow

1. **Your project:** project type, then materials; no long introduction.
2. **Your help:** relevant short follow-ups under selected materials. Show one expanded material group at a time while keeping completed groups as summaries. Do not use the rejected one-question carousel. Expand Other only when chosen. Provide a visible “Not sure / help me decide” path.
3. **Review and send:** delivery preference, concise service recap, name plus a clear email-or-phone requirement, consent, send. Only ask general services if specifics are missing.
4. **After submission:** receipt, optional town/ZIP and first-needed timing with Skip. No HVAC.

The exact step count is less important than not duplicating work. A short introduction and logical grouping should achieve more than making controls smaller.

## Other UI/UX findings

- Contact labels currently mark both email and phone optional, while one is mandatory. Show one group label such as “How can we reach you? Email or phone required.”
- Validation occurs only at final submission. Missing required contact information sends the client back to the first step. Validate when leaving the contact step and show the error beside the relevant input. Preserve draft values.
- “5 priorities added” counts core questions rather than priorities and ignores 13 possible follow-ups. Use plain step progress or clearly explained completion; avoid suggesting five taps equals completing the detailed form.
- A single selected material should not make unrelated choices shift far down the page. Desktop two-column category cells share row height: the expanded left card leaves unused space under its right-hand neighbour. Use stable rows with one inline expanded group spanning the appropriate width.
- “Change,” “Add / change,” and “Done” repeat without an accessible question-specific name. Add accessible labels and manage focus when fields hide.
- Smooth success scrolling should respect reduced-motion preference. Keep a visible confirmation and focus its heading after submission.
- Keep the positive headline and native controls. Do not add countdowns, forced celebration or unsupported savings claims. The useful outcome is a clear request and next step, not a generated technical specification.
- Keep pricing and purchase approval expectations concise. Selecting a trade-coordination preference must not automatically trigger outreach.
- “About 3 minutes” is currently a target, not a measured result. Time a realistic run before publishing that estimate. All six categories expose 13 follow-ups in addition to five core questions and four contact fields.

## Reproduced evidence

Ran isolated Chromium desktop (1153×669) and WebKit iPhone-sized contexts against the existing local server. Used fictitious local contact data. Submission was intercepted and returned a fake confirmation; no production or preview database writes, no user session reset.

- First input top: approximately763px desktop and859px phone, below both tested initial viewports.
- Step2 section with no category expanded: approximately1199px desktop /1972px phone.
- All six categories selected, with one follow-up already compacted: approximately2064px desktop /4462px phone. This illustrates scrolling burden, not a timing benchmark.
- Follow-up text12px; clickable row height26px desktop /32px touch. Compactness is achieved partly by shrinking text and controls.
- Selecting the first multi-select service immediately hides the other service choices; keyboard focus remains on an input within a hidden fieldset in both browsers.
- Both staged and all-at-once delivery options can be checked and appear together in the outgoing form payload.
- “Comparing prices” and “No major time spent” can be checked together and appear together in the outgoing form payload.
- Short recap shows only general service priorities, omitting the selected per-material service from that short recap (it remains in the detailed summary).
- Success screen has zero input fields; the agreed post-submit location step is absent.
- No horizontal overflow detected at either tested size.

Evidence: `ux-review/observations.json`; opening, lumber, review and success screenshots for both sizes in `ux-review/`.

## Implementation references

- `lib/client-questionnaire/form.html:43` — all top-level questions rendered as checkboxes, including conflicting delivery choices.
- `lib/client-questionnaire/form.html:49` — collapse hides focused fieldset; summary lacks focus handoff.
- `lib/client-questionnaire/form.html:51` — multi-select closes immediately after each choice.
- `lib/client-questionnaire/form.html:61` — contact comes first and email/phone individually labelled optional.
- `lib/client-questionnaire/form.html:62` — recap uses general priorities rather than composing actual material services; long detailed summary follows.
- `lib/client-questionnaire/form.html:63` — validation deferred to submit, shared error rather than inline field errors.
- `lib/client-questionnaire/form.html:17` — no post-submit enrichment inputs.
- `lib/client-questionnaire/styles.css` — accumulated rules from rejected layout iterations; simplify after a design direction is accepted, retaining readable type and stable hit areas.

UI checklist consulted: [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Recommendations above primarily derive from this questionnaire’s observed behavior and David’s stated preferences. No completion rate, conversion lift or customer preference has been measured.
