# COMPOSE-7 — Production Activation Hardening

Status: proposed (additive, draft PR based on `main`). **No production activation is performed by this sprint.**
Base: `main` @ `eec6629` (COMPOSE-1–6 merged, incl. #39 COMPOSE-6).

## Objective

Make the COMPOSE-6 live opportunity persistence path safe to enable gradually in production: concurrency-safe deduplication, conservative activation controls (off/shadow/enabled + creator allowlist), operational observability, deployment verification, and rollback safety. Activation hardening, **not** feature expansion.

```
live conversation runtime → deterministic opportunity signal
  → concurrency-safe persisted opportunity (DB unique index)
  → no duplicate rows → no Queue item → controlled production activation
```

## 1. Current persistence grain (evidence)

`of_conversation_opportunities` (migrations `20260703000000` + `20260706042239`). COMPOSE-5 dedupe key: `compose5:<conversation_instance_id>:<capability>:<outcome_type>:<category>:<route_key>`, stored at `metadata.compose5.dedupe_key`; grain `(conversation_instance_id, route_key, status="detected")` via application select-then-write. Standalone rows: `status="detected"`, `queue_id`/`queue_item_id` null. Legacy queue-coupled rows: `status="queued"`, `queue_handoff=true`, no `compose5` metadata. Multiple **distinct** opportunities can legitimately share a conversation (e.g. a revenue offer and an operations handoff) — they differ in capability/outcome/category/route, so their dedupe keys differ. Standalone persistence has **not** been enabled in production (COMPOSE-6 default OFF; COMPOSE-5 only via the guarded test endpoint), so no historical standalone rows are expected to conflict with the new rule.

## 2. Concurrency-safe database idempotency (migration)

`supabase/migrations/20260710000000_compose7_opportunity_dedupe_key.sql` (additive, reversible, no destructive rewrite):

1. `alter table ... add column if not exists dedupe_key text;`
2. Backfill only standalone rows: `update ... set dedupe_key = metadata->'compose5'->>'dedupe_key' where dedupe_key is null and metadata->'compose5'->>'dedupe_key' is not null;`
3. `create unique index if not exists uq_of_conversation_opportunities_dedupe_key on ... (dedupe_key);`

**Uniqueness grain** = the deterministic COMPOSE-5 dedupe key = exactly one logical standalone opportunity. **Scoping via NULL-distinctness**: a plain unique index treats NULLs as distinct, so every legacy queue-coupled row (which never sets `dedupe_key` → NULL) is **unconstrained**; only standalone COMPOSE rows (non-null key) are unique. This is why global uniqueness is safe here and why a partial predicate is unnecessary (and a plain index stays compatible with ON CONFLICT upserts, which a partial-predicate index would not). Rollback (configuration-safe): `drop index uq_of_conversation_opportunities_dedupe_key; alter table ... drop column dedupe_key;` — preserves all rows, metadata lineage, and Queue linkage.

**Why distinct opportunities are not collapsed**: the key includes capability + outcome_type + category + route_key; two different opportunities in one conversation yield different keys → separate rows (proven by check case B).

## 3. COMPOSE-5 store update

`buildStandaloneOpportunityPayload` now emits a first-class `dedupe_key` column (alongside the preserved `metadata.compose5.dedupe_key` lineage). The `StandaloneOpportunityStore` port gains an optional, authoritative `upsertByDedupeKey`. The pure orchestrator `persistStandaloneOpportunity` prefers it when present; the legacy select-then-write remains only for in-memory/test stores (no concurrency there). The Supabase store's `upsertByDedupeKey` does **insert → on 23505 conflict → update by `dedupe_key`**, returning `deduped`. This is DB-authoritative (the unique index prevents duplicate rows; the conflict loser updates), evidence-preserving, status stays `detected`, queue fields stay null, no second adapter, no Queue call.

## 4. Activation safeguards

`COMPOSE6_LIVE_OPPORTUNITY_PERSISTENCE_MODE`: `off` (default) | `shadow` | `enabled`.
- `off`: no mapping or persistence side effect beyond existing runtime (the canonical-derivation seam is also gated off).
- `shadow`: derive canonical signal + outcome + opportunity mapping, record observability, **never write**.
- `enabled`: full path, persist.

**Precedence** (`resolveLiveOpportunityMode`): a valid MODE wins; if MODE is unset/empty, the legacy boolean `COMPOSE6_LIVE_OPPORTUNITY_PERSISTENCE_ENABLED` is honoured (`true`/`1` → `enabled`, else `off`); any unknown/malformed MODE **fails closed to `off`**.

`COMPOSE6_LIVE_OPPORTUNITY_CREATOR_ALLOWLIST`: comma/whitespace-separated **stable creator ids**. Unset → all creators (MODE still gates). Present-but-empty (only separators) → **malformed → fail closed** (nobody). Otherwise only listed ids are allowed. The single gating decision is `decideLiveOpportunityAction(mode, allowlist)` → `skip_off | skip_not_allowed | shadow | persist` (used by the worker, proven by the check).

## 5. Observability

Concise `of_conversation_history` entries (existing convention; stable IDs only; no raw message body): `opportunity_skipped` (reason `not_allowlisted`/`malformed_allowlist`), `opportunity_shadow_evaluated` (reason `shadow_would_persist`/`shadow_signal_rejected`), `opportunity_persisted`, `opportunity_deduplicated`, `opportunity_signal_rejected`, `opportunity_persist_failed`. Every payload carries `mode`, a deterministic `reason_code`, and `queue_item_created:false`. Failures are classified `db_conflict` | `validation` | `unexpected` (`classifyLiveOpportunityFailure`). The canonical-derivation seam adds `canonical_interpretation_signal` to `variable_set` (only when mode ≠ off).

## 6. Failure & rollback behaviour

- Persistence failure never blocks conversation execution: the whole seam is `try/catch`; errors are swallowed + recorded (`opportunity_persist_failed`).
- Configuration fails closed: unknown mode → `off`; malformed allowlist → nobody allowed.
- DB conflict returns a successful **dedupe** result (insert→conflict→update), not an error.
- Migration rollback is configuration-safe (drop index + column) and non-destructive: opportunity rows, metadata lineage, and Queue linkage are preserved.
- Disabling (MODE `off`) immediately stops new standalone persistence; existing rows are untouched. **No automated deletion/cleanup of already-created opportunities.**

## 7. Production activation runbook

1. **Deploy migration.** Pre-flight duplicate check (expect 0):
   ```sql
   select dedupe_key, count(*) from public.of_conversation_opportunities
   where dedupe_key is not null group by dedupe_key having count(*) > 1;
   ```
   Then apply `20260710000000_compose7_opportunity_dedupe_key.sql`. Verify:
   ```sql
   select indexname from pg_indexes where tablename = 'of_conversation_opportunities'
     and indexname = 'uq_of_conversation_opportunities_dedupe_key';
   ```
2. **Deploy Worker with mode `off`** (`COMPOSE6_LIVE_OPPORTUNITY_PERSISTENCE_MODE=off`, no allowlist).
3. **Verify health** (worker responds; conversations process normally; zero `opportunity_*` history rows).
4. **Enable `shadow` for one creator**: `MODE=shadow`, `COMPOSE6_LIVE_OPPORTUNITY_CREATOR_ALLOWLIST=<creator_id>`.
5. **Verify derived outcomes + zero writes**:
   ```sql
   select event_type, count(*) from public.of_conversation_history
   where event_type like 'opportunity_%' group by event_type;  -- expect only opportunity_shadow_evaluated
   select count(*) from public.of_conversation_opportunities where dedupe_key is not null;  -- expect unchanged
   ```
6. **Enable `enabled` for one creator**: `MODE=enabled`, allowlist = that creator.
7. **Verify one expected opportunity**:
   ```sql
   select id, status, category, route_key, queue_id, queue_item_id, dedupe_key
   from public.of_conversation_opportunities where creator_id = '<creator_id>' and dedupe_key is not null
   order by created_at desc limit 5;
   ```
8. **Replay the same event → verify no duplicate** (row count for that `dedupe_key` stays 1; a `opportunity_deduplicated` history row appears).
9. **Verify `queue_id` and `queue_item_id` remain null** for all standalone rows:
   ```sql
   select count(*) from public.of_conversation_opportunities
   where dedupe_key is not null and (queue_id is not null or queue_item_id is not null);  -- expect 0
   ```
10. **Expand the allowlist gradually** (add creator ids), re-verifying at each step.
11. **Rollback = configuration only**: set `MODE=off` (stops new writes immediately; existing rows untouched). Full revert (optional): drop the index + column per §2.

Do not switch production configuration as part of this sprint unless explicitly authorised.

## 8. Reference verification cases (deterministic check, 35/35 PASS)

A concurrent duplicate → one row (1 insert + 1 dedupe), both succeed, no error. B distinct opportunities (revenue + operations) → two rows. C shadow → derives, zero writes. D disabled/non-allowlisted → skip, no write. E enabled + allowlisted → one detected row, replay dedupes, no queue. F unknown mode / malformed allowlist → fail closed, zero writes.

## 9. Queue boundary

The upsert method and the live seam touch only `of_conversation_opportunities`; they never call `ensureConversationHandoffQueueItem`/`ensureCreatorConversationQueue`/`ensureConversationOpportunity`, never set `queue_id`/`queue_item_id` (both stay null), never change Queue lifecycle, and never enable the legacy handoff gate (unchanged). Source-verified: zero queue references in the new code. Queue promotion remains future work.

## 10. Validation

`compose7` check **35/35 PASS** (Node 24 type-strip): mode/allowlist fail-closed, single gating decision, first-class `dedupe_key` grain, enabled-persists, concurrent-duplicate→one-row (modelled by an upsert store that mirrors the unique index), distinct-not-collapsed, shadow-zero-writes, failure surfaces catchably, no queue linkage. `compose2–6` re-run **ALL PASS**. Both source files `node --check` OK.

**Concurrency is NOT claimed proven by the in-memory store alone.** DB concurrency is enforced by the migration's unique index + insert-on-conflict upsert; the in-memory store models the contract. Exact runtime/SQL procedure (run in CI or a local Supabase):
```sql
-- After enabling one creator, fire the same terminal event twice ~simultaneously, then:
select dedupe_key, count(*) from public.of_conversation_opportunities
where dedupe_key is not null group by dedupe_key having count(*) > 1;  -- expect 0 rows
```
**Blocked locally**: `npm ci`/`tsc`/`vite build` and a local Supabase both unavailable — `registry.npmjs.org` HTTP 403, `node_modules` absent, no local Postgres (same infra constraint as prior sprints). CI **verify** (`npm ci → typecheck → build`) is authoritative; DB concurrency verified via the SQL above in an environment with Supabase.

## 11. Out of scope (not absorbed)

Queue promotion/creation, human approval UI, Opportunity UI redesign, AI/LLM, new scoring, new channels, Instagram OAuth/polling/webhook, automated messaging, Journey/Node Flow/Hermes redesign, fuzzy identity, billing, onboarding, broad schema redesign, **production flag enablement**.

## 12. Architectural invariants (preserved)

Producers unchanged; canonical mapping deterministic; outcomes separate from execution; signals separate from persistence; persisted opportunities separate from Queue; **database uniqueness owns concurrency protection**; distinct opportunities not collapsed; configuration fails closed; shadow never writes; evidence lineage intact; persistence failure non-blocking; rollback configuration-only; COMPOSE-3 Channel/Identity unchanged; no production activation without approval.

## 13. Decision gate

**YES** — with the DB unique index owning concurrency, fail-closed off/shadow/enabled modes, a stable creator allowlist, preserved evidence lineage, and no Queue creation, the COMPOSE-6 live path is safe to activate **gradually** in production per the runbook. Production was **not** enabled. Stop after COMPOSE-7.
