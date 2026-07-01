# Conversation Operations Platform
## Product Requirements Document and Architecture Specification

Status: approved UX direction, implementation pending

This document defines the next-generation Conversation Operations Platform as the operational core of the Creator Cockpit. It treats playbooks, opportunities, and governed conversation work as the center of the product, with automation as a downstream implementation concern.

This is a product and architecture specification, not an implementation plan. The intent is to give AI coding agents enough structure to build consistently without making their own product decisions.

## 1. Product Vision

### 1.1 Problem Statement

The current chat automation model is too narrow for the real work operators perform. Teams do not primarily think in terms of automation rules. They think in terms of conversations, opportunities, queues, subscriber states, escalations, tasking, and governed response workflows across creators.

The platform solves the problem of operating creator conversations at scale while preserving human judgment, deterministic execution, and safe AI assistance.

### 1.2 Primary Users

- Creator: owns audience relationships, approves important actions, reviews escalations, and monitors results.
- Moderator: handles day-to-day queue work, triage, assignment, and escalations across one or more creators.
- Agency operator: manages multi-creator operations, staffing, governance, reporting, and shared workflows.
- Administrator: defines roles, registry values, system settings, and platform governance.
- AI: not a user in the human sense, but an approved participant inside governed nodes and bounded workflows.

### 1.3 What the Platform Is

The Conversation Operations Platform is a governed operating system for subscriber conversations. It supports:

- Inbox and queue operations
- Subscriber lifecycle management
- Event-driven routing
- Conversation interpretation
- Playbook-guided execution
- Template-based conversation design
- Simulation, testing, deployment, and monitoring
- Human override and approval workflows
- Controlled AI assistance

### 1.4 What the Platform Is Not

- Not a generic CRM
- Not a free-form chatbot builder
- Not a ticketing system
- Not a prompt playground
- Not a message broker disguised as a UI

The distinction matters: the platform must preserve an operations-first mental model where queues, conversations, and governed scripts are the primary objects.

### 1.5 Guiding Principles

- Queues are the operational center.
- Conversations are the primary working surface when a creator is selected.
- Conversation opportunities are identified from operational context, not administration screens.
- Templates come before customization.
- Scripts are deterministic first and AI-assisted second.
- AI only operates inside approved, bounded nodes.
- Wizards are preferred over dense configuration forms.
- The interface should support high-volume work without sacrificing clarity.
- Production behavior must remain governed, auditable, and reversible.

### 1.6 Business Hierarchy

Conversation
-> Conversation Opportunity
-> Playbook
-> Template
-> Script
-> Version
-> HOST Runtime

Each layer has a distinct responsibility:

- Conversation: ongoing interaction between creator and subscriber
- Conversation Opportunity: business meaning identified inside a conversation
- Playbook: business strategy for handling an opportunity
- Template: reusable production-safe playbook pattern
- Script: creator-specific implementation of a template
- Version: immutable deployed revision
- HOST Runtime: generic execution and workflow primitives owned by HOST

## 2. Information Architecture

### 2.1 Workspace Hierarchy

The platform is organized into the following workspaces:

1. Dashboard
2. Creators
3. Conversations
4. Queues
5. Subscribers
6. Events
7. Playbooks
8. Templates
9. Testing
10. Monitoring
11. Reports
12. Administration
13. Settings

### 2.2 Navigation Model

The navigation is split into two layers:

- Operational layer: Conversations, Queues, Subscribers, Events
- Design and governance layer: Playbooks, Templates, Testing, Monitoring, Reports, Administration, Settings

Navigation contracts:

- The global shell remains persistent across workspace changes.
- Selecting a creator changes operational context, not the product model.
- The queue view is the default operational landing surface.
- The conversation workspace is the default detail surface after a creator is selected.
- Playbooks and Templates are creation surfaces for deterministic assets, not general administration pages.
- Administration and Settings are reserved for platform governance and account-level configuration.

### 2.3 Screen Definitions

