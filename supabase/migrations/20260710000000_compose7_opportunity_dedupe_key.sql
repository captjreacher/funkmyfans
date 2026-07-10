-- COMPOSE-7: Production Activation Hardening — concurrency-safe idempotency for
-- standalone (COMPOSE-5/6) conversation opportunities.
--
-- Gives the DATABASE authority over duplicate prevention for standalone opportunities,
-- replacing reliance on application-level select-then-write. Additive + reversible;
-- NO destructive data rewrite; legacy queue-coupled opportunities are untouched.
--
-- Uniqueness grain: the deterministic COMPOSE-5 dedupe key
--   compose5:<conversation_instance_id>:<capability>:<outcome_type>:<category>:<route_key>
-- which is exactly one logical standalone opportunity. Distinct opportunities in the
-- same conversation differ in capability/outcome/category/route and therefore get
-- distinct keys, so they are NOT collapsed.
--
-- Scoping: a PLAIN unique index over `dedupe_key` relies on SQL NULL-distinctness —
-- rows without a dedupe_key (all legacy Queue-coupled rows, whose writer never sets it)
-- hold NULL and are therefore UNCONSTRAINED. Uniqueness applies only to standalone
-- COMPOSE rows (non-null dedupe_key). This also keeps the index compatible with
-- PostgREST/ON CONFLICT upserts (a partial-predicate index would not be).
--
-- 1. First-class deterministic dedupe column (nullable; only standalone rows set it).
alter table public.of_conversation_opportunities
  add column if not exists dedupe_key text;

-- 2. Backfill ONLY where safely derivable: rows that already carry the COMPOSE-5
--    dedupe key in metadata (i.e. standalone opportunities). Legacy rows stay NULL.
--    Idempotent: only fills rows whose column is still NULL.
update public.of_conversation_opportunities
   set dedupe_key = metadata->'compose5'->>'dedupe_key'
 where dedupe_key is null
   and metadata->'compose5'->>'dedupe_key' is not null;

-- 3. Unique index. NULLs are distinct (default), so legacy null-keyed rows are
--    unconstrained; non-null standalone keys are unique → concurrent identical
--    writes converge to a single row via ON CONFLICT.
--    NOTE: if this fails with a duplicate-key error, pre-existing duplicate standalone
--    rows exist (should be none — standalone persistence has not been enabled in
--    production). Resolve per the runbook's pre-flight query before applying.
create unique index if not exists uq_of_conversation_opportunities_dedupe_key
  on public.of_conversation_opportunities (dedupe_key);

-- Rollback (configuration-safe, non-destructive; run manually to revert):
--   drop index if exists public.uq_of_conversation_opportunities_dedupe_key;
--   alter table public.of_conversation_opportunities drop column if exists dedupe_key;
-- Dropping the column discards only the derived dedupe key; opportunity rows,
-- their metadata.compose5.dedupe_key lineage, and Queue linkage are preserved.
