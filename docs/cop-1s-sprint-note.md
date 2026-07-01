# COP-1S Sprint Note

## Purpose

COP-1S is a stabilization sprint between the COP-1 foundation and COP-2 feature delivery.

It exists to align implementation with the frozen architecture before introducing Conversation Interpretation, Conversation Opportunities, and Playbooks.

No new features are in scope.

## Objectives

There are exactly two objectives for COP-1S.

### Objective 1 - Queue becomes canonical

Current state:

- `of_tasks` drives the Queue Workspace

Target state:

- `of_queue_items` drives the Queue Workspace
- `of_tasks` remains only as a compatibility source for legacy callers

Rules:

- `of_queue_items` becomes the operational source of truth.
- `of_tasks` becomes a compatibility source only.
- Remove task-centric assumptions from APIs.
- Keep adapters until they are no longer needed.

### Objective 2 - Conversation Workspace becomes a real workspace

Current state:

- Queue Workspace contains a Conversation Inspector side panel

Target state:

- Queue Workspace selects a Conversation Workspace.
- Conversation Workspace is its own operational surface.
- Subscriber, history, events, and actions live within the Conversation Workspace contract.

Rules:

- The Conversation Workspace must not be a side panel or inspector.
- Queue selection should lead into the Conversation Workspace, not embed it.
- Conversation detail should be a first-class workspace API and view model.

## Definition Of Done

COP-1S is complete when all of the following are true:

- Queue Workspace reads from `of_queue_items`.
- `of_tasks` is no longer the primary operational model.
- Conversation Workspace has its own API contract and view model.
- Queue selects a Conversation Workspace; it does not contain it.
- Compatibility adapters are documented and reduced.
- Existing behaviour still works.
- Architecture invariants remain satisfied.

## Non-Goals

- No Conversation Interpretation features.
- No Conversation Opportunities features.
- No Playbooks features.
- No Templates features.
- No cosmetic refactoring.
- No architecture changes.

## Completion Note

COP-2 begins only after COP-1S closes.
