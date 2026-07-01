# COP-1 Sprint Note

## COP-1 Closure

COP-1 is formally closed.

Closure status:

- Completed and accepted
- No remaining COP-1 blockers
- No further COP-1 scope changes

Handoff:

- Next sprint: COP-1S Stabilisation
- COP-2 stays deferred until COP-1S is complete

## COP-1 Completion Snapshot

Completed issues: `#9`, `#10`, `#11`, `#12`, `#13`, `#14`, `#15`, `#16`

Verification summary:

- `npm run typecheck`: pass
- `npm run build`: pass
- Local worker restart and runtime probes: pass
- `/api/dashboard`: pass
- `/api/queue-workspace`: pass
- `/api/operations/dashboard`: pass
- Conversation detail/drill-down probe: pass
- COP-1 smoke suite: pass

Remaining blockers: none

Production-ready: yes

## COP-1S Stabilisation Guidance

This note captures implementation guidance that lives outside the frozen architecture ADR so the ADR can remain architecture-only.

Scope for COP-1S:

- Make Queue the canonical operational model.
- Make Conversation Workspace a first-class workspace.
- Preserve current behaviour while the foundation is stabilised.
- Remove task-centric assumptions from APIs and read models.
- Reduce compatibility adapters only where callers can safely migrate.

Compatibility adapters currently retained:

- `/api/queue-workspace` as the canonical queue workspace read endpoint
- `/api/operations/dashboard` as a transitional compatibility adapter for legacy callers
- Legacy dashboard-shaped client calls in the Creator Cockpit API surface
- Local-schema tolerance fallbacks for missing read-model columns or tables that preserve existing response shapes

Retained compatibility fallbacks:

- Derived `priority_score` for local task sorting when the column is absent in the local schema
- Local-schema tolerant conversation drill-down fallback for absent conversation tables or linked read-model tables
- Local-schema tolerant script and automation workspace fallback rows used only to keep smoke and read paths contract-shaped in the local environment

Known follow-ups for COP-1S:

- Retire transitional compatibility adapters once callers are migrated.
- Remove temporary read-model bridging that is no longer needed.
- Tighten queue workspace and conversation workspace boundaries before COP-2 begins.

Architecture freeze status:

- The Architecture Freeze ADR remains unchanged.

Non-goals for this slice:

- No new product concepts.
- No Playbook Studio expansion.
- No AI runtime integration work.
- No broader monitoring or audit work.
