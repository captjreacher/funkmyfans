# ADR-0002 - Playbook Journey and Node Architecture

## Status

Proposed

Extends ADR-0001 (Conversation Operations Platform Architecture Freeze v1.0). This ADR MUST conform to ADR-0001 and does not modify it. It does not supersede any prior ADR.

This document is the NODE-1A deliverable of the "Playbook Node Architecture + Workspace Reset" sprint. Per ADR-0001 Change Control, implementation work beyond documentation and types MUST NOT begin until this ADR is reviewed and approved.

## Purpose

Introduce a journey-level orchestration abstraction:

```text
Playbook Journey
  -> Node
     -> Node Flow
```

The goal is to replace the single large execution-graph experience as the default authoring surface with a journey map composed of bounded, loosely coupled nodes, and to fix the node contract carefully now so that future channel, identity, onboarding and conversation nodes do not become tightly coupled.

The abstraction MUST sit above the existing conversation/script runtime. It MUST NOT rewrite or duplicate the execution engine.

The node contract (terminology, types, boundaries, ownership) is defined first, before UI (NODE-1B), persistence (NODE-1C), drill-down (NODE-1D) or the Emma migration (NODE-1E), so the contract is fixed rather than emergent.

## Scope

This ADR governs:

- the canonical model for Playbook Journeys, Nodes, Node Connections and Node Flows
- the initial node classes and the bounded capability each owns
- the authentication and identity boundaries between creators, fans and channels
- ownership rules and architectural invariants for nodes and journeys
- the reduced Conversation drill-down surface an operator sees
- the minimum persistence surface required by NODE-1C (specified, not implemented here)

## Non-Goals

This ADR / NODE-1A does not:

- change the existing runtime (script compilation, `flowBuilder` compile/hydrate, or `processConversationInstance`)
- introduce a product-local workflow, registry or execution engine (forbidden by ADR-0001)
- implement the Playbooks workspace UI (NODE-1B)
- implement a database migration (NODE-1C)
- implement the node drill-down editor (NODE-1D)
- perform the live Emma / New Subscriber migration (NODE-1E)
- implement an authentication system; it defines identity boundaries only
- define new channel adapters or identity resolvers; it defines only their node-level contracts and boundaries

## Relationship to ADR-0001

- The **Playbook Journey** is an authoring and orchestration artifact owned by the **Playbook Studio** bounded context. Consistent with ADR-0001's Playbook principle, it describes **intent, not runtime mechanics**. It MUST NOT introduce a product-local workflow, registry or execution engine.
- A **Conversation node's Node Flow is realised by an existing Script** (ADR-0001 canonical chain: Playbook -> Template -> Script -> Version -> HOST Runtime). The Journey references the Script by id; the Script continues to be compiled and executed by the existing/HOST runtime unchanged.
- **Channel nodes** are the node-level expression of ADR-0001's rules: "New channels MUST enter through an event-intake or adapter boundary" and "Channel adapters MUST not become source-of-truth domains."
- **Fan / subscriber identity** remains owned by the **Subscriber Profile** context. **Creator identity and configuration** remain owned by **Creator Workspace**. The Journey layer does not own identity.
- Canonical naming from ADR-0001 is preserved. "Journey" here is the Playbook Studio orchestration map and is distinct from the existing `OfRevenueJourney` revenue construct. The deprecated terms (Automation Builder, Script Engine, Conversation Engine, Chat Event Mapping) MUST NOT be reintroduced as primary product language.

## Canonical Domain Model

```text
Playbook Journey        (the map: intended progression + outcomes)
  -> Node               (a bounded capability + node-local state)
     -> Node Flow       (the node's internal process; drill-down only)
```

Definitions:

- **Playbook Journey** - a journey-level orchestration map. A spatial graph of Nodes and Node Connections expressing intended progression and outcomes across bounded capabilities. Operator-facing and product-owned (Playbook Studio). Types: `PlaybookJourney`, `JourneyGraph`.
- **Node** - a bounded capability within a journey. Owns only its bounded capability and its node-local state, and declares explicit inputs, outputs and destinations. Type: `JourneyNode`.
- **Node Connection** - a directed relationship from a source node destination (port) to a target node. Type: `JourneyNodeConnection`.
- **Node Flow** - the internal process of a single node, visible only when an operator drills into that node. For a Conversation node, the Node Flow is an existing Script referenced by `NodeFlowRef`. Runtime machinery (queues, classifiers, persistence steps, retries) is NOT part of the Node Flow surface.

