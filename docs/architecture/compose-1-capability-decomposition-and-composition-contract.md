# COMPOSE-1 — Capability Decomposition and Composition Contract

Status: **Proposed** (documentation-only; architecture/decomposition sprint)
Series: COMPOSE (sprint 1 of 6)
Base: `main` @ `f342051` (Merge PR #32 — reconcile-node-journey-foundation; NODE-1A→1F)
Scope: analysis + contract definition only. **No runtime change, no seed change, no migration.**

> The goal is **not** to make the 44-step flow prettier. The goal is to discover the
> repeatable mechanics that let us build one canonical Instagram → OnlyFans journey,
> then every standard chat-event automation, without rebuilding the same interpretation
> and commercial logic inside every Node Flow.

---

## 0. Executive summary

The existing **NSP-4 New Subscriber Funnel** (`apps/creator-cockpit/worker.ts` →
`newSubscriberFunnelTemplate()`, lines 4270–4393) is a single 44-step deterministic
conversation tree that **inlines** eight concerns that the accepted architecture already
assigns to distinct bounded contexts: channel/event entry, identity/relationship context,
interpretation, opportunity/decision, the bounded conversational work itself, outcome
emission, human escalation, and runtime routing machinery.

The decisive finding: **the target operating model already exists as an approved
bounded-context map.** `docs/conversation-operations-platform-bounded-contexts.md`
(lines 61–83) already wires:

```
HOST Event Model ─▶ Conversation Interpretation ─▶ Conversation ─▶ Queue Management
                              └────────────────────▶ Conversation Opportunity ─▶ Queue
Subscriber Profile ─▶ Conversation
```

which is exactly the COMPOSE target:

```
EVENT → IDENTITY / RELATIONSHIP CONTEXT → INTERPRETATION → OPPORTUNITY / DECISION
      → CAPABILITY → OUTCOME / NEXT EVENT   (with Queue / Human on intervention)
```

COMPOSE is therefore **not new architecture**. It is the operating-pattern reset that
NSP-5 (`docs/playbooks/nsp-5-new-subscriber-operating-model-reset.md`, "design only")
already proposed, made concrete at the level of the real 44 steps and hardened into a
Composition Contract.

**Decision gate result: YES (with four additive additions).** FunkMyFans *can* represent
journeys as repeatable compositions of reusable capabilities using the Journey → Node →
Node Flow layer already built (NODE-1A→1F), **provided** COMPOSE-2 adds: (1) a reusable
**capability reference + registry** distinct from a concrete `nodeFlowRef`; (2) **one
canonical interpretation signal set** (two already exist and must be unified, not tripled);
(3) a standard **capability context IO contract** (what a capability consumes and emits);
and (4) an **outcome → canonical Opportunity mapping**. All four are additive (types +
registry + a reference journey); none require a runtime or migration change. Details in §9.

---

## 1. NSP-4 44-step inventory

Source of truth: `apps/creator-cockpit/worker.ts` `newSubscriberFunnelTemplate()`
(steps array lines 4340–4390), with step factories `nspQuestion` / `nspMessage` /
`nspClassify` / `nspBranch` / `nspEnd` (lines 4454–4515). Trigger: `subscriber_created`
(line 4319). `ai.mode = draft_only`, `approval.mode = always_approve`,
`workspace.templateVersion = "nsp-4"`, `archetypeKey = "girl_next_door"`.

**Type/kind legend:** `question`=`ask_question` (waits for a fan reply); `message`=`send_message`;
`set_variable`=classifier (writes a response-class variable); `branch`=switch on a variable;
`end`=terminal outcome. The **branch cases** are three shared route tables:
`routeCases` (14 cases, on `response_class`), `followUpCases` (16 cases, on `next_response_class`),
`offerCases` (7 cases, on `next_response_class`), plus one inline 6-case table on the boundary route.

> The **event** (`subscriber_created`) is not a step — it is `triggerEventType` metadata.
> There is **no explicit Event node and no Identity/Relationship node** in the 44-step array;
> relationship context is injected by the runtime, not authored as a step (see §3, finding EV/ID-0).

| # | Step id | Label | Type/kind | Purpose / authored copy (abridged) | Incoming source(s) | Outgoing destination(s) |
|---|---|---|---|---|---|---|
| 1 | `opening_welcome` | Opening Welcome | question | Welcome + open tone; "…sweet, playful, or a little teasing?" | trigger `subscriber_created` | → `classify_initial` |
| 2 | `classify_initial` | Classify Initial Reply | set_variable | Classify reply → `response_class` (token `__classify_nsp_response__`) | `opening_welcome` | → `route_initial` |
| 3 | `route_initial` | Route Initial Response | branch | Switch on `response_class` | `classify_initial` | 14 `routeCases` → warm_reflect/short_prompt/compliment_prompt/flirt_prompt/curious_prompt/content_prompt/purchase_offer/price_response/not_ready_response/silence_followup_one/boundary_redirect(×2)/off_topic_redirect/closed_message; **fallback** → `off_topic_redirect` |
| 4 | `warm_reflect` | Warm Response | question | Reflect warmth; "What pulled you in first?" | `route_initial`[warm_enthusiastic] | → `classify_followup` |
| 5 | `short_prompt` | Low-Effort Rescue | question | Rescue low effort; "look around, flirt, or find something extra?" | `route_initial`[short_low_effort] | → `classify_followup` |
| 6 | `compliment_prompt` | Compliment Response | question | Accept compliment; "what caught your eye first." | `route_initial`[compliment] | → `classify_followup` |
| 7 | `flirt_prompt` | Flirt Response | question | Flirt; "sweet flirting or being teased a little?" | `route_initial`[flirtatious] | → `classify_followup` |
| 8 | `curious_prompt` | Curious About Creator | question | Self-description + "What kind of attention do you like?" | `route_initial`[curious_about_creator] | → `classify_followup` |
| 9 | `content_prompt` | Content Discovery | question | Steer content; "soft and cute, playful, or an extra treat?" | `route_initial`[asks_for_content] | → `classify_followup` |
| 10 | `off_topic_redirect` | Fallback Redirect | question | Redirect off-topic; "chat, browse, or find something extra?" | `route_initial`[off_topic] + fallback | → `classify_followup` |
| 11 | `classify_followup` | Classify Follow-up Reply | set_variable | Classify → `next_response_class` (token `__classify_nsp_response__`) | steps 4–10 | → `route_followup` |
| 12 | `route_followup` | Route Follow-up Response | branch | Switch on `next_response_class` | `classify_followup` | 16 `followUpCases` → relationship_wrap(×4)/subscription_wrap/content_wrap/purchase_offer/one_to_one_wrap/price_response/not_ready_response/boundary_redirect(×2)/low_effort_exit/off_topic_exit/silence_followup_two/closed_message; **fallback** → `off_topic_exit` |
| 13 | `purchase_offer` | Soft Purchase Offer | question | Offer welcome PPV ("{{starter_ppv_title}} for ${{starter_ppv_price}}", 19) | `route_initial`[purchase_intent], `route_followup`[purchase_intent] | → `classify_offer_reply` |
| 14 | `classify_offer_reply` | Classify Offer Reply | set_variable | Classify → `next_response_class` | `purchase_offer` | → `route_offer_reply` |
| 15 | `route_offer_reply` | Route Offer Reply | branch | Switch on `next_response_class` | `classify_offer_reply` | 7 `offerCases` → ppv_interest_wrap/one_to_one_wrap/price_response/not_ready_response/boundary_redirect(×2)/closed_message; **fallback** → `conversion_wrap` |
| 16 | `relationship_wrap` | Relationship Building | message | Close toward relationship building | `route_followup`[shares_preference/warm_enthusiastic/compliment/flirtatious], `route_boundary_reply`[flirtatious] | → `end_engaged_relationship` |
| 17 | `content_wrap` | Profile / Content Exploration | message | Close toward content exploration | `route_followup`[asks_for_content], `route_boundary_reply`[shares_preference/asks_for_content] | → `end_profile_content_exploration` |
| 18 | `subscription_wrap` | Subscription Value | message | Close toward subscription value | `route_followup`[curious_about_creator] | → `end_subscription_upsell_opportunity` |
| 19 | `conversion_wrap` | Conversion Opportunity | message | Generic conversion close | `route_offer_reply` fallback | → `end_conversion_opportunity_detected` |
| 20 | `ppv_interest_wrap` | PPV Interest | message | Treat as PPV cue | `route_offer_reply`[purchase_intent] | → `end_ppv_interest` |
| 21 | `one_to_one_wrap` | One-to-One Bridge | message | Bridge to custom/1:1 ("may need to check details") | `route_followup`[one_to_one_request], `route_offer_reply`[one_to_one_request] | → `end_one_to_one_opportunity` |
| 22 | `price_response` | Price Objection | message | Soft reply to price objection | `route_initial`/`route_followup`/`route_offer_reply`[price_objection] | → `end_nurture_later` |
| 23 | `not_ready_response` | Not Ready | message | Reassure not-ready | `route_initial`/`route_followup`/`route_offer_reply`[not_ready] | → `end_nurture_later` |
| 24 | `low_effort_exit` | Repeated Low Effort | message | Exit repeated low effort | `route_followup`[short_low_effort] | → `end_closed_disengaged` |
| 25 | `off_topic_exit` | Off-topic Soft Exit | message | Soft exit off-topic | `route_followup`[off_topic] + fallback | → `end_nurture_later` |
| 26 | `silence_followup_one` | First No-response Follow-up | question | First silence nudge | `route_initial`[silent_no_reply] | → `classify_silence_reply` |
| 27 | `classify_silence_reply` | Classify Silence Reply | set_variable | Classify → `next_response_class` | `silence_followup_one` | → `route_silence_reply` |
| 28 | `route_silence_reply` | Route Silence Reply | branch | Switch on `next_response_class` | `classify_silence_reply` | 16 `followUpCases`; **fallback** → `silence_followup_two` |
| 29 | `silence_followup_two` | Second No-response Follow-up | message | Final silence close | `route_silence_reply`[silent_no_reply]+fallback | → `end_no_response` |
| 30 | `boundary_redirect` | Boundary Redirect | question | Safe redirect after boundary/unsupported ask | `route_initial`/`route_followup`/`route_offer_reply`[boundary_testing, explicit_or_unsupported_request] | → `classify_boundary_reply` |
| 31 | `classify_boundary_reply` | Classify Boundary Reply | set_variable | Classify → `next_response_class` | `boundary_redirect` | → `route_boundary_reply` |
| 32 | `route_boundary_reply` | Route Boundary Reply | branch | Switch on `next_response_class` (inline 6-case) | `classify_boundary_reply` | shares_preference→content_wrap, flirtatious→relationship_wrap, asks_for_content→content_wrap, boundary_testing→boundary_pause, explicit_or_unsupported_request→boundary_pause, no_interest_disengaged→closed_message; **fallback** → `boundary_pause` |
| 33 | `boundary_pause` | Human Review Pause | message | Pause instead of pushing | `route_boundary_reply`[boundary_testing/explicit/fallback] | → `end_human_review_required` |
| 34 | `closed_message` | Closed / Disengaged | message | Graceful close | `route_initial`/`route_followup`/`route_offer_reply`/`route_boundary_reply`[no_interest_disengaged] | → `end_closed_disengaged` |
| 35 | `end_engaged_relationship` | Engaged relationship | end (`completed`) | Terminal outcome | `relationship_wrap` | — |
| 36 | `end_profile_content_exploration` | Profile / content exploration | end (`completed`) | Terminal outcome | `content_wrap` | — |
| 37 | `end_conversion_opportunity_detected` | Conversion opportunity detected | end (`completed`) | Terminal outcome | `conversion_wrap` | — |
| 38 | `end_ppv_interest` | PPV interest | end (`completed`) | Terminal outcome | `ppv_interest_wrap` | — |
| 39 | `end_subscription_upsell_opportunity` | Subscription upsell opportunity | end (`completed`) | Terminal outcome | `subscription_wrap` | — |
| 40 | `end_one_to_one_opportunity` | One-to-one opportunity | end (`handoff`) | Terminal outcome (handoff type) | `one_to_one_wrap` | — |
| 41 | `end_nurture_later` | Nurture later | end (`completed`) | Terminal outcome | `price_response`, `not_ready_response`, `off_topic_exit` | — |
| 42 | `end_no_response` | No response | end (`completed`) | Terminal outcome | `silence_followup_two` | — |
| 43 | `end_closed_disengaged` | Closed / disengaged | end (`completed`) | Terminal outcome | `low_effort_exit`, `closed_message` | — |
| 44 | `end_human_review_required` | Human review required | end (`handoff`) | Terminal outcome (handoff type) | `boundary_pause` | — |

Topology: 44 nodes, ~93 directed edges (three shared route tables fan-in heavily: e.g.
`price_response` is reached from three different routes; `boundary_redirect` from six route
cases). This matches the shape pinned by `scripts/creator-cockpit-smoke.ts`
`validateNsp4FunnelShape` and documented in `docs/acceptance/nsf-1-new-subscriber-conversation-map-acceptance.md`.

**Runtime note (critical, verified):** the two `handoff`-typed ends (#40, #44) do **not**
set `queueHandoff`, so the runtime gate `terminalType === "handoff" && metadata.queueHandoff`
(`worker.ts:6742`) is **false for all 10 ends**. NSP-4 therefore creates **no** Queue item and
**no** Conversation Opportunity today; every outcome falls through to `markConversationCompleted`
(`worker.ts:6796`). This is a deliberate scope decision, not a bug
(`docs/playbooks/nsp-2-builder-capability-gap-review.md:340` — "It does not need to create
Opportunities in this sprint.").

---

## 2. Classification and disposition matrix

Rule applied: **primary responsibility = the step's business purpose** (not its runtime kind),
because the same runtime kind (`message`) serves both a conversational turn and an outcome
declaration. Exactly one responsibility per step. Disposition = where that purpose belongs in
the composed model.

**Responsibility codes:** A Event · B Identity/Relationship · C Interpretation ·
D Opportunity/Decision · E Capability · F Outcome/Next Event · G Runtime/Builder plumbing.
**Disposition codes:** KEEP (bounded Node Flow) · JOURNEY (orchestration) · INTERP (Interpretation) ·
OPP (Opportunity/Decision) · EVENT/OUT (Event/Outcome) · PLUMBING (hide as runtime machinery) ·
DUP (redundant/collapses after separation).

| # | Step id | Resp. | Disposition | Target context / capability | Rationale |
|---|---|---|---|---|---|
| 1 | opening_welcome | E | KEEP | Cap: New Subscriber Conversation (opening turn) | Genuine bounded conversational work |
| 2 | classify_initial | C | INTERP | Conversation Interpretation | Meaning of the reply; must be reusable, not inline |
| 3 | route_initial | G | PLUMBING (→JOURNEY/OPP) | Runtime switch | Switch machinery; the *directions* it selects become Journey edges / Opportunity decisions |
| 4 | warm_reflect | E | KEEP (collapse) | Cap: New Subscriber Conversation (follow-up) | One of 7 copy-variants of the single follow-up turn |
| 5 | short_prompt | E | KEEP (collapse) | Cap: New Subscriber Conversation | ″ |
| 6 | compliment_prompt | E | KEEP (collapse) | Cap: New Subscriber Conversation | ″ |
| 7 | flirt_prompt | E | KEEP (collapse) | Cap: New Subscriber Conversation | ″ |
| 8 | curious_prompt | E | KEEP (collapse) | Cap: New Subscriber Conversation | ″ |
| 9 | content_prompt | E | KEEP (collapse) | Cap: New Subscriber Conversation | ″ (content-discovery flavour) |
| 10 | off_topic_redirect | E | KEEP (collapse) | Cap: New Subscriber Conversation | ″ (redirect flavour) |
| 11 | classify_followup | C | INTERP | Conversation Interpretation | Second interpretation point |
| 12 | route_followup | G | PLUMBING (→JOURNEY/OPP) | Runtime switch | Switch machinery |
| 13 | purchase_offer | E | KEEP | **Cap: Make Offer (PPV)** | Distinct bounded commerce capability, reusable |
| 14 | classify_offer_reply | C | INTERP | Conversation Interpretation | Interpretation of offer reply |
| 15 | route_offer_reply | G | PLUMBING (→JOURNEY/OPP) | Runtime switch | Switch machinery |
| 16 | relationship_wrap | F | JOURNEY | Journey direction: engaged relationship | Direction/state, not a distinct capability |
| 17 | content_wrap | F | JOURNEY | Journey direction: content exploration | ″ |
| 18 | subscription_wrap | D | OPP | Opportunity: subscription upsell | Commercial opportunity signal |
| 19 | conversion_wrap | D | OPP | Opportunity: conversion (generic) | Commercial opportunity signal |
| 20 | ppv_interest_wrap | D | OPP | Opportunity: PPV | Commercial opportunity signal |
| 21 | one_to_one_wrap | D | OPP | Opportunity: custom / one-to-one | Commercial opportunity signal (→ handoff) |
| 22 | price_response | E | KEEP | Cap: Make Offer (objection reply) | Bounded objection-handling reply |
| 23 | not_ready_response | E | KEEP | Cap: New Subscriber Conversation (reassure) | Bounded reassurance reply |
| 24 | low_effort_exit | F | JOURNEY | Journey direction: disengaged | Exit direction |
| 25 | off_topic_exit | F | JOURNEY | Journey direction: nurture later | Exit direction |
| 26 | silence_followup_one | E | KEEP | **Cap: Silence Follow-up** | Distinct bounded re-engagement capability |
| 27 | classify_silence_reply | C | INTERP | Conversation Interpretation | Interpretation of the silence reply |
| 28 | route_silence_reply | G | PLUMBING (→JOURNEY/OPP) | Runtime switch | Switch machinery |
| 29 | silence_followup_two | E | KEEP | Cap: Silence Follow-up (2nd nudge) | Bounded re-engagement |
| 30 | boundary_redirect | E | KEEP | **Cap: Boundary / Safety Response** | Distinct bounded safety capability |
| 31 | classify_boundary_reply | C | INTERP | Conversation Interpretation | Interpretation of the boundary reply |
| 32 | route_boundary_reply | G | PLUMBING (→JOURNEY/OPP) | Runtime switch | Switch machinery |
| 33 | boundary_pause | F | EVENT/OUT | Outcome → Queue/Human: human_review_required | Emits a human-handoff request |
| 34 | closed_message | F | JOURNEY | Journey direction: disengaged/closed | Exit direction |
| 35 | end_engaged_relationship | F | JOURNEY | Outcome: engaged_relationship | Terminal direction (`completed`) |
| 36 | end_profile_content_exploration | F | JOURNEY | Outcome: profile_content_exploration | Terminal direction (`completed`) |
| 37 | end_conversion_opportunity_detected | F | OPP | Outcome/Opportunity: conversion | Terminal names an opportunity |
| 38 | end_ppv_interest | F | OPP | Outcome/Opportunity: PPV | Terminal names an opportunity |
| 39 | end_subscription_upsell_opportunity | F | OPP | Outcome/Opportunity: subscription upsell | Terminal names an opportunity |
| 40 | end_one_to_one_opportunity | F | OPP | Outcome/Opportunity: custom/one-to-one (handoff) | Terminal names an opportunity |
| 41 | end_nurture_later | F | JOURNEY | Outcome: nurture_later | Terminal direction (`completed`) |
| 42 | end_no_response | F | EVENT/OUT | Outcome/Next event: no_response | Emits/consumes a re-engagement event |
| 43 | end_closed_disengaged | F | JOURNEY | Outcome: closed_disengaged | Terminal direction (`completed`) |
| 44 | end_human_review_required | F | EVENT/OUT | Outcome → Queue/Human (handoff) | Emits a human-handoff request |

### Classification totals — by architectural responsibility

| Code | Responsibility | Count | Steps |
|---|---|---|---|
| A | Event | **0** | *(none — the event is `triggerEventType`, not a step)* |
| B | Identity / Relationship context | **0** | *(none — injected by runtime, not authored)* |
| C | Interpretation | **5** | 2, 11, 14, 27, 31 |
| D | Opportunity / Decision | **8** | 18, 19, 20, 21, 37, 38, 39, 40 |
| E | Capability | **14** | 1, 4, 5, 6, 7, 8, 9, 10, 13, 22, 23, 26, 29, 30 |
| F | Outcome / Next event | **12** | 16, 17, 24, 25, 33, 34, 35, 36, 41, 42, 43, 44 |
| G | Runtime / Builder plumbing | **5** | 3, 12, 15, 28, 32 |
| | **Total** | **44** | |

**Reading of the totals.** Only **14 of 44 steps (32%)** are genuine bounded capability work
(and those 14 collapse into 4 reusable capabilities — see §6). **18 of 44 (41%)** are
interpretation (5) + routing plumbing (5) + opportunity/decision (8) that the accepted
architecture says belong to *other* contexts and should be **reused, not re-authored** per
flow. **12 of 44 (27%)** are outcome/next-event declarations. The A=0 / B=0 rows are the two
most important findings: the flow has **no explicit event or identity/relationship seam** —
those concerns are implicit in the trigger and in runtime-injected context, so they cannot be
composed or reused today.

### Disposition totals

| Disposition | Count | Steps |
|---|---|---|
| KEEP (bounded Node Flow) | **14** | 1, 4–10, 13, 22, 23, 26, 29, 30 |
| INTERP (Interpretation) | **5** | 2, 11, 14, 27, 31 |
| OPP (Opportunity/Decision) | **8** | 18, 19, 20, 21, 37, 38, 39, 40 |
| JOURNEY (orchestration/direction) | **9** | 16, 17, 24, 25, 34, 35, 36, 41, 43 |
| EVENT/OUT (Event/Outcome) | **3** | 33, 42, 44 |
| PLUMBING (hide runtime machinery) | **5** | 3, 12, 15, 28, 32 |
| DUP (collapses after separation) | **0 primary** | *(structural — see note)* |
| | **44** | |

**Structural duplication (DUP) note.** No single step is dead code, so DUP is 0 as a *primary*
disposition. But the redundancy is real and structural: (a) the **7 first-reply prompts** (#4–#10)
are copy-variants of **one** parameterised follow-up turn; (b) each of the **10 outcomes** is
expressed as a *wrap message + an end node* (~20 steps encode 10 outcomes) — after separation
the wrap line is the conversation's single exit surface and the `end` node is terminal-rendering
machinery. Net: **44 authored steps collapse to ≈9 business-facing composition elements**
(4 capabilities + 1 interpretation service + 1 opportunity-detection service + Journey directions
+ Queue/Human + the event/identity seam). This collapse ratio is the core COMPOSE-1 result.

---

## 3. Cross-cutting findings (verified against code)

**EV/ID-0 — No explicit Event or Identity/Relationship seam in the flow.** The event is
`triggerEventType: "subscriber_created"` metadata (`worker.ts:4319`); routing from `of_events`
to a conversation happens in `runAutomationsForEvent` (`worker.ts:5651`) →
`createConversationInstance` (`worker.ts:5911`), entirely outside the authored graph. Relationship
context is a real, **channel-agnostic inbound seam** — `RelationshipContextProjection`
(`packages/of-types/src/index.ts:88–97`) arrives on the event payload, is normalised by
`normalizeRelationshipContext` (`worker.ts:6934`) and drives `selectOpeningPosture`
(`worker.ts:6961`, → `OpeningPosture` `standard|familiar|warm`). "Hermes" appears only as a
doc/comment placeholder explicitly marked **out of scope** (`worker.ts:4161`,
`docs/conversation-operations-platform-prd.md:991`).

**INT-1 — Interpretation is duplicated and inline.** NSP-4's classifier is a hard-coded regex,
`classifyNewSubscriberReply` (`worker.ts:6985–7003`), dispatched by the magic token
`__classify_nsp_response__` in `resolveRuntimeVariableValue` (`worker.ts:6913–6919`). It emits
the **16 inline response classes**. Separately, a real DB-backed interpretation system exists —
`ConversationIntent` (12 classes, `of-types:159–171`), `OfConversationIntelligence`
(`of-types:370–407`), `heuristicConversationIntelligenceProvider` (`worker.ts:2081–2408`),
migration `20260626020000_conversation_intelligence_engine.sql` — but **the funnel does not use
it.** The "clean canonical response-class taxonomy" is tracked as *missing* across three docs
(`nsp-2-builder-capability-gap-review.md`, `new-subscriber-conversation-map-v0.1.md`,
`nsp-5-...-reset.md:71`). The brief's rule "do not create a second interpretation system" is
already violated — there are **two**; COMPOSE-2 must **unify**, not add a third.

**OPP-1 — Opportunity is fragmented across four vocabularies.** (1) The canonical 34-type
catalogue is **doc-only** (`docs/conversation-opportunity-catalogue-v1.md`, "business source of
truth", no code references it). (2) The runtime table `of_conversation_opportunities`
(migration `20260703000000`) has **unconstrained `text`** columns; `ensureConversationOpportunity`
(`worker.ts:7459`) only ever writes 3 category values — `revenue|operations|relationship`
(`queueOpportunityCategory`, `worker.ts:7362`). (3) `CommercialOpportunityKey` (8 values,
`of-types:107–115`) is a per-*subscriber* commercial scoring field with a DB CHECK on a different
table. (4) `CreatorIntelligenceOpportunityProjection.opportunity_type` is a free string
(`of-types:1119`). COMPOSE must map outcomes to **one** canonical set — not add a fifth.

**QH-1 — The Queue/Human handoff seam is generic and real, but dual-tracked.** Handoff fires only
on `terminalType==="handoff" && metadata.queueHandoff` (`worker.ts:6742`) →
`ensureConversationHandoffQueueItem` (`worker.ts:7512`) → `of_queues`/`of_queue_items`
(status `visible|claimed|assigned|moved|resolved`, migration `20260702000000`) + an
`of_conversation_opportunities` row. The contract (`{outcomeKey, handoffKind, handoffObjective,
reason, terminalType, title}`) is **not NSP-specific** — it is reusable today. A legacy `of_tasks`
inbox still co-exists (`Tasks.tsx`) alongside the canonical `Queue.tsx`.

**CH-1 — Instagram ingestion is absent from the runtime (not embedded).** Entry is hard-coded to
`/api/events/betterfans` (`worker.ts:1563`); `of_creators.platform_provider` enum lacks
`instagram` and onboarding rejects non-BetterFans (`worker.ts:10449`). However `of_events.event_type`
is free `text` (no enum), so the schema *could* accept Instagram events with no migration — every
missing piece is a **producer** (a channel adapter), which is exactly a **Channel node** in the
Journey model. Instagram exists only in docs/preview fixtures, the `JourneyChannelKind` type
(`of-types:1883`), and an `of_revenue_journeys` seed row.

---

## 4. View A — Current implementation map

The real 44-step structure, grouped into its actual phases. This is one monolithic Node Flow
(a single `OfMessageScript`) compiled by `flowFromConversationFlow` (`flowBuilder.ts:139`) and
walked by `processConversationInstance` — all eight concerns interleaved in one graph.

```
            (event: subscriber_created — implicit, not a node)
                              │
  ┌───────────────────────────────────────────────────────────────────────────┐
  │ PHASE 1  Opening + interpret + route                                        │
  │   opening_welcome ─▶ classify_initial ─▶ route_initial ─┐                   │
  └─────────────────────────────────────────────────────────┼──────────────────┘
                                                             │ (14 cases)
  ┌──────────────────────────────────────────────────────────▼─────────────────┐
  │ PHASE 2  First-reply prompts (7 copy-variants of one follow-up turn)         │
  │   warm_reflect · short_prompt · compliment_prompt · flirt_prompt ·           │
  │   curious_prompt · content_prompt · off_topic_redirect                       │
  └───────────────────────────────┬──────────────────────────────────────────────┘
  ┌───────────────────────────────▼──────────────────────────────────────────────┐
  │ PHASE 3  Follow-up interpret + route                                          │
  │   classify_followup ─▶ route_followup ─┐ (16 cases)                            │
  └────────────────────────────────────────┼──────────────────────────────────────┘
  ┌──────────────────┬──────────────────────┼─────────────────┬────────────────────┐
  │ PHASE 4  Offer   │ PHASE 5  Wrap/direction messages         │ PHASE 6 Silence   │
  │ purchase_offer   │ relationship_wrap  content_wrap          │ silence_followup_1│
  │ classify_offer   │ subscription_wrap  conversion_wrap       │ classify_silence  │
  │ route_offer(7)   │ ppv_interest_wrap  one_to_one_wrap       │ route_silence(16) │
  │                  │ price_response     not_ready_response    │ silence_followup_2│
  │                  │ low_effort_exit    off_topic_exit        │                   │
  ├──────────────────┴──────────────────────────────────────────┴───────────────────┤
  │ PHASE 7  Boundary/safety loop        PHASE 8  Closed                              │
  │ boundary_redirect ─▶ classify_boundary ─▶ route_boundary(6) ─▶ boundary_pause     │
  │                                                             closed_message        │
  ├───────────────────────────────────────────────────────────────────────────────┤
  │ PHASE 9  Terminal outcomes (10 end_* nodes)                                       │
  │ engaged_relationship · profile_content_exploration · conversion_opportunity ·     │
  │ ppv_interest · subscription_upsell · one_to_one(handoff) · nurture_later ·         │
  │ no_response · closed_disengaged · human_review_required(handoff)                  │
  └───────────────────────────────────────────────────────────────────────────────┘
```

Interpretation (5), routing (5), opportunity/decision (8) and outcome (12) machinery — **30 of
44 steps** — are woven through every phase. There is no seam at which another journey could reuse
any of it.

---

## 5. View B — Proposed composition map

The same behaviour, re-expressed as the target operating model over the **existing** bounded
contexts and the **existing** Journey → Node → Node Flow layer. Boxes marked *(reusable service)*
are consumed by every journey and are **never** authored inside a Node Flow.

```
  EVENT                     IDENTITY / RELATIONSHIP        INTERPRETATION (reusable service)
  ┌───────────────┐         ┌───────────────────────┐     ┌───────────────────────────────┐
  │ Channel node  │  emits  │ Identity node         │     │ Conversation Interpretation   │
  │ OnlyFans /    ├────────▶│ provisional→canonical │     │ ONE canonical signal set      │
  │ Instagram(new)│ prov.id │ + RelationshipContext │────▶│ (unify 16 response-classes    │
  └───────────────┘         │ (OpeningPosture)      │     │  + 12 ConversationIntent)     │
        │ subscriber_created └───────────┬───────────┘     └───────────────┬───────────────┘
        │                                │ identity+relationship context   │ signals
        ▼                                ▼                                  ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │ CAPABILITY (bounded Node Flows; each exists once, reused by many journeys)             │
  │  C1 New Subscriber Welcome & Discovery   (Conversation, nodeFlowRef → short script)    │
  │  C2 Make Offer (PPV)                      (Process/commerce)                            │
  │  C3 Silence Follow-up                     (Process/conversation)                       │
  │  C4 Boundary / Safety Response            (Process/conversation)                       │
  │  C5 Human Handoff                         (Human)                                      │
  └───────────────┬───────────────────────────────────────────────┬────────────────────────┘
                  │ consumes: event + identity/relationship         │ emits: outcome, next_event,
                  │           + interpretation signals              │        interpretation_input,
                  ▼                                                  ▼        opportunity_signal, handoff
  ┌───────────────────────────────┐        ┌────────────────────────────────────────────────┐
  │ OPPORTUNITY / DECISION         │        │ OUTCOME / NEXT EVENT                            │
  │ (reusable) maps signals+state  │        │ terminal outcomes emit events + opportunities: │
  │ → canonical Conversation       │◀───────│ subscriber_replied · offer_accepted ·          │
  │ Opportunity (PPV, upsell,      │ signal │ no_response · relationship_advanced ·          │
  │ custom, relationship, nurture, │        │ human_review_requested                         │
  │ re-engagement, human review)   │        └───────────────────────┬────────────────────────┘
  └───────────────┬───────────────┘                                 │
                  │ opportunity                                     │ handoff / next event
                  ▼                                                 ▼
  ┌──────────────────────────────────────────────────────────────────────────────────────┐
  │ QUEUE / HUMAN — Queue Management consumes opportunities + handoff payloads (NSP-5 §6)  │
  └──────────────────────────────────────────────────────────────────────────────────────┘

  JOURNEY (the map): Channel ─▶ Identity ─▶ C1 ─▶ (C2 Make Offer) ─▶ (C4 Boundary) ─▶ (C5 Human)
                     directions are Journey connections; steering, not scripting.
```

**What New Subscriber Chat should still own:** the bounded conversation — one welcome, one
interpreted follow-up, at most one bounded rescue (C1). Its Node Flow is a **short** script
(NSP-5 target shape: 5–12 steps), not the 44-step tree.
**What Interpretation should own:** all reply classification, boundary/unsupported detection,
buying-signal detection, silence classification (steps 2, 11, 14, 27, 31 — as a reusable service).
**What Opportunity Detection should own:** PPV / subscription-upsell / custom / relationship /
nurture / re-engagement / human-review detection (steps 18–21, 37–40 — canonical catalogue).
**What belongs at Journey level:** node placement, connections, per-node config, `nodeFlowRef`,
direction selection (the routing *decisions* behind steps 3, 12, 15, 28, 32, and the direction
ends 16, 17, 24, 25, 34, 35, 36, 41, 43).
**What belongs to Queue / Human:** handoff intake + operator continuation (steps 33, 44; end #40).
**What is merely runtime machinery:** the 5 switch nodes and the 10 `end` terminal-rendering nodes
(hidden from the business canvas per ADR-0002's drill-down surface contract).

This View-B journey is the **EMMA example already compiled in types**
(`of-types:2206–2293` `EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE`): `OnlyFans (Channel) → New Subscriber
Chat (Conversation, `nodeFlowRef`→script, outputs `conversation_state` + `latest_interpretation`,
destinations `handoff`/`terminal`) → Human Handoff (Human)`. COMPOSE-1 confirms that example is
the correct target; the missing pieces are the reusable-capability and interpretation/opportunity
seams below.

---

## 6. Composition Contract v0.1

Normative statements (RFC-2119). All grounded in existing `@funkmyfans/of-types` contracts and
ADR-0002; where a statement needs a type that does not yet exist, it is marked **[COMPOSE-2 add]**.

### 6.1 How an Event enters a Journey
- A Journey is entered through a **Channel node** (`JourneyChannelNode`, `class:"channel"`), which
  is the node-level expression of ADR-0001's "channels MUST enter through an event-intake/adapter
  boundary" (ADR-0002 §Channel).
- The Channel node consumes a HOST/`of_events` row (`event_type`) and MUST emit a **provisional,
  transport-scoped identity** via its `config.provisionalIdentityKey` and a contract `output`
  (e.g. `provisional_subscriber_ref`), plus a `destination` naming the event (e.g. `new_subscriber`).
- A Channel node MUST NOT own onboarding or canonical identity (ADR-0002 normative boundary).
- Today `subscriber_created` enters via `runAutomationsForEvent`→`createConversationInstance`
  outside the graph; COMPOSE makes the Channel node the explicit journey entry. New channels
  (Instagram) are **new Channel adapters/producers**, not new engines.

### 6.2 How a Journey invokes a Capability
- A Journey does **not** "invoke" imperatively. A Journey Node **is a placed instance of a bounded
  capability**; control flows along `JourneyNodeConnection`s from a source node's `destination`
  (`from.port`) to a target node.
- Runtime is unchanged: when control reaches a Conversation/Process node, the **existing runtime**
  compiles and executes the referenced Node Flow (`processConversationInstance`); the Journey layer
  adds no execution engine (ADR-0002 §"How the abstraction sits above the runtime").

### 6.3 How a Journey Node references a reusable capability
- **Today:** a node references a concrete implementation via `NodeFlowRef`
  (`{kind:"script", scriptId, scriptVersion?}`, `of-types:1904`). This binds a node to *one script*,
  not to a *reusable capability*.
- **[COMPOSE-2 add]** Introduce a `CapabilityRef` (e.g. `{capabilityKey: string, version?: number}`)
  on `JourneyNodeBase`, resolved through a **Capability Registry** (registry-backed taxonomy —
  consistent with `docs/conversation-operations-platform-bounded-contexts.md:104` "Registry-backed
  taxonomy adapter"). The registry maps `capabilityKey` → the concrete `NodeFlowRef`(s) that
  implement it for a given creator/archetype. `capabilityKey` is the reusable identity; `NodeFlowRef`
  stays the concrete realisation. This is the single addition that turns "a node points at a script"
  into "a node instantiates a reusable capability."

### 6.4 Relationship: Journey Node ↔ Capability ↔ nodeFlowRef ↔ Node Flow ↔ Runtime

| Concept | Definition | Type / location | Owner |
|---|---|---|---|
| **Journey Node** | A placed instance of a bounded capability in one journey; owns node-local state + declared IO contract | `JourneyNode` (`of-types:2030`) | Playbook Studio |
| **Capability** | The reusable *definition* of one bounded piece of work (exists once, reused in many journeys) | **[COMPOSE-2 add]** registry entry keyed by `capabilityKey` | Playbook Studio / Template Library |
| **nodeFlowRef** | The reference from a node to the *concrete implementation* of its capability | `NodeFlowRef` (`of-types:1904`) | Playbook Studio (points into Template Library) |
| **Node Flow** | The internal process realising the capability (for Conversation = an `OfMessageScript`'s steps) | `of_message_scripts` (existing) | Template Library / Script |
| **Runtime** | Compiles + walks the Node Flow, unchanged | `flowBuilder.ts` + `processConversationInstance` | Conversation runtime (HOST) |

Rule: **`capabilityKey` : Capability :: `nodeFlowRef` : Node Flow.** One Capability MAY have
different `nodeFlowRef` realisations per creator/archetype; the Journey references the Capability,
the runtime executes the realisation.

### 6.5 How a Capability CONSUMES context
A capability declares its needs as `JourneyNodeContract.inputs` (`of-types:1911`). The four
canonical context inputs, mapped to existing carriers:

| Context input | Canonical carrier (existing) | Injection point today |
|---|---|---|
| Event context | `of_events` row / event payload | `createConversationInstance(input.eventPayload)` (`worker.ts:5911`) |
| Identity context | canonical Subscriber (Subscriber Profile) + provisional id from Channel | resolved upstream; conversation keyed to subscriber |
| Relationship (Hermes) context | `RelationshipContextProjection` (`of-types:88`) | `normalizeRelationshipContext` → conversation variables (`worker.ts:6934`) |
| Interpretation signals | `OfConversationIntelligence` / `current_intent` (`of-types:385`) **[unify with response-class]** | *(today: inline regex; must become the shared service)* |
| Opportunity context | `ConversationOpportunity` (`of-types:654`) | `of_conversation_opportunities` (read) |

A capability MUST declare which of these it requires (`input.required`); node-local state MUST NOT
be read by another node except through a declared output consumed as a declared input
(ADR-0002 §Node Contract).

### 6.6 How a Capability EMITS
A capability declares emissions as `JourneyNodeContract.outputs` (`of-types:1919`) and
`destinations` (`of-types:1926`). The five canonical emissions, mapped to existing mechanisms:

| Emission | Canonical mechanism (existing) | Evidence |
|---|---|---|
| Outcome (terminal) | `end` step `metadata.{outcomeKey,outcomeLabel,terminalType}` | `nspEnd` (`worker.ts:4493`) |
| Next event | a new `of_events` row (e.g. `no_response`, `offer_accepted`) **[COMPOSE-2 wire]** | `of_events` free-text `event_type` |
| Interpretation input | append `OfMessageClassification` for the reply | `of-types:343` |
| Opportunity signal | `of_conversation_opportunities` row via handoff path | `ensureConversationOpportunity` (`worker.ts:7459`) |
| Human handoff request | `terminalType:"handoff" + queueHandoff:true` → Queue item | gate `worker.ts:6742`; payload = NSP-5 §6 |

A Conversation node MUST expose at least a **terminal/exit** and a **handoff** destination
(ADR-0002 §Node Contract). Emissions cross context boundaries as **events/records**, never as
shared in-process state.

### 6.7 What belongs in the Journey graph
Only `JourneyGraph` (`of-types:2079`): `nodes` (`class`, `position`, `group`, `config`,
`contract`, `nodeFlowRef` **[+`capabilityRef`]**), `connections` (`from.port`→`to`, `label`),
`groups`, `viewport`, `selectedNodeId`. I.e. **intent and map only.**

### 6.8 What MUST NEVER be copied into the Journey graph
- **Node Flow internals** — the script's steps/branches/messages. The graph carries only the
  *reference* (`nodeFlowRef`); NODE-1D/1E already enforce this (`journeyContracts.ts` derives a
  capability view "never the Node Flow's contents", `of-types:2168`).
- **Runtime machinery** — classifier nodes, switch/branch nodes, persistence steps, retries,
  terminal-rendering nodes (ADR-0002 drill-down surface: Source→Opening→Reply→Decision→Response→Exit).
- **Conversation runtime state** — `OfConversationInstance` stays owned by the runtime (ADR-0002
  Ownership Matrix); the Journey MUST NOT own it.
- **Interpretation logic** and **the full 44-step tree** — these live in the Interpretation service
  and the Node Flow respectively, never on the business canvas.

### 6.9 Invariants (carried forward from ADR-0002 §Architectural Invariants)
Channel ≠ Identity · Provisional ≠ Canonical identity · Creator auth ≠ Fan identity ·
Node-local state ≠ Journey state · Journey (intent) ≠ Runtime (execution) ·
Node Flow surface ≠ Runtime machinery · **Interpretation exists once** ·
**Opportunity exists once** · a Conversation node MUST reach terminal/handoff/wait/transition.

---

## 7. Initial reusable capability catalogue (derived, not implemented)

Derived from the 44-step analysis (§2). Names are proposals; the boundaries are dictated by the
KEEP steps. Each is **one bounded piece of work, reusable across many journeys.**

| Cap | Name | Node class | Bounded scope (from NSP-4 steps) | Consumes | Emits (destinations) | Reused by (future journeys) |
|---|---|---|---|---|---|---|
| **C1** | New Subscriber Welcome & Discovery | conversation | opening_welcome + 7 follow-up variants + not_ready reassure (#1,4–10,23) — **collapse to ≤6 turns** | provisional id, relationship context, interpretation signals | `conversation_state`, `latest_interpretation` → `terminal`, `handoff`, `offer?` | new subscriber; any "open a new relationship" (Instagram qualification) |
| **C2** | Make Offer (PPV) | process (commerce) | purchase_offer + objection reply (#13,22) + offer-reply handling | interpretation (`purchase_intent`/`price_objection`), catalog item, relationship context | `offer_state` → `accepted`, `objection`, `declined`, `handoff` | PPV interest, subscription upsell, campaigns, cross-sell |
| **C3** | Silence Follow-up | process (conversation) | silence_followup_one/two (#26,29) | `conversation_state`, `silent_no_reply` signal | → `reengaged`, `no_response` | new subscriber, lapsed fan, renewal risk, conversation stall |
| **C4** | Boundary / Safety Response | process (conversation) | boundary_redirect (#30) + boundary_pause (#33) | safety/`boundary_testing`/`explicit_or_unsupported_request` signal | → `safe_continue`, `human_review` | **every** conversational journey (safety is cross-cutting) |
| **C5** | Human Handoff | human | end_one_to_one / boundary_pause / end_human_review (#33,40,44) | full NSP-5 §6 handoff payload | `queue_item` → `queued` | every journey needing escalation/approval |

**Explicitly NOT capabilities** (they are reusable services or machinery, per §5): Interpretation
(the classify_* steps), Opportunity Detection (the wrap/opportunity ends), Routing (the switch
nodes), Outcome terminals (rendering). Naming the candidates was validated against the actual step
boundaries rather than accepted blindly — e.g. "Engagement Discovery", "Relationship Nurture" and
"Content Discovery" from the brief's example list are **not** separate capabilities here: they are
**directions/outcomes of C1** plus **opportunity types**, not distinct bounded work.

---

## 8. Reusable interpretation signal catalogue (v0.1)

The unification the brief demands: reconcile NSP-4's **16 inline response classes**
(`worker.ts:4271–4304` route tables; produced by `classifyNewSubscriberReply` `worker.ts:6985`)
with the **12 `ConversationIntent`** values (`of-types:159–171`) into **one** canonical signal set.
Overlap proves the duplication (e.g. `price_objection` appears verbatim in **both** systems;
`purchase_intent`≈`buying_signal`; `flirtatious`≈`flirting`; `one_to_one_request`≈`custom_request`;
`no_interest_disengaged`≈`goodbye`; `curious_about_creator`≈`subscription_question`).

| Proposed canonical signal | NSP-4 response class | ConversationIntent | Group | Channel scope |
|---|---|---|---|---|
| greeting_low_effort | short_low_effort | greeting | relational | channel-independent |
| warm_enthusiastic | warm_enthusiastic | (high_engagement*) | relational | channel-independent |
| compliment | compliment | — | relational | channel-independent |
| flirtatious | flirtatious | flirting / sexting | relational | channel-independent |
| shares_preference | shares_preference | — | relational | channel-independent |
| curious_about_creator | curious_about_creator | subscription_question | relational | channel-independent |
| casual_chat | (—) | casual_chat | relational | channel-independent |
| off_topic | off_topic | — | relational | channel-independent |
| disengaged | no_interest_disengaged | goodbye | relational/lifecycle | channel-independent |
| purchase_intent | purchase_intent | buying_signal | commercial | OnlyFans-commerce |
| ppv_interest | (asks_for_content→) | ppv_interest | commercial | OnlyFans-specific |
| content_curious | asks_for_content | — | commercial/relational | OnlyFans-specific |
| custom_request | one_to_one_request | custom_request | commercial | OnlyFans-specific |
| price_objection | price_objection | price_objection | commercial | OnlyFans-commerce |
| not_ready | not_ready | — | commercial | channel-independent |
| subscription_question | (curious→) | subscription_question | commercial | OnlyFans-specific |
| boundary_testing | boundary_testing | — | safety/boundary | channel-independent |
| unsupported_request | explicit_or_unsupported_request | (sexting≈adjacent) | safety/boundary | channel-independent |
| complaint | (—) | complaint | safety/support | channel-independent |
| support | (—) | support | support | channel-independent |
| silent_no_reply | silent_no_reply | — | lifecycle/silence | channel-independent (conversation-scoped) |

\* `high_engagement` is a `ConversationSentiment` (`of-types:158`), not an intent — flagged to show
sentiment and intent are distinct axes that a unified model should keep separate.

**Scope classification (as required):**
- **Channel-independent** (reusable across Instagram/OnlyFans/email/web-chat): all relational,
  safety, support and silence signals — these describe the *conversation*, not the platform.
- **OnlyFans-specific / commercial**: `ppv_interest`, `custom_request`, `subscription_question`,
  `content_curious` — tied to OnlyFans monetisation primitives.
- **Conversation-specific**: every signal is per-message/per-turn (they classify a reply).
- **Commercial**: the purchase/price/PPV/custom/subscription cluster.
- **Safety / boundary**: `boundary_testing`, `unsupported_request`, `complaint`.

**Recommendation:** COMPOSE-2 defines this canonical set **once**, owned by the **Conversation
Interpretation** context (`bounded-contexts.md:89`), replacing the inline regex token
`__classify_nsp_response__` with a call into the shared service. Sentiment (8 values) and Intent
stay distinct axes. **Do not introduce a third vocabulary.**

---

## 9. Opportunity alignment analysis

Mapping NSP-4's 10 terminal outcomes to the four existing opportunity vocabularies (OPP-1). "None
created today" reflects the runtime gate finding (§1, §3).

| NSP-4 outcomeKey (terminalType) | Canonical catalogue (34, doc) | CommercialOpportunityKey (8) | Runtime category written (3) | Opportunity row today? |
|---|---|---|---|---|
| engaged_relationship (completed) | Relationship Building | — | — | No |
| profile_content_exploration (completed) | Content Delivery / Relationship Building | — | — | No |
| conversion_opportunity_detected (completed) | PPV / Upsell Opportunity | upsell_ppv | — | No |
| ppv_interest (completed) | **PPV Opportunity** | upsell_ppv | — | No |
| subscription_upsell_opportunity (completed) | **Upsell Opportunity** | upsell_ppv | — | No |
| one_to_one_opportunity (**handoff**) | **Custom Content Request** | offer_custom | *(would be `relationship`)* | No (gate off) |
| nurture_later (completed) | Low Engagement Fan / Scheduled Follow-up | retention | — | No |
| no_response (completed) | Conversation Stall | — | — | No |
| closed_disengaged (completed) | *(no opportunity — end state)* | no_action | — | No |
| human_review_required (**handoff**) | AI Escalation / Manual Escalation | human_conversation | *(would be `operations`)* | No (gate off) |

**Findings.** (1) NSP-4 invented its **own** outcome vocabulary that overlaps but matches none of
the three code vocabularies exactly. (2) Six of ten outcomes map cleanly onto canonical catalogue
opportunities; two are pure end-states; two are escalations. (3) The runtime only ever emits three
category strings (`revenue|operations|relationship`), and NSP-4 emits **none** (gate off by design).
**Recommendation:** adopt the doc catalogue (`conversation-opportunity-catalogue-v1.md`) as the
single canonical opportunity taxonomy, constrain `of_conversation_opportunities.opportunity_classification`
to it (a future migration — **not** in COMPOSE-1/2 scope), and have the **Opportunity Detection**
service map `(interpretation signal + conversation state)` → a canonical opportunity. **Do not
create a fifth opportunity concept.**

---

## 10. Composition Contract decision gate

> **Can FunkMyFans represent journeys as repeatable compositions of reusable capabilities using the
> architecture already built?**

**YES — structurally the substrate exists; four additive additions make reusability expressible.**

What already supports composition (no change needed):
- Journey → Node → Node Flow layer with an explicit **node contract** (`JourneyNodeContract`
  inputs/outputs/destinations), six bounded node classes, `NodeFlowRef`, and a derived capability
  view (NODE-1A→1F, all merged into `main`).
- The **approved bounded-context map** that already wires Event→Interpretation→{Conversation,
  Opportunity}→Queue and Subscriber Profile→Conversation — i.e. the COMPOSE target model.
- Real, channel-agnostic seams for **relationship context** (`RelationshipContextProjection`) and
  **Queue/Human handoff** (`ensureConversationHandoffQueueItem`).
- The **EMMA typed example** proving the target New Subscriber journey compiles.

Why it is not yet reusable (the exact gaps) → **minimum COMPOSE-2 additions:**
1. **Capability reference + registry.** Add `CapabilityRef {capabilityKey, version?}` to
   `JourneyNodeBase` and a registry mapping `capabilityKey` → concrete `NodeFlowRef`(s). Turns
   "node points at one script" into "node instantiates a reusable capability." *(types + registry;
   additive; no runtime/migration change.)*
2. **One canonical interpretation signal set** (§8) owned by Conversation Interpretation, replacing
   the inline `__classify_nsp_response__` regex. **Two interpretation systems already exist — unify,
   do not triple.**
3. **Capability context IO contract** (§6.5/6.6): standard input keys (`event_context`,
   `identity_context`, `relationship_context`, `interpretation_signals`, `opportunity_context`) and
   standard emissions (`outcome`, `next_event`, `interpretation_input`, `opportunity_signal`,
   `handoff_request`). Formalises the `conversation_state`/`latest_interpretation` outputs and the
   NSP-5 §6 handoff payload the EMMA example already declares.
4. **Outcome → canonical Opportunity mapping** (§9): map the 10 outcomes to the doc catalogue via
   the Opportunity Detection service. (Constraining the DB column is later, not COMPOSE-2.)

If the answer had been **NO**, the blocking gap would be that `JourneyNode` can only bind to a
concrete script, not a reusable capability. It is **not** blocking, because addition (1) is a small
additive type + registry that fits the existing `NodeFlowRef` seam and the registry-backed-taxonomy
pattern already named in the bounded-contexts doc. No architectural rewrite is required.

---

## 11. COMPOSE-2 readiness assessment

**Proven in COMPOSE-1:**
- Exact 44-step inventory, classification (A0/B0/C5/D8/E14/F12/G5) and disposition
  (KEEP14/INTERP5/OPP8/JOURNEY9/EVENT-OUT3/PLUMBING5), all traced to code.
- The 44 steps collapse to **≈9 business-facing composition elements** (4 capabilities + interpretation
  service + opportunity-detection service + journey directions + Queue/Human + event/identity seam).
- The target operating model = the already-approved bounded-context map; COMPOSE is an operating
  reset (NSP-5), not new architecture.
- Composition Contract v0.1 defined against existing types; capability, interpretation-signal and
  opportunity catalogues derived; opportunity alignment mapped.
- Decision gate: **YES**, with four additive additions specified.

**Unresolved / carried into COMPOSE-2:**
- No `CapabilityRef`/registry yet (gap 1).
- Interpretation is duplicated (16 inline vs 12 `ConversationIntent`) and inline-regex-bound (gap 2).
- No standard capability context IO keys (gap 3).
- Outcomes emit no opportunities and no canonical mapping (gap 4).
- Dual queue surfaces (`of_tasks` vs `of_queues`) — cleanup deferred; note for Queue context.
- Instagram is a **producer** gap (Channel adapter), correctly deferred to COMPOSE-3.

**Do the assumptions for COMPOSE-2 still hold? YES.** COMPOSE-2 ("Capability Registry and Journey
Composition Model") is exactly gaps (1) + (3) and consuming (2)'s canonical set. Nothing in
COMPOSE-1 invalidates the planned sequence. The one sharpening: COMPOSE-2 should treat the
**canonical interpretation signal set (§8)** as a co-requisite input (it is the vocabulary
capabilities consume), so COMPOSE-2 should either define it or explicitly stub it for
COMPOSE-4 — recommend **defining the signal set in COMPOSE-2** since the registry needs it to type
capability inputs.

### Precise handoff to COMPOSE-2
1. Add to `@funkmyfans/of-types` (additive, no runtime change): `CapabilityRef`, a `Capability`
   descriptor (`capabilityKey`, `class`, declared `contract`, default `NodeFlowRef` binding), and an
   optional `capabilityRef` field on `JourneyNodeBase`.
2. Define the **Capability Registry** as a registry-backed taxonomy (per
   `bounded-contexts.md:104`), mapping `capabilityKey` → creator/archetype-specific `NodeFlowRef`(s).
   Seed it with the five C1–C5 capabilities from §7. **Do not implement a new execution engine.**
3. Define the **canonical interpretation signal set** (§8) as the typed vocabulary capabilities
   consume; wire it as the input contract, leaving the *producer* (replacing the inline regex) to
   COMPOSE-4.
4. Specify the **capability context IO keys** (§6.5/6.6) as the standard input/output vocabulary.
5. Keep the NSP-4 seed, `flowBuilder.ts`, `processConversationInstance`, and all migrations
   **untouched**; COMPOSE-2 remains types + registry + reference-journey composition.
6. Re-validate against the EMMA typed example: the New Subscriber journey should compose from
   `capabilityKey`s resolving to the same `nodeFlowRef`s.

**Recommendation: proceed to COMPOSE-2 as planned** (do not begin it automatically). The roadmap
holds; no resequencing required.

---

## 12. Validation performed
- **Base confirmed:** `main` @ `f342051` (Merge PR #32) = reconciled NODE-1A→1F. This COMPOSE-1
  branch is based on it.
- **Every conclusion cited to code** at file + line: NSP-4 seed (`worker.ts:4270–4515`),
  interpretation (`worker.ts:6913–7022`, `2081–2408`; `of-types:158–407`), opportunity
  (`worker.ts:7362–7510`, gate `6742`; migrations `20260703…`, `20260706…`; `of-types:652–677`),
  journey types (`of-types:1862–2293`), flow compiler (`flowBuilder.ts`), capability derivation
  (`journeyContracts.ts`), Queue/Human (`worker.ts:7512–7697`; migration `20260702000000`),
  relationship context (`of-types:88–97`; `worker.ts:6934–6977`), ADR-0002, bounded-contexts,
  NSP-5, NSP-2.
- **Existing tests / shape checks reviewed** (not modified): `scripts/creator-cockpit-smoke.ts`
  `validateNsp4FunnelShape`; `docs/acceptance/nsf-1-…-acceptance.md`.
- **No source changes**, so local typecheck/build were not required (and the sandbox egress
  firewall blocks `registry.npmjs.org`, so `npm ci` is unavailable locally — same constraint noted
  in prior sprints). The CI verify job (`.github/workflows/creator-cockpit-smoke.yml`:
  `npm ci → typecheck → build`) runs on this PR against **unchanged** TypeScript and is expected to
  pass; the deployed smoke step is skipped unless `COCKPIT_BASE_URL` is set.

## 13. Runtime-boundary confirmation
This is a **documentation-only** change. No runtime code, no NSP-4 seed, no `flowBuilder.ts`, no
`processConversationInstance`, no migration, and none of the onboarding files were touched. No
Capability Registry, Instagram journey, or interpretation/opportunity system was implemented. No
Node Flow internals were copied into any JourneyGraph. The only file added is this analysis document.

## 14. Files changed
- `docs/architecture/compose-1-capability-decomposition-and-composition-contract.md` — **added** (this document).
