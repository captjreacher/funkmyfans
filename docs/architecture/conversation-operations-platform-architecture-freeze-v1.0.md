# ADR-0001 - Conversation Operations Platform Architecture Freeze v1.0

## Status

Accepted

## Purpose

This ADR freezes the canonical architecture for the Conversation Operations Platform v1.

The Conversation Operations Platform is the creator-facing operating surface for managing conversations, identifying opportunities, applying playbooks, and coordinating governed work across queues and scripts.

The platform MUST remain a product-domain system owned by FunkMyFans. It MUST consume HOST Kernel primitives for generic event, workflow, execution, registry, MCP, and AI-governance capabilities rather than duplicating those concerns locally.

## Scope

This architecture governs:

- the product-domain model for creator conversation operations
- the canonical terminology used by implementation teams
- the bounded contexts owned by FunkMyFans
- the integration boundary to HOST Kernel
- UI, API, read-model, and domain-layer dependency rules
- versioning, audit, monitoring, and governance rules for v1 implementation

This architecture applies to all future implementation work for the Conversation Operations Platform unless replaced by a later ADR.

## Non-Goals

This ADR does not:

- define product roadmap sequencing
- define UI visual design
- define implementation code structure
- define database physical design beyond architecture constraints
- define HOST Kernel internals
- define MGRNZ roadmap governance mechanics
- introduce new runtime behavior
- introduce product-local workflow, registry, execution, or MCP engines
- resolve future commercialization, packaging, or billing policy

## Architectural Principles

The platform MUST follow these principles:

- Conversation-first
- Queue-first operations
- Playbook-driven workflows
- Template-first authoring
- Deterministic before AI
- Product owns business capability
- HOST owns platform capability
- Registry is taxonomy, not business logic
- Audit is evidence
- Monitoring is telemetry
- Versioned production behavior only
- Read models MAY be duplicated; source of truth MAY NOT
- Architectural changes REQUIRE explicit review and approval before implementation

## Canonical Domain Model

The product hierarchy is fixed as:

```text
Conversation
  -> Conversation Opportunity
  -> Playbook
  -> Template
  -> Script
  -> Version
  -> HOST Runtime
```

### Layer Responsibilities

| Layer | Responsibility | Notes |
| --- | --- | --- |
| Conversation | Owns interaction state, participants, history, ownership, lifecycle | It MUST NOT decide business strategy |
| Conversation Opportunity | Owns business meaning identified inside a conversation | It MAY reference playbooks and queue items |
| Playbook | Owns business strategy for handling an opportunity | It MUST describe intent, not runtime mechanics |
| Template | Owns reusable production-safe implementation patterns | It MUST be reusable across creators where permitted |
| Script | Owns creator-specific configuration of a template | It MUST remain deterministic and versioned |
| Version | Owns an immutable deployed revision | Live versions MUST NOT be edited |
| HOST Runtime | Owns generic workflow, execution, durable execution, registry, MCP, and AI-governance primitives | This layer is HOST-owned and not product-local |

## Bounded Contexts

### FunkMyFans-owned bounded contexts

- Creator Workspace
- Subscriber Profile
- Conversation
- Conversation Interpretation
- Conversation Opportunity
- Queue Management
- Playbook Studio
- Template Library
- Product Read Models

### HOST Kernel-owned bounded contexts / primitives

- Event model
- Workflow runtime
- Execution runtime
- Durable execution
- Registry
- MCP integration
- Generic AI governance primitives

### Supporting or future contexts

- Testing and Simulation
- Deployment and Release
- Audit and Compliance
- Monitoring and Reporting
- Integration / Channel Adapters
- Workflow / Task Management
- Commercialization / Entitlements

## Ownership Matrix

| Object | Owner | Source of truth | Lifecycle owner | Consumers |
| --- | --- | --- | --- | --- |
| Creator | FunkMyFans | Creator workspace / product-domain store | FunkMyFans | Conversation, Queue, Playbook, UI, read models |
| Subscriber | FunkMyFans | Subscriber profile | FunkMyFans | Conversation, Queue, Opportunity, read models |
| Conversation | FunkMyFans | Conversation context | FunkMyFans | Queue, Opportunity, Playbook, Audit, Monitoring |
| Conversation Opportunity | FunkMyFans | Conversation interpretation / opportunity store | FunkMyFans | Queue, Playbook, read models |
| Queue | FunkMyFans | Queue management | FunkMyFans | Conversation, Opportunity, UI, Monitoring |
| Queue Item | FunkMyFans | Queue management | FunkMyFans | Queue, Conversation, Opportunity, UI |
| Playbook | FunkMyFans | Playbook studio | FunkMyFans | Template, Script, UI, read models |
| Template | FunkMyFans | Template library | FunkMyFans | Playbook, Script, testing, deployment |
| Script | FunkMyFans | Script configuration / product-domain script store | FunkMyFans | Template, Version, testing, deployment |
| Version | FunkMyFans | Script version store | FunkMyFans | Runtime, audit, monitoring, release |
| Registry entry | HOST Kernel | HOST registry | HOST Kernel | FunkMyFans UI, interpretation, playbooks, queues |
| Runtime invocation | HOST Kernel | HOST execution runtime | HOST Kernel | FunkMyFans script and conversation read models |
| Audit entry | FunkMyFans for product actions; HOST for shared primitives where applicable | Immutable audit store | Owning context | Monitoring, review, compliance |
| Monitoring snapshot | FunkMyFans | Derived telemetry store | FunkMyFans | UI, reporting, operations |