| Screen | Purpose | Primary objects | Key regions | Primary actions |
| --- | --- | --- | --- | --- |
| Dashboard | High-level operational health and priorities | Creators, queues, conversations, events, tasks | KPI strip, priority alerts, recent activity, health panels | Open queues, open creators, jump into tasks, review anomalies |
| Creators | Manage creator accounts and creator-level operations | Creator, creator settings, creator queues | Creator list, summary cards, status and health, creator actions | Open creator workspace, connect creator, edit creator context |
| Conversations | Search and review conversations across the platform | Conversation, subscriber, queue, events | Search/filter bar, conversation list, detail drawer | Open conversation, assign, escalate, archive, create task |
| Queues | Operational command center for work intake and ownership | Queue, queue item, conversation | Queue board, queue list, backlog metrics, assignment controls | Claim, assign, move, pause, prioritize, resolve |
| Subscribers | Subscriber profile and lifecycle workspace | Subscriber, segments, events, conversations | Subscriber summary, history, tags, tasks, related conversations | Add note, segment, open conversation, inspect events |
| Events | Event history and normalized event stream | Event, registry event type, subscriber, conversation | Event stream, filters, event detail, raw payload view | Inspect, correlate, replay, open related objects |
| Playbooks | Deterministic playbook design and versioning | Playbook, template, script, version | Playbook Studio, version timeline, test panel | Select opportunity, choose playbook, configure script, validate, test, publish |
| Templates | Reusable production-safe patterns | Template, template version, inheritance | Template library, preview, publish controls, usage info | Create, fork, publish, apply, version |
| Testing | Validation, simulation, replay, path coverage | Script version, test run, replay case | Scenario picker, simulation output, coverage map, errors | Run validation, preview, replay, compare paths |
| Monitoring | Real-time operational and AI health | Queue metrics, script metrics, AI metrics | Live KPIs, trends, alerts, outliers | Investigate, filter, open queue/script/conversation |
| Reports | Historical analysis and exports | Aggregated metrics, outcomes, cohorts | Report library, time range, comparisons, exports | Save report, export, schedule, share |
| Administration | Registry, permissions, packs, governance | Registry entries, roles, packs, overrides | Governance panels, registry tables, access controls | Manage taxonomy, permissions, packs, overrides |
| Settings | Tenant and creator preferences | Tenant settings, creator settings, AI guardrails | Settings sections, policy controls, defaults | Update preferences, safety rules, defaults |

### 2.4 Conversation Workspace

The Conversation workspace is the primary operational view after a creator is selected.

Layout contract:

- Left: queue panel
- Center: conversation panel
- Right: subscriber summary and operational context
- Secondary drawer: opportunity detail, playbook detail, audit trail, task detail, deployment detail

This workspace must allow an operator to manage work without leaving the conversation.

## 3. Operational Model

### 3.1 Daily Creator Workflow

1. Open the selected creator workspace.
2. Review queue health and outstanding exceptions.
3. Work from the highest-priority queue items.
4. Answer or approve sensitive conversations.
5. Inspect opportunity outcomes and active playbooks.
6. Review escalations and unresolved items.
7. Exit with clear backlog visibility.

### 3.2 Moderator Workflow

1. Open the queue center.
2. Triage unread and needs-reply conversations.
3. Claim, assign, or escalate items.
4. Apply scripts, templates, or canned actions where appropriate.
5. Record notes, tasks, and handoffs.
6. Resolve or forward the conversation with auditability.

### 3.3 Agency Workflow

1. Monitor multiple creators from a single operational view.
2. Manage queue capacity and staffing.
3. Review trends, exceptions, and policy risks.
4. Control shared templates, registry options, and permissions.
5. Manage escalations and performance reporting.

### 3.4 AI-Assisted Workflow

1. A governed node requests AI assistance.
2. The AI receives only approved context.
3. The AI returns a bounded suggestion or action.
4. The workflow checks confidence, policy, and limits.
5. The result either proceeds, falls back to deterministic logic, or escalates to a human.

### 3.5 Exception Handling

Exception categories include:

