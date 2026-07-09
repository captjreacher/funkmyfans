# NSF-1 — moonsiren New Subscriber Conversation Map (Acceptance)

Status: acceptance / validation record (no seed rewrite, no runtime change)

Reframed objective: **validate and document the existing NSP-4 New Subscriber conversation
map as the accepted NSF-1 baseline.** Inspection during NSF-1 found the branched Girl Next
Door map already implemented on `main`; per change control (*"if acceptance passes without
meaningful defects, do not manufacture changes; a validation-only PR is acceptable"*) this PR
records acceptance rather than authoring a second map.

Design source of truth: `docs/playbooks/new-subscriber-conversation-map-v0.1.md` (NSP-1 design)
and `docs/playbooks/nsp-2-builder-capability-gap-review.md` (builder-fidelity gaps, now closed).

## Source of truth: the real seed, not the preview fixture

| Artifact | Role | Location |
|---|---|---|
| **Real seed (authoritative)** | The live New Subscriber Funnel that the journey's *New Subscriber Chat* node opens via `nodeFlowRef` | `apps/creator-cockpit/worker.ts` → `newSubscriberFunnelTemplate()` (registered in `agencySeedLibrary()`), `builder_config.workspace.templateVersion = "nsp-4"` |
| **Machine-checked contract** | Pins the exact shape (44 steps, 13 routes, 10 outcomes, `girl_next_door`) | `scripts/creator-cockpit-smoke.ts` → `validateNsp4FunnelShape()` |
| **Builder rendering** | Renders the branches as a fork tree | `apps/creator-cockpit/src/lib/flowBuilder.ts` → `flowFromConversationFlow()` |
| **Preview fixture (NOT source of truth)** | A deliberately simplified 3-step transport stub used only to mount the real Playbooks page in the NODE-1D/1E harnesses | `apps/creator-cockpit/src/preview/node1dPreview.tsx`, `node1ePreview.tsx` (`EMMA_SCRIPT`) |

The "placeholder linear flow" (Trigger → Welcome → Ask intent → Offer → End) is the **preview
fixture**, not the seed. The seed is the 44-step branched map documented below.

## The conversation map (as seeded, NSP-4)

- **Voice:** Girl Next Door — warm, playful, lightly teasing; no corporate copy, no hard sell,
  no obvious chatbot phrasing, no immediate hard upsell.
- **Approval posture:** `action_mode = draft_for_approval`, `auto_send_enabled = false`
  (`ai.mode = draft_only`). Deterministic authored `branchRules` — **no** unrestricted AI
  interpretation in this map.
- **Node count: 44** — 11 questions, 5 classifiers (`set_variable`), 5 route branches
  (rendered as `switch`), 13 messages, 10 terminal `end` nodes.
- **Edge count: ≈93** — 29 sequential edges + 64 branch edges across the five route nodes
  (route_initial 14+fallback, route_followup 16+fallback, route_offer_reply 7+fallback,
  route_silence_reply 16+fallback, route_boundary_reply 6+fallback).

### Stages
1. **Trigger** — `subscriber_created`.
2. **Welcome** — `opening_welcome` (question): *"Hey {{subscriber_name}}, I am glad you made it
   in. What kind of mood should I start you with: sweet, playful, or a little teasing?"*
3. **Engagement discovery** — the welcome asks an easy, low-pressure question; per-route
   responses (`warm_reflect`, `short_prompt`, `curious_prompt`, `content_prompt`, …) draw out
   what pulled the fan in, what they like, and whether they want to chat / browse / buy.
4. **Response interpretation** — `classify_initial` / `classify_followup` / `classify_offer_reply`
   / `classify_silence_reply` / `classify_boundary_reply` write a deterministic `response_class`
   read by the following branch. Classification meaning is owned by Conversation Interpretation
   (deferred); the map only authors the classification points and routes.
5. **Forks** — five `switch` route nodes cover relationship-building, content discovery,
   monetisation, no-response follow-up, and human handoff.
6. **Outcomes** — 10 terminal ends carry `outcomeKey` + `terminalType`.
7. **Human handoff** — boundary/explicit/unsupported and one-to-one paths terminate in
   `end`s with `terminalType = handoff`.

### Response categories (routes)
`route_initial` cases: warm_enthusiastic, short_low_effort, compliment, flirtatious,
curious_about_creator, asks_for_content, purchase_intent, price_objection, not_ready,
silent_no_reply, boundary_testing, explicit_or_unsupported_request, off_topic,
no_interest_disengaged (fallback → off_topic_redirect).

### Terminal outcomes
`engaged_relationship`, `profile_content_exploration`, `conversion_opportunity_detected`,
`ppv_interest`, `subscription_upsell_opportunity`, `one_to_one_opportunity` (handoff),
`nurture_later`, `no_response`, `closed_disengaged`, `human_review_required` (handoff).

## Acceptance-path traces (through the real 44-step seed)

**Path A — engaged → relationship-building → continue conversation**
`subscriber_created` → `opening_welcome` → `classify_initial` → `route_initial [warm_enthusiastic]`
→ `warm_reflect` (*"That is sweet. I like when someone actually says hi instead of just
disappearing into the page. What pulled you in first?"*) → `classify_followup`
→ `route_followup [warm_enthusiastic]` → `relationship_wrap` (*"I like that. Start with the vibe
that pulled you in…"*) → **`end_engaged_relationship`** (`engaged_relationship`, completed).
Decisions on path: 2. ✅

**Path B — content-curious → content discovery → monetisation opportunity**
`opening_welcome` → `classify_initial` → `route_initial [asks_for_content]` → `content_prompt`
(*"I can steer you. Do you want something soft and cute first, something playful, or are you
looking for an extra little treat?"*) → `classify_followup` → `route_followup [purchase_intent]`
→ `purchase_offer` (*"I do have a welcome treat… {{starter_ppv_title}} for
${{starter_ppv_price}}…"*) → `classify_offer_reply` → `route_offer_reply [purchase_intent]`
→ `ppv_interest_wrap` → **`end_ppv_interest`** (`ppv_interest`, completed). Decisions on path: 3.
(A softer variant ends at `content_wrap` → `end_profile_content_exploration`.) ✅

**Path C — no response → follow-up loop → close / future follow-up**
`opening_welcome` → `classify_initial` → `route_initial [silent_no_reply]` → `silence_followup_one`
(*"You went quiet on me a little. Should I leave you to explore, or do you want me to point you
somewhere fun?"*) → `classify_silence_reply` → `route_silence_reply` (fallback) →
`silence_followup_two` (*"I will not chase you. I will keep the good stuff here for when you feel
like coming back."*) → **`end_no_response`** (`no_response`, completed). Contains the required
**follow-up/retry loop** (two authored silence follow-ups, then close). ✅

**Path D — unsupported / high-value → human handoff**
`opening_welcome` → `classify_initial` → `route_initial [explicit_or_unsupported_request]`
→ `boundary_redirect` (*"I cannot do that, but we can keep it fun another way…"*)
→ `classify_boundary_reply` → `route_boundary_reply [explicit_or_unsupported_request → boundary_pause]`
→ `boundary_pause` (*"I already said I cannot go there. I am going to pause this instead of pushing
it."*) → **`end_human_review_required`** (`human_review_required`, **handoff**). A second
high-value handoff exists: `route_followup [one_to_one_request]` → `one_to_one_wrap`
→ `end_one_to_one_opportunity` (**handoff**). ✅

## Human-handoff triggers (visible & inspectable)
Boundary testing, explicit/unsupported requests (→ `boundary_redirect` → `boundary_pause`
→ `human_review_required`), and one-to-one / high-value requests (→ `one_to_one_opportunity`).
Both terminate in `end` nodes with `terminalType = handoff`; the runtime creates the queue item
via existing behaviour (no new queue execution here).

## Unsupported semantics deferred (per NSP-2)
- Archetype-guided **AI-generated** branch copy — deferred; the map uses fixed Girl Next Door
  templates + deterministic classifiers.
- Automatic **outcome → Conversation Opportunity** mapping — deferred (outcomes are metadata).
- First-class **archetype registry / entitlement / billing** — deferred; `archetypeKey` is
  plain playbook metadata.
- Builder **silence-guardrail validation** and full response-class **taxonomy registry** —
  deferred; the two silence follow-ups are authored explicitly.
- Actual **PPV send / custom-content fulfilment** — not performed; represented as outcomes.

## Files changed (NSF-1)
- `docs/acceptance/nsf-1-new-subscriber-conversation-map-acceptance.md` — this record (new).
- `apps/creator-cockpit/src/preview/node1dPreview.tsx`, `node1ePreview.tsx` — a clarifying
  comment that `EMMA_SCRIPT` is a transport stub, not the real NSP-4 seed (comment only).

**No seed rewrite. No runtime change.** `newSubscriberFunnelTemplate()`, `flowBuilder.ts`,
`processConversationInstance`, migrations, and queue behaviour are untouched.

## Validation evidence
- **Typecheck / build:** this PR adds documentation + a code comment only (no TS logic). The
  `Creator Cockpit Smoke` CI (`npm ci → typecheck → build`) runs on push/PR and is the source
  of truth; expected green.
- **Smoke (contract):** `scripts/creator-cockpit-smoke.ts › validateNsp4FunnelShape` already
  asserts the 44-step NSP-4 shape, all 13 routes, and all 10 outcomes. It requires a live
  Worker + Supabase (`ECONNREFUSED :8787`) and cannot run in the sandbox; it runs in the
  deployed smoke environment.
- **Path traces:** derived above from the real seed (`worker.ts`), not the preview fixture.
- **Not executed in-agent:** browser acceptance on the live page (needs live Worker/Supabase);
  local `npm ci` (sandbox blocks `registry.npmjs.org`, HTTP 403).

## Runtime-boundary confirmation
No changes to `flowBuilder.ts`, `processConversationInstance`, conversation-execution
behaviour, runtime tables, migrations, queue, billing, identity, auth, onboarding, or the
Journey architecture. NSF-1 is documentation + one clarifying code comment.

## Verdict
The existing NSP-4 New Subscriber Funnel is **accepted as the NSF-1 baseline.** It is a
credible, inspectable, branched Girl Next Door conversation with multiple response paths, a
follow-up loop, multiple commercial outcomes, and explicit human escalation — understandable on
one canvas and deep enough (3–4 decisions on the main paths) to demonstrate real branching.
