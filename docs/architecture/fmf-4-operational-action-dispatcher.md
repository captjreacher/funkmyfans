# FMF-4: Operational Action Dispatcher

## From declaration to execution

FMF-3 records **declarative** orchestration actions on `creator_readiness_events` and stops. FMF-4 closes the loop: it consumes those actions, invokes **existing** FMF services, and records the results in an append-only execution ledger.

The dispatcher is a **coordinator + audit layer**, not a new engine. It never creates automation logic, never re-implements journey execution, never duplicates playbook behavior.

## Ownership (unchanged)

FYV owns creator assessment, intelligence, authentication, and access lifecycle. FMF owns creator operations, readiness, opportunities, journeys, playbooks, and automation execution. FMF-4 sits inside FMF and calls existing FMF services (`of_tasks`, `of_automation_rules`) — no boundary changes.

## The pipeline

```
Creator state change
  → Readiness Orchestrator (FMF-3)
      → creator_readiness_events (one row per transition, with .actions[])
        → FMF-4 Action Dispatcher
            → creator_action_executions (append-only ledger)
              → Existing FMF services (of_tasks, of_automation_rules)
```

## Action → event mapping (FMF-3 change)

Prior to FMF-4, FMF-3 attached the same `actions[]` array to every event in a milestone-crossing sequence (readiness_changed + N reached), causing dispatch multiplication. FMF-4 required this to be tightened: **each action attaches to exactly the event that triggered it**.

| Action | Attached to |
| --- | --- |
| `queue_default_journey_activation` | `creator_reached_operational` |
| `enable_operational_automations` | `creator_reached_production` |
| `pause_creator_automations` | `creator_regressed` |

`creator_readiness_changed`, `creator_blocked`, and `creator_unblocked` carry no actions (observability lives in the events themselves).

## Data model

New append-only table `public.creator_action_executions` (migration `20260713020000`):

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `creator_id` | uuid | FK → `of_creators(id)` cascade |
| `readiness_event_id` | uuid | FK → `creator_readiness_events(id)` cascade |
| `action_type` | text | CHECK-constrained to the 4 supported types |
| `status` | text | `pending | processing | completed | failed`, default `pending` |
| `queued_at` / `started_at` / `completed_at` | timestamptz | Lifecycle timestamps |
| `error` | text | Populated on `failed` |
| `result` | jsonb | Handler-specific outcome (`queued_task_id`, `activated_rule_count`, etc.) |
| `trigger_event` / `milestone` / `reason` | text | Lineage from the parent readiness event |
| `created_at` / `updated_at` | timestamptz | Auto-touched via existing `set_updated_at()` |

**Idempotency:** `UNIQUE(readiness_event_id, action_type)`. One execution per (event, action). Replays 23505 → deduped.

## Handlers

Handlers invoke **existing services**. They never create new engines.

### `JourneyActivationHandler`

Fired on: `creator_reached_operational` → action `queue_default_journey_activation`.

Behaviour: creates an `of_tasks` row with `task_type = 'journey_activation_request'`, `status='open'`, `source='rules_engine'`, `priority='medium'`. A pre-check looks for an already-open task for the same creator+task_type to avoid stacking duplicates on replay. Records `queued_task_id` in the execution result.

**QUEUES for operator review** — does not flip a journey live. Human review preserved.

### `AutomationEnableHandler`

Fired on: `creator_reached_production` → action `enable_operational_automations`.

Behaviour: `UPDATE of_automation_rules SET status='active' WHERE creator_id=X AND status IN ('draft','paused')`. Records `activated_rule_count` + `activated_rule_ids` in the result. Never creates rule definitions.

### `AutomationPauseHandler`

Fired on: `creator_regressed` → action `pause_creator_automations`.

Behaviour: `UPDATE of_automation_rules SET status='paused' WHERE creator_id=X AND status='active'`. Records `paused_rule_count` + `paused_rule_ids`. Never deletes rules.

All three handlers degrade cleanly when the target table is absent (dev DB) — returning `{ no_op: true, reason: "<table> table absent" }` rather than failing.

## Event consumption

Dispatch integrates into the **tail of FMF-3's `reconcileCreatorReadiness`**: for each newly-persisted event, walk its `actions[]` and dispatch each. This keeps ordering deterministic (per-creator, per-reconcile), reuses the existing trigger-point wiring (BF sync completion, intelligence import, FYV webhook, invite action), and avoids the need for a separate poller or event bus.

- **Replay-safe:** unique constraint on `(readiness_event_id, action_type)`.
- **Ordered per creator:** synchronous dispatch order matches insertion order.
- **Failure retryable:** failed rows keep the error message + partial result; a manual replay (drop + re-dispatch, or a future admin endpoint) can re-attempt without losing history.
- **Fire-and-forget from parent:** dispatch happens inside `reconcileCreatorReadiness`, which is already wrapped in try/catch by callers.

## API

```
GET /api/creators/:id/actions/history
```

Read-only. Newest first, up to 50 executions. Missing-relation degradation to `{ ok: true, executions: [] }` when the table isn't deployed yet.

## UI

The existing FMF-2/3 `CreatorReadinessCard` gains an **Operational actions** section immediately below "Recent readiness activity". Each execution rendered on one line: status glyph (`✓` / `✗` / `…` / `•`), human action label, completed-at timestamp; failed rows include the error. No new tab, no new page.

## MoonSiren replay

Deterministic replay in `fmf-4-dispatcher-check.ts` (**45/45 PASS**) walks: BF connected → intelligence imported → FYV accepted → opportunities generated → journeys running. Assertions cover:

- Reaching **operational** → `queue_default_journey_activation` fires exactly once → an `of_tasks` row created → execution completes.
- Reaching **production** → `enable_operational_automations` fires exactly once → the creator's draft/paused rule flipped to `active` → execution completes.
- **Idempotency:** replaying the same event set produces zero new executions and no double-flips.
- **Distinct events, same action:** two different readiness events with the same action type produce two independent executions.
- **Multiple actions on one event:** dispatcher walks the action array and fires each exactly once.
- **Failure + retry:** first attempt marks the exec `failed` with `error` populated; a retry (after clearing the row) succeeds.
- **Regression:** `creator_regressed` → `pause_creator_automations` fires → both active rules flip to `paused`.

Plus **FMF-3 (69/69)**, **FMF-2 (48/48)**, **FMF-1 (49/49)**, **FYV-1 (91/91)**, **compose2..7 all** re-run with no regression.

## Non-goals (explicit)

- No new automation engine.
- No new journey engine.
- No modification of FYV.
- No move of intelligence logic into FMF.
- No bypass of existing service boundaries.
- No write endpoints on the dispatcher surface (`/actions/history` is read-only).
- No creator-facing UI.

## Success criteria met

- **Readiness transitions produce real operational outcomes**: reaching operational queues a journey activation task; reaching production activates the creator's automation rules; regressing pauses them.
- **A creator moving `discovered → operational → production` causes existing FMF systems to activate without manual intervention** (activation still gates behind operator review of the queued task, preserving the safety valve).
- **FMF becomes a true creator operating system** — the readiness event backbone (FMF-3) now dispatches concrete actions through existing services, while FYV remains the intelligence layer.

## Follow-ups (not this sprint)

- Async worker for retries + backoff (MVP relies on manual replay).
- Admin endpoint `POST /api/creators/:id/actions/:executionId/retry` for one-click retry.
- Additional action types as new milestones or transitions are added.