- Missing or conflicting subscriber data
- High-value purchase or payment edge cases
- Safety, compliance, or policy restrictions
- Creator unavailable
- Queue overload
- AI confidence too low
- Script version mismatch
- Deployment or validation failure

### 3.6 Escalation Model

Escalation moves work from:

- Playbook-owned handling to human
- Moderator to creator
- Creator to administrator
- AI to deterministic fallback

Escalations must always be visible in the audit trail and queue history.

## 4. Interaction Flows

### 4.1 From Event to Conversation

1. A subscriber message or platform signal arrives as an event.
2. The event is normalized, interpreted, and classified into a conversation opportunity.
3. The routing layer determines the target queue and ownership model.
4. A conversation is opened or updated.
5. The operator sees the item in the relevant queue.
6. A human, script, or AI node handles the next step.

### 4.2 From Conversation to Script

1. The operator is in the conversation workspace.
2. The operator identifies a repeatable conversation opportunity or use case.
3. The operator creates a playbook from an approved template.
4. The script is validated, previewed, and tested.
5. The script is deployed under governed conditions.

### 4.3 From Subscriber to Segmentation

1. The operator opens the subscriber summary.
2. The operator inspects activity, events, and conversation history.
3. The operator adds the subscriber to a reusable audience definition.
4. Audience membership can drive future scripts, reporting, and routing.

### 4.4 From Queue to Resolution

1. The queue item is claimed or assigned.
2. The operator reviews the conversation context.
3. A deterministic action, human response, or approved AI node executes.
4. The conversation moves to waiting, escalation, or completion.
5. The queue item state updates and the audit trail is appended.

### 4.5 From Draft to Production

1. Draft script version is created from a template.
2. Validation checks structural integrity and policy compatibility.
3. Preview confirms what the user will see.
4. Testing covers key paths and replay scenarios.
5. Deployment creates an immutable release record.
6. Live test is limited and governed.
7. Production execution begins.
8. Monitoring tracks outcomes and exceptions.
9. Archive preserves history.

## 5. Conversation Lifecycle

The lifecycle is event-driven and stateful:

Subscriber
-> Incoming message
-> Event
-> Conversation Interpretation
-> Conversation Opportunity
-> Queue
-> Conversation
-> Decision
-> Opportunity / Human / HOST Runtime
-> Completion

Decision points:

- Is the event recognized?
- Does the subscriber already have an active conversation?
- Which queue should own the work?
- Can a playbook and script handle the case deterministically?
- Is AI allowed in this node?
- Is human approval required?
- Is creator intervention required?
- Does the conversation wait for a subscriber reply?
- Should the item escalate?
- Is the conversation complete or archived?

## 6. Queue Architecture

### 6.1 Queue as a First-Class Object

A queue is an operational object, not just a filter. It primarily manages conversation opportunities, not unread messages, conversations, or subscribers. It defines ownership, priority, routing, assignment behavior, and operational metrics.

### 6.2 Standard Queues

- Unread
- Needs Reply
- Waiting
- Pending Purchase
- VIP
- Creator
- Team
- AI
- Escalated
- Scheduled
- Completed

### 6.3 Queue Rules

- Ownership: every queue has a defined owner scope, such as creator, team, AI, or system.
- Priority: queues may override default sort order by urgency, SLA, or business value.
- Routing: incoming events map to queues using deterministic rules and registry-backed classifications.
- Assignment: queue items may be auto-assigned, manually claimed, or forwarded.
- Queue items reference the conversation, conversation opportunity, current playbook, current owner, priority, and status.
- Transition: moving a conversation between queues must create an audit entry.
- Metrics: queue health includes backlog, age, throughput, SLA misses, resolution rate, escalation rate, and response time.

### 6.4 Queue Metrics

- Open item count
- Average age
- Median time to first response
- Median time to resolution
- Queue-specific escalation rate
- Creator load
- Moderator load
- AI share
- Reopen rate

## 7. Conversation Model

The Conversation Model is the coordination layer that manages conversation state, routing, ownership, and auditability.