## Architectural Invariants

The following invariants are mandatory:

- Conversation != Queue
- Queue Item != Conversation
- Playbook != Template
- Template != Script
- Script != Runtime
- Registry != Business Logic
- Audit != Monitoring
- AI Governance != AI Execution
- Conversation Opportunity != Queue Item
- Version != Live Editable Draft

These invariants MUST be preserved across UI, API, domain, persistence, and integration layers.

## Dependency Rules

### Allowed dependency direction

- Product UI -> product read models
- Product UI -> application services
- Application services -> product domain
- Product domain -> HOST Kernel primitives only through explicit contracts
- FunkMyFans bounded contexts -> HOST primitives
- Read models -> may consume multiple contexts

### Forbidden dependency direction

- HOST primitives MUST NOT depend on FunkMyFans product code
- Product code MUST NOT depend on HOST internals
- Conversation MUST NOT depend directly on Queue as a source of truth
- Script Design MUST NOT depend directly on Script Runtime internals
- Registry MUST NOT contain business rules
- AI policy MUST NOT be embedded as execution logic
- Monitoring MUST NOT be treated as an audit ledger

### Directional contracts

- Event Intake and Conversation Interpretation MUST feed Conversation and Opportunity, not bypass them.
- Queue Management MUST own work assignment and priority, not conversation semantics.
- Playbook Studio MUST consume registry taxonomy and template definitions, not define platform primitives.
- Script Versioning MUST remain immutable once deployed.
- HOST Runtime MUST be treated as an external primitive from the product-domain perspective.

## Extension Rules

Future capabilities MUST be added by extending the appropriate owning context without violating the frozen boundaries.

### New Playbooks

- New playbooks MUST be modeled as product-domain strategy objects.
- New playbooks MUST reuse existing template and script versioning rules.
- New playbooks MUST NOT introduce new workflow engines.

### New Templates

- New templates MUST remain reusable, production-safe starting points.
- Template inheritance MUST not mutate deployed script versions.

### New Channels

- New channels MUST enter through an event-intake or adapter boundary.
- Channel-specific meaning MUST be normalized into Conversation Interpretation and Conversation Opportunity.
- Channel adapters MUST not become source-of-truth domains.

### New AI Policies

- New AI policies MUST be governed through HOST-aligned primitives.
- AI policies MUST constrain behavior inside approved boundaries only.
- AI policies MUST NOT bypass deterministic workflow or version control.

### New Queue Types

- New queues MUST remain work-ownership constructs.
- New queues MUST not redefine conversation semantics.
- Queue types MUST be represented as taxonomy or configuration, not code branches in business logic.

### New Opportunity Types

- New opportunity types MUST be introduced through registry-backed taxonomy and conversation interpretation.
- Opportunity types MUST remain business meaning, not execution behavior.

## Naming Rules

The canonical business language MUST be used in product documents, APIs, UI labels, and implementation names where practical:

- Conversation
- Conversation Opportunity
- Playbook
- Template
- Script
- Version
- Queue
- Queue Item
- Conversation Interpretation
- Playbook Studio

The following deprecated terms MUST NOT reappear as primary product language:

- Automation Builder
- Script Engine
- Conversation Engine
- Chat Event Mapping

Those terms MAY appear only when referring to legacy internals or transitional adapters.

## Implementation Rules

Developers MUST NOT:

- introduce a product-local workflow engine
- introduce a product-local registry engine
- introduce a product-local execution engine
- encode business rules inside registry data
- execute AI outside governed boundaries
- edit live versions directly
- merge conversation state into queue ownership state
- treat monitoring data as audit evidence
- use runtime internals as the source of truth for UI labels
- bypass versioned deployment semantics for live behavior

Developers SHOULD:

- prefer explicit contracts between contexts
- keep write models and read models separate
- preserve deterministic behavior in the absence of AI
- add new behavior through owned contexts, not shared shortcuts

## Change Control

This architecture MAY evolve only through controlled change.

Any architectural change requires:

1. A written ADR
2. Architecture review
3. Approval before implementation

Implementation work MUST NOT begin until the change has been approved.

## Final Architecture Statement

This ADR freezes the Conversation Operations Platform v1 architecture as the implementation baseline.

All future work on the Conversation Operations Platform MUST conform to this frozen contract unless and until a new ADR explicitly supersedes it.