## Node Classes (initial)

| Class | Bounded capability | Owns | MUST NOT own | Node Flow |
| --- | --- | --- | --- | --- |
| Channel | Transport only: Instagram, OnlyFans, email, web chat | Transport binding; provisional channel-scoped identity | Onboarding; canonical identity; authentication | None / adapter-backed |
| Identity | Provisional identity resolution and linking to a canonical Subscriber | Resolution / link decision; node-local match state | Creator authentication; a second source of truth for Subscriber identity | Optional resolver flow |
| Onboarding | Creator setup, permissions, connections, service configuration | Creator-side setup state | Fan identity; fan authentication | Optional setup flow |
| Process | A bounded operational or commercial activity | Its activity + node-local state | Cross-node state it did not receive as input | Optional process flow |
| Conversation | A specialised Process node, normally limited to 3-6 turns | Bounded conversation intent; turn budget | Runtime execution (delegated to the referenced Script) | Existing Script, via `NodeFlowRef` |
| Human | Explicit handoff, review or intervention | Routing to a queue / operator | Conversation semantics; Journey state | None |

## Authentication and Identity Boundaries (normative)

- Creator authentication and authorisation MUST be separate from fan identity (Creator Workspace vs Subscriber Profile).
- Fans MUST NOT authenticate to FunkMyFans merely by entering through a channel.
- Channel identity MUST be treated as provisional until resolved or linked, by an Identity node, to a canonical Subscriber.
- A Channel node MUST NOT own onboarding or canonical identity.
- Onboarding MUST be creator-scoped. It MUST NOT be triggered by fan channel entry.
- An Identity node MUST write resolution/link results into the Subscriber Profile context; it MUST NOT become a second source of truth for canonical identity.

## Ownership Rules (normative)

- A node MUST own only its bounded capability and its node-local state.
- Node-local state MUST NOT leak across nodes except through declared outputs.
- The Playbook Journey owns the map: node placement, grouping, connections, per-node configuration and node-flow references. It MUST NOT own conversation runtime state.
- Conversation runtime state remains owned by the existing runtime context (`OfConversationInstance`) and MUST remain unchanged by this abstraction.

### Ownership Matrix

| Object | Owner | Source of truth | State scope | Consumers |
| --- | --- | --- | --- | --- |
| Playbook Journey | FunkMyFans (Playbook Studio) | Journey graph document (proposed, NODE-1C) | Journey map | UI, read models |
| Journey Node | FunkMyFans (Playbook Studio) | Journey graph document | Node-local | Journey, UI |
| Node Connection | FunkMyFans (Playbook Studio) | Journey graph document | Journey map | Journey, UI |
| Node Flow (Conversation) | FunkMyFans (Script / Template Library) | `of_message_scripts` (existing) | Script definition | Runtime, UI drill-down |
| Provisional channel identity | FunkMyFans (Channel node, transient) | Channel event context | Node-local, transient | Identity node |
| Canonical Subscriber identity | FunkMyFans (Subscriber Profile) | Subscriber profile store (existing) | Canonical | Conversation, Queue, Opportunity |
| Creator auth / config | FunkMyFans (Creator Workspace) | Creator workspace store (existing) | Canonical | Onboarding node, UI |
| Conversation runtime state | FunkMyFans (Conversation runtime) | `of_conversation_instances` (existing) | Canonical, runtime | Queue, Audit, Monitoring |

## Node Contract (normative)

- Every node MUST declare explicit inputs, outputs and destinations (`JourneyNodeContract`).
- A destination is a named outlet (`JourneyNodeDestination.key`) to which a Node Connection binds via `from.port`.
- Node-local state MUST NOT be read by another node except through a declared output consumed as a declared input.
- A Conversation node MUST terminate, hand off, wait, or cleanly transition to another node. It MUST expose at least a terminal/exit destination and a handoff destination.
- Runtime complexity MUST remain hidden unless an operator genuinely needs to control it.

## Conversation Node Drill-Down Surface (normative view contract)

When an operator opens a Conversation node, the focused editor MUST present the reduced surface:

```text
Source -> Opening -> Reply -> Decision -> Response -> Exit
```

Enumerated as `ConversationSurfaceStage`. The editor MUST NOT surface queue internals, classifiers, persistence steps, retries or runtime machinery by default. This surface is a projection over the underlying Script; it is not the runtime step model, which the engine continues to walk unchanged.

## How the Abstraction Sits Above the Runtime (critical constraint)