### 7.1 Responsibilities

- Maintain conversation state
- Determine queue ownership
- Apply deterministic routing
- Permit governed AI participation
- Support human replies and overrides
- Maintain shared inbox behavior
- Append immutable history and audit events

### 7.2 Ownership Model

Ownership states include:

- Unassigned
- Queue-owned
- Human-owned
- Creator-owned
- AI-owned
- Shared-owned
- Escalated

Ownership is separate from the conversation state. A conversation can be open and queue-owned, or waiting and creator-owned, for example.

### 7.3 Shared Inbox Behavior

- Multiple operators may view the same conversation.
- Claiming a conversation should create a clear assignment event.
- Manual override must be visible.
- Concurrent edits should be prevented or reconciled with explicit conflict handling.

### 7.4 Audit and History

All meaningful state changes must be captured:

- Incoming event received
- Queue transition
- Assignment change
- Human response sent
- AI suggestion accepted or rejected
- Escalation raised
- Script step executed
- Deployment version referenced
- Completion or archive event

## 8. Script Model

Scripts are deterministic implementation assets. They are versioned, testable, and governed.

### 8.1 Script Object

A script represents the creator-specific implementation of a playbook. A script references one or more versions, each version containing a node graph.

### 8.2 Core Rules

- No free-form prompt chains.
- Production execution references an immutable version.
- Draft edits create a new version.
- Script execution must be observable and replayable.

### 8.3 Node Types

Supported node families should include:

- Trigger
- Condition
- Message
- Assignment
- Delay
- Wait
- Branch
- Retry
- Escalation
- Approval
- Completion
- Governed AI node

### 8.4 Routing and Forks

- Branches must be explicit and deterministic.
- Forks must define rejoin or terminal behavior.
- Routing decisions must be explainable from the node graph.

### 8.5 Delays, Waiting, and Retries

- Delays should be scheduled and visible.
- Waiting nodes should pause execution until a signal or timeout arrives.
- Retries should have bounded count, timing, and fallback behavior.

### 8.6 Escalation and Completion

- Escalation transfers control to a human or higher-scope workflow.
- Completion closes the current execution path while preserving audit history.

## 9. Template System

Templates are reusable production-safe playbook patterns.

### 9.1 Template Library

The template library is the starting point for new scripts. Users should begin from templates rather than blank scripts.

### 9.2 Template Concepts

- Global templates available to all eligible users
- Creator templates scoped to a creator or agency
- Template versioning
- Template inheritance
- Template customization
- Template publishing

### 9.3 Template Behavior

- A template defines a stable pattern, not a one-off script.
- Customization produces a derived template or a script version depending on scope.
- Published templates are immutable and versioned.
- Template packs may be imported later without changing the basic model.

## 10. Audience and Segmentation

Audience definitions are reusable subscriber groupings used by scripts, reports, and routing.

### 10.1 Supported Audience Types

- Standard subscriber groups
- Custom groups
- Reusable filters
- Dynamic audiences
- Future expansion for campaign or lifecycle segments

### 10.2 Audience Rules

- Audiences should be reusable across creators when permitted.
- Dynamic audiences should evaluate from filters rather than requiring manual membership management.
- A script can target an audience but should not own the audience definition.

## 11. AI Governance

AI must operate inside explicit governance. It is a bounded participant, not an autonomous control plane.

### 11.1 AI Principles

- AI enhances deterministic flows.
- AI does not replace the workflow graph.
- AI behavior is constrained by node type, context boundaries, and safety settings.
- AI is never allowed to change registry data, role boundaries, or production deployment state.

### 11.2 Approved AI Nodes

AI can only act in approved node types or approved script sections.

### 11.3 Governance Controls

- Prompt ownership
- Approved context boundaries
- Response length limits
- Confidence thresholds
- Escalation rules
- Fallback rules
- Maximum AI depth
- Prohibited behavior list

### 11.4 Prohibited Behavior

- Unbounded free-form conversation control
- Unauthorized commitments or guarantees
- Unsafe or policy-violating content
- Unauthorized data exposure
- Bypassing human approval for protected actions

