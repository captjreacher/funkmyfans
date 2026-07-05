# CIP-3 — Accepted Proposal to Builder Draft

Status: implemented

## Intent

Bridge an accepted `CreatorPlaybookProposal` into an inactive `OfMessageScript` builder draft. Accepting a proposal signals operator intent to work on it; this conversion creates the editable artifact without activating automation, generating messages, or creating runtime runs.

## Design Rules

- **Only accepted proposals convert.** Draft and dismissed proposals are rejected with 422.
- **Idempotent.** One proposal maps to at most one draft. Re-running returns the existing draft.
- **Always inactive.** Drafts are created with `status: "inactive"`, `action_mode: "draft_for_approval"`, `auto_send_enabled: false`, `requires_approval: true`. No path through this bridge creates an active script.
- **No side effects.** No automation rules, runs, conversation instances, outbound messages, or queue items are created. The only persistence is the `of_message_scripts` row.
- **Preserves source.** Every draft carries `builder_config` fields linking back to the proposal (`source_proposal_id`), the intelligence snapshot (`intelligence_snapshot_id`), and the opportunity projection (`opportunity_projection_id`). `cip_version` is `"cip-3"` and `created_from_proposal_at` records the conversion timestamp.

## Schema Changes

### `ScriptBuilderConfig` (in `packages/of-types/src/index.ts`)

| Field | Type | Purpose |
|---|---|---|
| `source_proposal_id` | `string?` | Backlink to `creator_playbook_proposals.id` |
| `intelligence_snapshot_id` | `string?` | Backlink to `creator_intelligence_snapshots.id` |
| `opportunity_projection_id` | `string?` | Backlink to `creator_intelligence_opportunity_projections.id` |
| `cip_version` | `string?` | CIP identifier (`"cip-3"`) |
| `created_from_proposal_at` | `string?` | ISO timestamp of conversion |

All fields are optional (`?`) — existing scripts without proposal lineage are unaffected.

## API Route

**`POST|GET /api/playbook-proposals/:id/builder-draft`**

- `GET`: Returns the existing draft if one exists (200), or 404 if no draft has been created.
- `POST`: Creates the draft if one does not exist (201), returns existing if already created (200).
- Guards: Proposal must exist (404) and be in `"accepted"` state (422 otherwise).
- Response: `{ script: OfMessageScript }`

## UI

When a proposal is in `"accepted"` state, a "Create Builder Draft" button with a Zap icon appears next to the Accept/Dismiss buttons in the `ProposalReviewCard` component. Clicking it:

1. Calls `POST /api/playbook-proposals/:id/builder-draft`
2. Refreshes the scripts list
3. Switches the detail view to the "Playbooks" tab where the new draft is visible

## Smoke Coverage

`scripts/cip-3-smoke.ts` → `npm run smoke:cip-3`

Cases:
1. Accept proposal → create draft → draft is inactive
2. Re-run → same draft returned (idempotent)
3. Draft has source metadata in `builder_config`
4. `auto_send_enabled` is false
5. `action_mode` is not auto_send
6. Non-accepted proposal is rejected with 422
7. GET returns same draft as POST
8. No other scripts were unexpectedly created

## Intentionally Out of Scope

- Activating the draft as a production script (future CIP)
- Mapping proposal steps/forks/endpoints to builder steps (future CIP)
- Archetype-guided message generation (future CIP)
- Any automation rule or run creation