- The Journey layer is **additive**. Nothing in the existing compile/execute path changes.
- A Conversation node's `nodeFlowRef` points at an `OfMessageScript` id (with optional version). Opening the node loads that script's existing visual builder / steps through the existing `flowFromConversationFlow` seam in `apps/creator-cockpit/src/lib/flowBuilder.ts`; the runtime still runs the compiled steps via `processConversationInstance` in `worker.ts`.
- The existing single builder graph is **reframed**: what is today "the whole playbook graph" becomes the internal Node Flow of one Conversation node. The Playbook Journey is the new default workspace that sits above it.
- Migration is **representational, not behavioural**: existing scripts keep running; a Journey can be authored that references them without touching their execution.

## Proposed Persistence Surface (specified for NODE-1C; not implemented here)

The smallest surface stores a single JSONB "journey graph document", mirroring the existing `of_message_scripts.builder_config` and `creator_playbook_proposals.proposal_payload` precedents - both of which explicitly do not write to runtime tables.

- Option A (fastest): add a `journey_graph jsonb` column to an existing journey-owning row.
- Option B (recommended): a new `playbook_journeys` table:

```text
playbook_journeys (
  id uuid primary key,
  creator_id uuid references of_creators(id),
  title text,
  status text check (status in ('draft','active','archived')),
  version integer not null default 1,
  graph jsonb not null default '{}',   -- JourneyGraph
  created_at timestamptz,
  updated_at timestamptz
)
```

The `graph` JSONB holds `nodes` (class, position, group, config, `nodeFlowRef`), `connections` (from/to/port/label), `groups` and `viewport` - i.e. a `JourneyGraph`. Conversation node flow references point to `of_message_scripts.id`. No changes to `of_message_script_steps`, `of_conversation_instances`, or runtime code. Row ownership and RLS follow the existing creator-scoped patterns.

## Architectural Invariants

The following invariants are mandatory and MUST be preserved across UI, API, domain, persistence and integration layers:

- Channel != Identity
- Provisional identity != Canonical identity
- Creator authentication != Fan identity
- Node-local state != Journey state
- Journey (intent / map) != Runtime (execution)
- Node Flow surface != Runtime machinery
- A Conversation node MUST reach a terminal, handoff, wait, or transition

## Worked Example - Emma's New Subscriber Funnel (illustrative)

This example validates the contract end to end. It is illustrative only; the real migration is NODE-1E.

Journey (three nodes):

```text
OnlyFans (Channel) -> New Subscriber Chat (Conversation) -> Human Handoff (Human)
```

- **OnlyFans (Channel)** - transport only. Emits a provisional subscriber reference from the new-subscriber event. Owns no identity and no onboarding. Destination: `new_subscriber`.
- **New Subscriber Chat (Conversation)** - `nodeFlowRef` -> the existing New Subscriber script. Bounded to a short flow (NSP-5: stop once meaning is established). Drill-down surface:
  - Source: the new-subscriber event
  - Opening: welcome message
  - Reply: fan response
  - Decision: interpretation / response class
  - Response: at most one bounded follow-up
  - Exit: handoff or terminal outcome
  - Destinations: `handoff`, `terminal`.
- **Human Handoff (Human)** - prepares a Queue item carrying the NSP-5 minimum handoff payload: creator, subscriber, conversation, triggering event, current Journey, Journey direction, current conversation state, latest interpretation, detected Opportunity (if any), relationship context, selected archetype/baseline, recommended next objective, suggested response, confidence, reason for Queue entry.

What the operator does NOT see in the Conversation drill-down: queue internals, classifiers, persistence, retries, or the full 44-step deterministic tree.

A typed form of this journey is provided in `@funkmyfans/of-types` as `EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE` (a `PlaybookJourney`) so the contract is exercised by the compiler.

## Open Questions

- Journey graph storage: new table vs column (resolved in NODE-1C; Option B recommended).
- Whether a Journey maps one-to-one to an ADR-0001 Playbook or composes several. Proposed: a Journey expresses one Playbook's intent while composing Scripts; revisit if multi-playbook journeys emerge.
- Port model richness: typed ports vs simple keyed destinations. Proposed: start with simple keyed destinations.
- The detailed Identity resolution contract with Subscriber Profile / HOST primitives is deferred to the Identity slice.

## Change Control

Per ADR-0001, this architectural change requires a written ADR, architecture review, and approval before implementation. NODE-1A delivers this ADR (Proposed) plus the type contracts in `@funkmyfans/of-types`. NODE-1B through NODE-1E proceed only after approval.