## 12. Human Governance

### 12.1 Roles in Human Governance

- Creator actions: approve, override, review, publish, resolve
- Moderator actions: triage, assign, escalate, close, annotate
- Administrator actions: govern, configure, audit, disable, restore

### 12.2 Shared Team Queues

Shared queues allow multiple operators to work a common backlog. The system must support:

- Claiming
- Releasing
- Reassigning
- Visibility of ownership
- Activity audit

### 12.3 Approvals and Overrides

- Sensitive actions may require approval.
- Overrides must record who acted, when, why, and against which version.
- Manual intervention must remain auditable and reversible where possible.

## 13. Testing Framework

Every script must support validation, simulation, preview, replay, path coverage, and deployment checks.

### 13.1 Test Modes

- Validation: structural and policy checks
- Preview: what the operator will see
- Simulation: execute against synthetic subscriber cases
- Replay: run recorded conversation history through a version
- Path coverage: prove branch coverage across important routes
- Deployment checks: verify release readiness

### 13.2 Test Principles

- Every meaningful path should be exposed.
- Failed checks should identify the exact node or rule that broke.
- Tests should be deterministic and reproducible.
- Test outputs should be comparable across versions.

## 14. Deployment Lifecycle

### 14.1 Lifecycle Stages

Draft
-> Validate
-> Preview
-> Test
-> Deploy
-> Live Test
-> Production
-> Monitor
-> Archive

### 14.2 Rules

- Production scripts are not edited directly.
- Editing a live flow creates a new draft version.
- Deployment should reference immutable versions.
- Live test must be limited and governed.
- Archive preserves historical releases and their outcomes.

## 15. Monitoring

Monitoring is the operational view of how the platform is behaving now.

### 15.1 Required Metrics

- Queue health
- Script performance
- AI utilization
- Fallback rate
- Escalation rate
- Response times
- Completion rates
- Subscriber outcomes
- Creator workload

### 15.2 Monitoring Behavior

- Monitor metrics should be near-real-time.
- Alerts should be actionable, not noisy.
- Monitoring must link back to queues, conversations, scripts, and deployments.

## 16. Reports

Reports are the historical and comparative counterpart to monitoring.

### 16.1 Report Categories

- Queue performance
- Creator performance
- Script performance
- AI usage
- Escalation and approval trends
- Audience and subscriber outcomes
- Deployment outcomes

### 16.2 Reporting Rules

- Reports should support filters, comparisons, and exports.
- Historical summaries should not be used as runtime state.

## 17. Domain Model

### 17.1 Core Objects

| Object | Purpose | Key Relationships |
| --- | --- | --- |
| Creator | Owns a creator workspace and its operational data | Has many subscribers, conversations, scripts, templates, queues, settings |
| Subscriber | Represents a fan or contact | Belongs to creators, appears in conversations, events, audiences |
| Conversation | The active interaction thread | Belongs to creator and subscriber, moves through queues, has history |
| Queue | Operational bucket and ownership surface | Contains queue items and references routing rules |
| Event | Normalized platform signal | Belongs to subscriber and often to conversation |
| Conversation Opportunity | Business meaning identified inside a conversation | Belongs to a conversation, may reference playbooks and queue items |
| Playbook | Business strategy for handling an opportunity | Has templates, scripts, and goals |
| Script | Deterministic implementation asset | Has versions, nodes, deployments |
| Template | Reusable pattern for creating scripts | Has versions and inheritance relationships |
| Version | Immutable deployed revision | Belongs to a script and may be promoted or archived |
| Node | Step in a script graph | Belongs to a script version and routes execution |
| Audience | Reusable subscriber definition | Used by scripts, reports, and routing |
| Deployment | Release record for a script version | Points to a specific script version and state |
| Runtime Invocation | HOST-owned execution instance | Tied to a conversation and deployment through HOST runtime |
| AI Session | HOST-owned governed AI interaction record | Nested within runtime execution or conversation |
| Escalation | Handoff or exception record | Belongs to a conversation and may create tasks |
| Task | Manual follow-up work item | Can arise from conversations, escalations, or reviews |
| Audit Entry | Immutable change record | References objects, actors, actions, and timestamps |

