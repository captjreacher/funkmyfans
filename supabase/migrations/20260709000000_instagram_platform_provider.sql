-- COMPOSE-3: represent Instagram as a platform provider.
--
-- Minimal, additive, reversible extension of the EXISTING creator/provider
-- model. It only widens the of_creators.platform_provider CHECK constraint to
-- permit 'instagram'; it adds no columns, no tables, and does not touch creator
-- identity ownership. Justified by repository evidence: of_creators already
-- carries platform_provider (default 'betterfans') gated by a CHECK constraint
-- that currently rejects 'instagram', and the of_creators_betterfans_required
-- constraint already permits non-BetterFans providers to omit
-- betterfans_account_id, so Instagram creators need nothing further.

alter table public.of_creators
  drop constraint if exists of_creators_platform_provider_check;

alter table public.of_creators
  add constraint of_creators_platform_provider_check
  check (platform_provider in ('betterfans', 'onlyfans', 'fansly', 'other', 'instagram'));
