# COMPOSE-2 — Capability Registry and Journey Composition Model

Status: **Proposed** (additive implementation sprint)
Series: COMPOSE (sprint 2 of 6)
Base: `compose-1-capability-decomposition` (PR #34), which is `main` @ `f342051` + the COMPOSE-1 doc.
Scope: additive types + a code-backed semantic registry + reference composition + a small drawer panel.
**No runtime change** (no `processConversationInstance`, no `flowBuilder.ts`, no NSP-4 seed, no migration).

> COMPOSE-2 makes a Journey Node able to say, independently: **what reusable capability it
> represents** (`capabilityRef`) and **which concrete Node Flow currently implements it**
> (`nodeFlowRef`). `capabilityRef` does **not** replace `nodeFlowRef`; the two are never merged.

---

## 1. What was proven

A Journey Node can now carry a **stable, script-independent semantic capability reference**
(`capabilityRef`) that resolves — through a deterministic, non-executing **Capability Registry** —
to a typed **CapabilityDescriptor**, entirely independently of the node's concrete `nodeFlowRef`.
This was proven end to end:

- **CapabilityRef + Capability descriptor** added additively to `@funkmyfans/of-types`.
- A **code-backed Capability Registry** (6 seeded capabilities) with deterministic lookup and
  graceful unknown-key handling — no network, no DB, no execution.
- **`capabilityRef` on `JourneyNodeBase`** — optional and additive; NODE-1C graphs without it load
  unchanged, and the canvas save path (`{ ...node, position }`, `JourneyCanvas.tsx:186`) preserves
  it, so save/reload round-trips.
- A **standard capability context IO vocabulary** (`CapabilityInputKey` / `CapabilityOutputKey`)
  mapped to existing canonical boundaries, so future capabilities stop inventing context names.
- **One canonical interpretation signal vocabulary** (21 signals) that reconciles NSP-4's 16 inline
  response classes **and** the 12 `ConversationIntent` values — with explicit mapping tables. No
  third interpretation system; no producer changed.
- The **Emma reference journey** binds all three nodes to capabilities while keeping `nodeFlowRef`
  as the concrete seam.
- **All four capabilityRef/nodeFlowRef compatibility states** derive and degrade safely.
- Derivation enriches the existing NODE-1E `JourneyNodeCapability` view; the **drawer** shows the
  reusable-capability metadata. Readiness stays evidence-based (unchanged).
- **73/73 deterministic checks pass** (executed in-sandbox; see §12).

**Decision gate: YES.** A Journey Node can identify *what reusable capability it represents* and,
independently, *which concrete Node Flow implements it*, without any runtime execution change.

---

## 2. Final CapabilityRef contract

`packages/of-types/src/index.ts`:

```ts
export interface CapabilityRef {
  capabilityKey: string;   // stable snake_case key; open `string` so unknown/older keys degrade gracefully
  version?: number;        // optional contract version (advisory in v0.1)
}
```

Rationale for the minimal shape: it is stable, serialisable, additive, backwards-compatible, and
independent of any one concrete script. It carries **no** runtime state, **no** Node Flow steps and
**no** Journey layout. `capabilityKey` is deliberately `string` (not the closed `CapabilityKey`
union) so an older/unknown ref resolves to `undefined` rather than failing to type-check or load.
`CapabilityKey` (the 6 seeded keys) is exported separately as an authoring convenience.

Added to `JourneyNodeBase` (every node class inherits it), sibling to `nodeFlowRef`:

```ts
interface JourneyNodeBase {
  /* …id, label, position, group?, contract, nodeFlowRef?… */
  capabilityRef?: CapabilityRef;   // WHAT (semantic) — independent of nodeFlowRef (WHICH concrete flow)
}
```

---

## 3. Final Capability descriptor

Smallest sufficient contract (no speculative enterprise schema):

```ts
export interface CapabilityDescriptor {
  capabilityKey: CapabilityKey;
  version: number;
  label: string;
  description: string;                 // the one-line bounded responsibility it owns
  category: CapabilityCategory;        // channel | conversation | commerce | engagement | safety | human
  owner: JourneyNodeOwner;             // reuses channel | system | automation | human
  status: CapabilityStatus;            // stable | experimental | proposed
  requiresHuman: boolean;
  inputKeys: CapabilityInputKey[];
  outputKeys: CapabilityOutputKey[];
  supportedInterpretationSignals?: CanonicalInterpretationSignal[];
  supportedOpportunityTypes?: string[];   // canonical opportunity NAMES (catalogue); typed in COMPOSE-4
  implementationRefs?: NodeFlowRef[];      // usually empty in v0.1 — concrete impl attaches at the node
}
```

`supportedOpportunityTypes` is intentionally `string[]` (canonical catalogue names) rather than a
new union, so COMPOSE-2 does **not** mint a duplicate opportunity vocabulary; the canonical
opportunity type/mapping is owned by the Opportunity seam (COMPOSE-4).

---

## 4. Registry catalogue and keys

`apps/creator-cockpit/src/lib/capabilityRegistry.ts` — a code-backed, deterministic, non-executing
registry (`getCapability`, `getCapabilityByRef`, `hasCapability`, `listCapabilities`,
`capabilityKeys`, `capabilityBindingState`). Seeded strictly from the COMPOSE-1 catalogue (§7 of
COMPOSE-1), plus the Channel/source entry the reference journey requires:

| capabilityKey | Label | Category | Owner | requiresHuman | Node Flow | COMPOSE-1 |
|---|---|---|---|---|---|---|
| `channel_source_entry` | Channel / source entry | channel | channel | no | adapter-backed (none) | View B Channel seam |
| `new_subscriber_welcome_discovery` | New Subscriber Welcome & Discovery | conversation | automation | no | per-creator script (nodeFlowRef) | C1 |
| `make_offer_ppv` | Make Offer (PPV) | commerce | automation | no | script | C2 |
| `silence_follow_up` | Silence Follow-up | engagement | automation | no | script | C3 |
| `boundary_safety_response` | Boundary / Safety Response | safety | automation | no | script | C4 |
| `human_handoff` | Human Handoff | human | human | **yes** | none (human) | C5 |

The registry is semantic metadata only: it does not execute, does not store scripts, is not a
second Journey graph, and does not replace `nodeFlowRef`. Concrete per-creator implementations
attach at the Journey node via `nodeFlowRef`; `implementationRefs` in v0.1 is empty.

---

## 5. Context IO vocabulary

A small canonical vocabulary so no future capability invents its own context names. Keys only — no
transport, no execution.

**Inputs (`CapabilityInputKey`)** → existing canonical boundary:

| Key | Canonical source |
|---|---|
| `event_context` | HOST / `of_events` triggering event |
| `identity_context` | canonical Subscriber (Subscriber Profile) |
| `relationship_context` | `RelationshipContextProjection` (Hermes relationship context) |
| `conversation_context` | conversation state/history (`OfConversationInstance`) |
| `interpretation_signals` | `CanonicalInterpretationSignal[]` (Conversation Interpretation) |
| `opportunity_context` | detected `ConversationOpportunity`, if any |
| `creator_context` | creator scope / archetype (Creator Workspace) |

**Outputs (`CapabilityOutputKey`)** → existing canonical mechanism:

| Key | Canonical mechanism |
|---|---|
| `outcome` | terminal outcome (`end` step `outcomeKey`/`terminalType`) |
| `next_event` | an emitted `of_events` row |
| `conversation_action` | a message/action within the conversation |
| `interpretation_input` | an `OfMessageClassification` appended for a reply |
| `opportunity_signal` | a Conversation Opportunity signal |
| `human_handoff_request` | a Queue handoff request (NSP-5 minimum payload) |
| `relationship_update` | a relationship/context update |

---

## 6. Canonical interpretation signal set + NSP-4 mapping

`apps/creator-cockpit/src/lib/interpretationSignals.ts`. **One** vocabulary (21 signals), the union
superset of the two existing vocabularies. Vocabulary + mapping **only** — no classifier/producer is
changed (that is COMPOSE-4). A signal (what a message MEANS) is kept distinct from an Opportunity
(what to act on) and a Capability (the work performed).

**NSP-4 inline response class → canonical (all 16):**

| NSP-4 | canonical | | NSP-4 | canonical |
|---|---|---|---|---|
| warm_enthusiastic | warm_enthusiastic | | silent_no_reply | silence |
| short_low_effort | greeting | | boundary_testing | boundary_testing |
| compliment | compliment | | explicit_or_unsupported_request | unsupported_request |
| flirtatious | flirtatious | | off_topic | off_topic |
| curious_about_creator | curious_about_creator | | no_interest_disengaged | disengaged |
| asks_for_content | content_interest | | shares_preference | shares_preference |
| purchase_intent | purchase_intent | | one_to_one_request | custom_request |
| price_objection | price_objection | | not_ready | not_ready |

**ConversationIntent → canonical (all 12):** greeting→greeting, flirting→flirtatious,
buying_signal→purchase_intent, ppv_interest→ppv_interest, custom_request→custom_request,
sexting→flirtatious, casual_chat→casual_chat, support→support_request, complaint→complaint,
price_objection→price_objection, subscription_question→subscription_question, goodbye→disengaged.

**Genuinely-missing canonical concepts identified** (the union adds what neither vocabulary alone
had): from NSP-4 the relational nuance `warm_enthusiastic`, `compliment`, `shares_preference`,
`curious_about_creator`, `content_interest`, `not_ready`, `boundary_testing`, `off_topic`; from
`ConversationIntent` the `casual_chat`, `ppv_interest`, `subscription_question`, `complaint`,
`support_request` distinctions. Each canonical signal carries a group
(relational/commercial/safety/support/lifecycle) and channel scope
(channel-independent/OnlyFans-specific) — see `INTERPRETATION_SIGNAL_META`.

Layering held (not collapsed): `purchase_intent` = **signal**; “PPV Opportunity” = **opportunity**;
`make_offer_ppv` = **capability**.

---

## 7. Reference journey composition (Emma / moonsiren)

The Emma journey (`EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE` in of-types; bound to the live script by
`bindEmmaJourney`) now composes capabilities while keeping the concrete implementation seam:

```
OnlyFans (Channel)            New Subscriber Chat (Conversation)          Human Handoff (Human)
  capabilityRef:                capabilityRef:                              capabilityRef:
    channel_source_entry          new_subscriber_welcome_discovery            human_handoff
  nodeFlowRef: —                nodeFlowRef: script (real New Subscriber)    nodeFlowRef: —
  → state B                     → state A (capability + flow)               → state B
```

- **New Subscriber Chat** shows *what* it is (reusable welcome/discovery capability) while its
  existing `nodeFlowRef` remains the concrete implementation reachable via the NODE-1D drill-down —
  the 44-step flow is **not** copied into the Journey graph.
- **Human Handoff** resolves as a reusable capability with **no fake Node Flow** (human-owned).
- Generic (non-Emma) derived journeys (`deriveJourneyFromScript`) bind `channel_source_entry` and
  `human_handoff`, but the conversation node is intentionally left **unbound** (`flow_only`, state
  C) — a semantic capability is not assumed for arbitrary scripts.

---

## 8. Compatibility-state results

`capabilityBindingState(node)` (pure, dependency-free) yields:

| State | capabilityRef | nodeFlowRef | Meaning | Readiness behaviour |
|---|---|---|---|---|
| A `capability_and_flow` | ✓ | ✓ | Known capability with a concrete Node Flow | as NODE-1E (script-existence evidence) |
| B `capability_only` | ✓ | — | Known capability, no concrete flow attached | human→`manual`; channel→`ready`/`needs_configuration`; conversation→`needs_configuration` |
| C `flow_only` | — | ✓ | Legacy concrete flow, no capability mapping | as NODE-1E |
| D `unbound` | — | — | Orchestration/channel/group/manual/unknown legacy | as NODE-1E (`manual`/`ready`/`unknown`) |

Readiness is **unchanged** from NODE-1E — it remains evidence-based on referenced-script existence
and never infers runtime health. Capability metadata is purely additive. An unknown `capabilityKey`
degrades to “not in the registry” with a warning and no throw.

---

## 9. What remains unresolved (carried into later COMPOSE sprints)

1. **Producers still emit the old vocabularies.** The NSP-4 inline regex (`__classify_nsp_response__`)
   and the `ConversationIntent` engine are unchanged. Wiring producers/consumers to the canonical
   signals is **COMPOSE-4** (deliberately out of scope here).
2. **Outcome → Opportunity mapping** is still not executed (COMPOSE-1 gap 4). `supportedOpportunityTypes`
   references catalogue names but nothing creates opportunities — Opportunity seam is **COMPOSE-4**.
3. **Instagram entry** is still a producer/adapter gap — **COMPOSE-3**.
4. **Registry is code-backed** (v0.1). If a registry-backed *taxonomy service* is later wanted, it
   can replace the code catalogue behind the same `getCapability*` API with no node/graph change.
5. **`implementationRefs` are empty**; concrete per-creator implementations still live only on nodes
   as `nodeFlowRef`. A capability→implementation resolver per creator/archetype is future work.

---

## 10. COMPOSE-3 readiness

**Do COMPOSE-3 assumptions still hold? YES.** COMPOSE-3 (Instagram Entry and Identity Seam) needs:
(a) a Channel node that emits a provisional, transport-scoped identity, and (b) an Identity node
that resolves it to a canonical Subscriber. COMPOSE-2 provides the reusable `channel_source_entry`
capability and the `capabilityRef` seam; the six node classes (incl. `channel`, `identity`) and the
`JourneyChannelKind` `"instagram"` value already exist (of-types). Nothing in COMPOSE-2 invalidates
the planned sequence.

**Precise handoff to COMPOSE-3:**
1. Add an `identity_resolution` capability (owner `system`, category — propose adding `identity` to
   `CapabilityCategory`, or reuse a neutral category) to the registry; keep it semantic only.
2. Model the Instagram entry as a `channel_source_entry` capability bound to a `channel:"instagram"`
   node; the **producer** (an `/api/events/instagram` adapter → `of_events`) is the actual COMPOSE-3
   build, plus `of_creators.platform_provider` extension — those are runtime/ingestion changes
   COMPOSE-2 intentionally did not make.
3. Use the existing `RelationshipContextProjection` inbound seam (Hermes context) as the Identity
   node's downstream context — do not add a second relationship system.
4. Keep `capabilityRef` (WHAT) separate from `nodeFlowRef` (WHICH); an Identity node may be
   `capability_only` until a resolver flow exists.
5. Do not begin COMPOSE-3 automatically.

---

## 11. Exact files changed

| File | Change |
|---|---|
| `packages/of-types/src/index.ts` | +`CapabilityRef`, `CapabilityKey`, `CapabilityCategory`, `CapabilityStatus`, `CapabilityInputKey`, `CapabilityOutputKey`, `CanonicalInterpretationSignal`, `CapabilityBindingState`, `CapabilityDescriptor`; +`capabilityRef?` on `JourneyNodeBase`; +8 optional capability fields on `JourneyNodeCapability`; +`capabilityRef` on the 3 Emma example nodes |
| `apps/creator-cockpit/src/lib/capabilityRegistry.ts` | **new** — seeded registry + `getCapability`/`getCapabilityByRef`/`hasCapability`/`listCapabilities`/`capabilityKeys`/`capabilityBindingState` |
| `apps/creator-cockpit/src/lib/interpretationSignals.ts` | **new** — canonical signal set + `NSP4_TO_CANONICAL` + `CONVERSATION_INTENT_TO_CANONICAL` + meta + helpers |
| `apps/creator-cockpit/src/lib/journeyContracts.ts` | derivation resolves `capabilityRef` → descriptor; adds `capabilityBinding` + capability metadata; readiness unchanged |
| `apps/creator-cockpit/src/lib/journey.ts` | `deriveJourneyFromScript` binds `channel_source_entry` + `human_handoff`; conversation intentionally left `flow_only` |
| `apps/creator-cockpit/src/components/journey/JourneyNodeDrawer.tsx` | +“Reusable capability” panel (label, key, category, owner, status, implementation availability, binding state) |
| `apps/creator-cockpit/scripts/compose2-capability-check.ts` | **new** — deterministic capability-layer check |

7 files, additive (+~697 / −1).

---

## 12. Validation evidence

- **Deterministic capability-layer check** (`scripts/compose2-capability-check.ts`): **73/73 PASS**,
  executed in-sandbox via Node 24 type-stripping (`node apps/creator-cockpit/scripts/compose2-capability-check.ts`).
  Covers registry determinism + graceful unknown handling, per-descriptor invariants, the full
  canonical vocabulary + all 16 NSP-4 and all 12 `ConversationIntent` mappings landing in the
  canonical set, and all four compatibility states via the real `capabilityBindingState`.
- **Round-trip**: the canvas serialize path spreads `{ ...node, position }` (`JourneyCanvas.tsx:186`),
  so `capabilityRef` persists across save/reload; NODE-1C stores the graph as JSONB, so older graphs
  without `capabilityRef` load unchanged (optional field). All changes are additive.
- **Backwards compatibility**: `capabilityRef` and the derived fields are all optional; nodes without
  a `capabilityRef` derive `capabilityBinding: "flow_only"` or `"unbound"` and render exactly as
  before (the new drawer panel simply does not appear).
- **NODE-1E/1F**: unchanged behaviour — readiness derivation is untouched; the existing
  `node1e`/`node1f` checks and the drill-down remain valid.
- **Full typecheck/build** (`of-types` typecheck, `creator-cockpit` typecheck, `vite build`) rely on
  the **CI verify job** (`.github/workflows/creator-cockpit-smoke.yml`: `npm ci → typecheck → build`),
  because the sandbox egress firewall blocks `registry.npmjs.org` (no local `npm ci`) — the same
  constraint recorded for prior sprints. The changes are additive TypeScript; the check script is not
  in the `tsc` include set (`["src","worker.ts","vite.config.ts"]`) and does not affect the build.
- **Browser acceptance** (open Emma journey → 3-node map → inspect New Subscriber Chat capability →
  drill into node flow via `nodeFlowRef` → return with context/positions preserved → inspect Human
  Handoff resolving without a fake flow) requires a live Worker+Supabase and a cloud browser that can
  reach sandbox localhost; it is provided as a manual acceptance script and not executed here (same
  limitation as NODE-1F). The composition it exercises is validated statically + by the deterministic
  check.

---

## 13. Runtime-boundary confirmation

No runtime execution changed. `processConversationInstance`, `flowBuilder.ts`, the NSP-4 seed
(`newSubscriberFunnelTemplate`), and all migrations are **untouched**. No opportunity is created; no
interpretation producer is replaced; no Instagram ingestion, identity, Hermes, Queue, billing, auth,
or onboarding change was made. The Capability Registry executes nothing. No Node Flow internals were
copied into any JourneyGraph. `capabilityRef` never affects execution — the runtime continues to walk
the compiled script referenced by `nodeFlowRef`.

---

## 14. COMPOSE-2 decision gate

**Can a Journey Node now identify what reusable capability it represents, and independently which
concrete Node Flow implements it, without changing runtime execution?**

**YES.** `capabilityRef` (resolved via the semantic registry) answers *what*; `nodeFlowRef` answers
*which*; the two are separate and all four combinations degrade safely. Runtime execution is
unchanged. **COMPOSE-3 (Instagram Entry and Identity Seam) may proceed** — but not automatically.