### 17.2 Relationship Rules

- One creator can own many playbooks, scripts, queues, and conversations.
- One subscriber can participate in many conversations over time.
- One conversation can have many events, opportunities, tasks, escalations, and audit entries.
- One script can have many versions, but only one active deployed version at a time per scope.
- One template can generate many scripts or template instances.

## 18. State Model

### 18.1 Conversation State

Suggested conversation states:

- New
- Routed
- Open
- Waiting Subscriber
- Waiting Creator
- Waiting Team
- Waiting AI
- Escalated
- Completed
- Archived

Conversation state is independent from queue ownership.

### 18.2 Conversation Opportunity State

Suggested opportunity states:

- Identified
- Queued
- Assigned
- In Playbook
- Waiting Human
- Waiting Subscriber
- Escalated
- Resolved
- Dismissed

### 18.3 Queue Item State

Suggested queue item states:

- Visible
- Claimed
- Assigned
- Snoozed
- Escalated
- Completed

### 18.4 Script Version State

Suggested script version states:

- Draft
- Validating
- Previewable
- Testing
- Approved
- Deployed
- Live Testing
- Active
- Paused
- Superseded
- Archived

### 18.5 AI Session State

Suggested AI session states:

- Pending approval
- Active
- Blocked
- Escalated
- Completed

### 18.6 State Transition Rules

- State transitions must be explicit.
- Every transition should create a history or audit event.
- Invalid transitions should fail fast.
- Terminal states should not be silently reopened without a new event.

## 19. Permissions

Permissions combine role, scope, and object ownership.

### 19.1 Role Boundaries

| Role | Scope | Allowed Focus |
| --- | --- | --- |
| Agency | Multi-creator | Oversight, staffing, governance, reporting, cross-creator operations |
| Creator | Own creator scope | Conversation review, approvals, creator-specific configuration, script oversight |
| Moderator | Assigned creator or team scope | Triage, assignment, escalation, day-to-day queue work |
| AI | Governed node scope only | Suggestions or bounded actions inside approved workflows |
| Administrator | Platform scope | Registry, roles, packs, settings, security, compliance |

### 19.2 Permission Principles

- Creator and moderator permissions must be scoped to the assigned creator or team.
- AI has no direct administrative privileges.
- Production deployment should require explicit authorization.
- Registry edits should be restricted to governance roles.
- Sensitive actions should be logged and recoverable.

## 20. API View Models

The backend should expose UI-oriented view models that combine domain objects into screen-ready payloads. These are not raw tables.

### 20.1 Shell View Model

Purpose: populate the global app shell.

Contains:

- Current user and permissions
- Available creators and scope
- Top-level navigation state
- Alerts and counters
- Feature flags or entitlement markers

### 20.2 Conversation Workspace View Model

Purpose: drive the primary creator conversation surface.

Contains:

- Selected creator
- Queue list and counts
- Selected queue
- Conversation list
- Selected conversation detail
- Subscriber summary
- Opportunity status
- Active playbooks
- Related events
- History and audit trail
- Available actions based on permissions

### 20.3 Queue View Model

Purpose: show operational queues and ownership state.

Contains:

- Queue definitions
- Queue counts and health
- Queue priorities
- Assignment state
- SLA and age metrics
- Queue item summaries

### 20.4 Subscriber View Model

Purpose: show subscriber context and history.

Contains:

- Subscriber profile
- Creator relationships
- Segments and audiences
- Conversation history
- Events and purchases
- Tasks and notes
- Risk flags and preferences

### 20.5 Event View Model

Purpose: show a normalized event stream.

Contains:

- Event type and classification
- Timestamp and source
- Related subscriber and conversation
- Routing outcome
- Payload summary
- Replay or correlation links

### 20.6 Script View Model

Purpose: drive the playbook and script design, versioning, and deployment UI.

