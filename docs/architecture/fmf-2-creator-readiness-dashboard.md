# FMF-2: Creator Readiness Dashboard

## One question, one card

> **Is this creator operationally ready?**

FMF-2 aggregates existing system state into a single dashboard card on `CreatorDetail`. It is **not** a wizard, **not** a profile duplicate, and **not** a new state store. It answers one question with an operational checklist and the next concrete action.

Stacked on FMF-1 (which owns `fmf_creator_fyv_relationships`).

## Ownership boundary (unchanged)

FYV owns creator assessment, intelligence generation, reports, persona portfolio, authentication, and access lifecycle. FMF owns operations, onboarding workflow, BetterFans integration, opportunities, journeys, playbooks, automation. FMF-2 **reads** — never writes — data from both sides through the existing FMF-controlled surface.

## Data sources (all existing)

| Section | Source repositories |
| --- | --- |
| BetterFans | `of_creators` (`betterfans_account_id`, `last_sync_at`) + `of_sync_runs` (latest successful) |
| FYV Intelligence | `creator_intelligence_snapshots` (latest) |
| FYV Access | `fmf_creator_fyv_relationships` (FMF-1) |
| Opportunities | `creator_intelligence_opportunity_projections` |
| Journeys | `of_message_scripts` (count + active) + `of_revenue_journeys` (active) + `of_automation_rules` (active) |

FMF-2 introduces **no new tables**, **no new columns**, and **no writes**. When the FMF-1 relationship row does not exist yet, the section renders as `Pending` with score 0.

## Scoring (deterministic, unit-testable)

Each section is worth `READINESS_SECTION_WEIGHT = 20`. Per-section scoring:

| Section | State | Score |
| --- | --- | --- |
| BetterFans | Not Connected / Sync Required / Connected | 0 / 10 / 20 |
| FYV Intelligence | Not Started / Out of Date / Imported | 0 / 10 / 20 |
| FYV Access | Pending / Invited / Accepted / Active | 0 / 8 / 14 / 20 |
| Opportunities | Not Generated / Generated | 0 / 20 |
| Journeys | None / Configured / Running | 0 / 12 / 20 |

Overall = sum, clamped to `[0,100]`. Badges:
- `100` → **Production Ready**
- `80–99` → **Operational**
- `40–79` → **In Progress**
- `<40` → **Not Ready**

The FMF-2 spec's MoonSiren worked example resolves exactly under this scheme: BetterFans Connected (20) + Intelligence Imported (20) + FYV Access Invited (8) + Opportunities Generated (20) + Journeys None (0) = **68% / In Progress**.

## Next-action hint

The summary carries a `nextAction` string identifying the next operational step (or `null` when fully ready). Priority order mirrors the operational path: BetterFans → Intelligence → FYV Access → Opportunities → Journeys. Examples:
- No BetterFans → `Connect the creator's BetterFans account`
- BetterFans account, no sync → `Run a BetterFans sync to complete the connection`
- No intelligence → `Import the FYV intelligence package`
- Invited waiting → `Awaiting creator acceptance in FYV (Resend Invite is available)`
- Everything but journeys → `Create a playbook or journey for this creator`

## API

```
GET /api/creators/:id/readiness
```

Response shape:

```jsonc
{
  "ok": true,
  "readiness": {
    "readinessScore": 68,
    "readinessStatus": "In Progress",
    "nextAction": "Awaiting creator acceptance in FYV (Resend Invite is available)",
    "betterfans":   { "status": "Connected",       "score": 20, "betterfans_account_id": "...", "last_sync_at": "...", "profile_synced": true },
    "intelligence": { "status": "Imported",        "score": 20, "latest_snapshot_id": "...",    "source_package_reference": "...", "imported_at": "...", "superseded_at": null },
    "fyvAccess":    { "status": "Invited",         "score": 8,  "fyv_creator_id": "...",        "relationship_state": "invited", "invited_at": "...", "accepted_at": null, "activated_at": null, "can_resend_invite": true },
    "opportunities":{ "status": "Generated",       "score": 20, "count": 3, "highest_confidence": 92, "highest_priority": 1 },
    "journeys":     { "status": "None",            "score": 0,  "playbook_count": 0, "journey_count": 0, "active_automation_count": 0 }
  }
}
```

`400` when the id isn't a UUID; `404` when the creator doesn't exist; `500` only on unexpected DB errors. Missing-relation degradation: if the automation/journey count queries fail on a lean dev DB, counts fall to `0` rather than 500-ing.

## UI

`CreatorDetail` Profile tab gains a **Creator readiness** card at the top: overall score + badge on the right, next-action hint below, then a 5-cell grid (BetterFans / FYV Intelligence / FYV Access / Opportunities / Journeys) each showing status pill, sub-score `/ 20`, and the operational rows the spec enumerates. **No new tab. No new page. No wizard.** Reuses `SectionTitle` and existing badge styles.

## Reuse — no duplication

- **Invite** — the readiness card is read-only. The **Invite / Resend Invite** action stays on the FMF-1 `FyvRelationshipCard` (same page). `fyvAccess.can_resend_invite` in the readiness payload lets consumers hint at the FMF-1 action but never fires an invite from FMF-2.
- **Intelligence import** — read-only. Import still lives on FYV-1's Intelligence tab.
- **BetterFans sync** — read-only. Sync still lives on the existing sync buttons.

## Validation

- `apps/creator-cockpit/scripts/fmf-2-readiness-check.ts` — **48/48 PASS** (Node type-strip, pure). Covers: 0% empty, 100% fully-loaded, MoonSiren 68% exact, per-state FYV Access scoring (0/8/14/20), Intelligence Out of Date, BetterFans Sync Required, Journeys Configured, badge thresholds (40, 80), highest-priority MIN semantics, `nextAction` routing.
- `fmf-relationship-controller-check`: **49/49 PASS** (FMF-1 no regression).
- `fyv-onboarding-check`: **91/91 PASS** (FYV-1 no regression).
- `compose2..7`: **ALL PASS**.
- `node --check` on all changed TS files: clean.
- Local `npm ci` / typecheck / build blocked in sandbox (registry egress 403) → CI verify job is authoritative.

## MoonSiren

- FMF creator id `20fdee3c-6998-4e8a-8611-04ab88949301` (live `funk-my-brand`).
- Current live state (per earlier audit): status `connected`, onboarding_status `ready`, active `true`, `metadata` has services, **no `fyv_package` pointer yet, no intelligence snapshot, no FMF-1 relationship row**. Under FMF-2 that would score `20 (BetterFans) + 0 (intel) + 0 (access) + 0 (opps) + 0 (journeys) = 20%` → Not Ready, with `nextAction: "Import the FYV intelligence package"`. The 68% scenario in the spec assumes those pieces have been added, which the deterministic check covers explicitly.

## Non-goals (explicit)

- No move of FYV logic into FMF.
- No new relationship or state tables.
- No creator-facing UI.
- No wizard / additional onboarding step.
- No changes to FYV-1 intelligence flow, FMF-1 invite flow, or COMPOSE/journey runtime.

## Success criteria met

An agency user opening the creator in FMF sees, in one glance:
- **whether the creator is operationally ready** (score + badge)
- **what is missing** (per-section status + subscore)
- **what the next action is** (`nextAction` hint)

without opening FYV or understanding the underlying system boundaries.