Contains:

- Playbook metadata
- Script configuration
- Current version and version history
- Template origin
- Node graph summary
- Validation status
- Test results
- Deployment status
- Active queue and audience bindings

### 20.7 Template View Model

Purpose: power the template library.

Contains:

- Template metadata
- Version history
- Intended use case
- Inheritance and customization data
- Publish state
- Usage counts

### 20.8 Testing View Model

Purpose: show validation and simulation state.

Contains:

- Target script version
- Scenario list
- Replay cases
- Coverage results
- Failures and warnings
- Test-run outputs

### 20.9 Monitoring and Reports View Models

Purpose: support operations and analysis.

Contains:

- Metric cards
- Time series
- Queue and script breakdowns
- AI and escalation trends
- Outcome comparisons

### 20.10 Administration View Model

Purpose: expose registry and governance settings.

Contains:

- Registry entries
- Role definitions
- Pack and override controls
- Safety settings
- Global defaults

## 21. Registry and Taxonomy

The platform should rely on backend registry data for taxonomy values rather than hardcoded UI copy.

Registry categories include:

- Event types
- Conversation classifications
- Routing destinations
- Playbook goals
- Playbook styles
- Queue states

Registry data supports:

- Consistent UI labeling
- Declarative routing and classification
- Future premium or marketplace expansion
- Creator-specific overrides
- Analytics on option usage and adoption

## 22. Implementation Phases

### Phase 1: Platform Foundation

Goals:

- Define the platform object model and registry taxonomy.
- Establish view models for core workspaces.
- Set up permission boundaries and navigation contracts.
- Ensure the shell can support the new conversation-first IA.

Exit criteria:

- Screens and payloads are consistent with the new platform vocabulary.
- Registry-backed UI options replace hardcoded taxonomy where applicable.
- No behavior changes to execution logic.

### Phase 2: Queue-First Operations

Goals:

- Make queues the primary operational center.
- Implement the Conversation workspace as the default creator surface.
- Support assignment, claim, escalation, and queue transitions.

Exit criteria:

- Operators can manage the daily workload without leaving the conversation workspace.
- Queue health and ownership are visible and actionable.

### Phase 3: Script and Template System

Goals:

- Introduce versioned scripts.
- Make templates the starting point for new scripts.
- Add deterministic node graphs and governed routing.

Exit criteria:

- Scripts are created from templates.
- Draft, validate, preview, test, and deploy states are enforced.
- Production is immutable except through versioned releases.

### Phase 4: Governance and AI Boundaries

Goals:

- Add AI governance and human approval controls.
- Define confidence thresholds, fallback behavior, and prohibited actions.
- Make escalations and overrides explicit.

Exit criteria:

- AI can only participate inside approved nodes and bounded context.
- Human oversight remains available and auditable.

### Phase 5: Monitoring and Reporting

Goals:

- Add operational metrics and historical analysis.
- Surface queue, script, AI, and outcome performance.
- Support informed optimization without changing runtime behavior.

Exit criteria:

- Operators can see health, trends, and outcomes from the same platform.

### Phase 6: Extensibility

Goals:

- Support marketplace packs, creator-specific overrides, and richer analytics.
- Prepare for mobile, moderation teams, campaign workflows, and broader platform integration.

Exit criteria:

- New capabilities can be added without re-architecting core conversation, queue, and script models.

## 23. Future Extensibility

This architecture should naturally support:

- Creator mobile app
- Moderation teams
- Approval workflows
- Campaign messaging
- Coaching
- Analytics
- Additional content platforms
- Hermes agent collaboration
- Autonomous optimization

The design should keep these as additive capabilities, not as reasons to change the core conversation engine or queue model.

## 24. Summary of Non-Negotiable Constraints

- Queues remain the operational center.
- Conversations remain the primary working surface.
- Scripts are deterministic and versioned.
- Templates precede customization.
- AI is governed, bounded, and optional inside specific nodes.
- Production behavior must remain auditable and reversible.
- No direct editing of live production script behavior.
